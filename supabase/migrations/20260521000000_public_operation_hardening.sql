begin;

alter table public.app_state
add column if not exists reach_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_state_reach_count_nonnegative'
      and conrelid = 'public.app_state'::regclass
  ) then
    alter table public.app_state
    add constraint app_state_reach_count_nonnegative check (reach_count >= 0);
  end if;
end
$$;

update public.app_state
set reach_count = greatest(
  reach_count,
  coalesce((
    select reach_num
    from public.reach_logs
    order by created_at desc, id desc
    limit 1
  ), 0)
)
where id = 1;

create table if not exists public.public_action_limits (
  action text not null check (action in ('reaction_stamp')),
  client_hash text not null check (char_length(client_hash) between 32 and 128),
  last_sent_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (action, client_hash)
);

create table if not exists public.reach_submissions (
  client_hash text primary key check (char_length(client_hash) between 32 and 128),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists public_action_limits_updated_at_idx
on public.public_action_limits (updated_at desc);

create index if not exists reach_submissions_created_at_idx
on public.reach_submissions (created_at desc);

alter table public.public_action_limits enable row level security;
alter table public.reach_submissions enable row level security;

drop policy if exists "stamp_triggers_insert_all" on public.stamp_triggers;

drop function if exists public.record_reach();

create or replace function public.claim_public_action(
  p_action text,
  p_client_hash text,
  p_min_interval interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  if p_client_hash is null or char_length(p_client_hash) < 32 or char_length(p_client_hash) > 128 then
    raise exception 'invalid_public_client' using errcode = '22023';
  end if;

  insert into public.public_action_limits as current_limit (
    action,
    client_hash,
    last_sent_at,
    updated_at
  )
  values (
    p_action,
    p_client_hash,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (action, client_hash) do update
    set last_sent_at = excluded.last_sent_at,
        updated_at = excluded.updated_at
    where current_limit.last_sent_at <= timezone('utc', now()) - p_min_interval
  returning true into claimed;

  if not coalesce(claimed, false) then
    raise exception 'public_action_rate_limited' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.record_reaction_stamp(
  stamp_name text,
  client_hash text
)
returns public.stamp_triggers
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_stamp public.stamp_triggers%rowtype;
begin
  perform public.claim_public_action('reaction_stamp', client_hash, interval '2 seconds');

  insert into public.stamp_triggers (name)
  values (stamp_name)
  returning * into inserted_stamp;

  return inserted_stamp;
end;
$$;

create or replace function public.record_reach(client_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_client_hash text;
  new_num integer;
begin
  if client_hash is null or char_length(client_hash) < 32 or char_length(client_hash) > 128 then
    raise exception 'invalid_public_client' using errcode = '22023';
  end if;

  insert into public.reach_submissions (client_hash)
  values (client_hash)
  on conflict (client_hash) do nothing
  returning client_hash into accepted_client_hash;

  if accepted_client_hash is null then
    select reach_count
    into new_num
    from public.app_state
    where id = 1;

    return coalesce(new_num, 0);
  end if;

  update public.app_state
  set reach_count = reach_count + 1
  where id = 1
  returning reach_count into new_num;

  insert into public.reach_logs (delta, reach_num, source)
  values (1, new_num, 'public');

  return new_num;
end;
$$;

create or replace function public.increment_reach()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_num integer;
begin
  if not public.is_admin() then
    raise exception 'admin role is required' using errcode = '42501';
  end if;

  update public.app_state
  set reach_count = reach_count + 1
  where id = 1
  returning reach_count into new_num;

  insert into public.reach_logs (delta, reach_num, source)
  values (1, new_num, 'admin');

  return new_num;
end;
$$;

create or replace function public.decrement_reach()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_num integer;
  new_num integer;
begin
  if not public.is_admin() then
    raise exception 'admin role is required' using errcode = '42501';
  end if;

  select reach_count
  into current_num
  from public.app_state
  where id = 1
  for update;

  new_num := greatest(coalesce(current_num, 0) - 1, 0);

  update public.app_state
  set reach_count = new_num
  where id = 1;

  insert into public.reach_logs (delta, reach_num, source)
  values (
    case when new_num < coalesce(current_num, 0) then -1 else 0 end,
    new_num,
    'admin'
  );

  return new_num;
end;
$$;

revoke execute on function public.claim_public_action(text, text, interval) from public, anon, authenticated;
revoke execute on function public.record_reaction_stamp(text, text) from public, anon, authenticated;
revoke execute on function public.record_reach(text) from public, anon, authenticated;

grant execute on function public.claim_public_action(text, text, interval) to service_role;
grant execute on function public.record_reaction_stamp(text, text) to service_role;
grant execute on function public.record_reach(text) to service_role;
grant execute on function public.increment_reach() to authenticated;
grant execute on function public.decrement_reach() to authenticated;

commit;
