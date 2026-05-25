begin;

revoke usage on schema public from public, anon, authenticated;
revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "numbers_read_all" on public.numbers;
drop policy if exists "numbers_admin_insert" on public.numbers;
drop policy if exists "numbers_admin_update" on public.numbers;
drop policy if exists "numbers_admin_delete" on public.numbers;
drop policy if exists "prizes_read_all" on public.prizes;
drop policy if exists "prizes_admin_insert" on public.prizes;
drop policy if exists "prizes_admin_update" on public.prizes;
drop policy if exists "prizes_admin_delete" on public.prizes;
drop policy if exists "app_state_read_all" on public.app_state;
drop policy if exists "app_state_admin_update" on public.app_state;
drop policy if exists "reach_logs_read_all" on public.reach_logs;
drop policy if exists "stamp_triggers_read_all" on public.stamp_triggers;
drop policy if exists "stamp_triggers_insert_all" on public.stamp_triggers;

drop policy if exists "profiles_service_role_all" on public.profiles;
create policy "profiles_service_role_all"
on public.profiles
for all
to service_role
using (true)
with check (true);

drop policy if exists "numbers_service_role_all" on public.numbers;
create policy "numbers_service_role_all"
on public.numbers
for all
to service_role
using (true)
with check (true);

drop policy if exists "prizes_service_role_all" on public.prizes;
create policy "prizes_service_role_all"
on public.prizes
for all
to service_role
using (true)
with check (true);

drop policy if exists "app_state_service_role_all" on public.app_state;
create policy "app_state_service_role_all"
on public.app_state
for all
to service_role
using (true)
with check (true);

drop policy if exists "reach_logs_service_role_all" on public.reach_logs;
create policy "reach_logs_service_role_all"
on public.reach_logs
for all
to service_role
using (true)
with check (true);

drop policy if exists "stamp_triggers_service_role_all" on public.stamp_triggers;
create policy "stamp_triggers_service_role_all"
on public.stamp_triggers
for all
to service_role
using (true)
with check (true);

drop policy if exists "public_action_limits_service_role_all" on public.public_action_limits;
create policy "public_action_limits_service_role_all"
on public.public_action_limits
for all
to service_role
using (true)
with check (true);

drop policy if exists "reach_submissions_service_role_all" on public.reach_submissions;
create policy "reach_submissions_service_role_all"
on public.reach_submissions
for all
to service_role
using (true)
with check (true);

drop policy if exists "prize_images_public_read" on storage.objects;
drop policy if exists "prize_images_admin_insert" on storage.objects;
drop policy if exists "prize_images_admin_update" on storage.objects;
drop policy if exists "prize_images_admin_delete" on storage.objects;

drop policy if exists "prize_images_service_role_all" on storage.objects;
create policy "prize_images_service_role_all"
on storage.objects
for all
to service_role
using (bucket_id = 'prize-images')
with check (bucket_id = 'prize-images');

drop function if exists public.record_reach();

create or replace function public.claim_public_action(
  p_action text,
  p_client_hash text,
  p_min_interval interval
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  claimed boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

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
security invoker
set search_path = public
as $$
declare
  inserted_stamp public.stamp_triggers%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

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
security invoker
set search_path = public
as $$
declare
  accepted_client_hash text;
  new_num integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
  end if;

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
security invoker
set search_path = public
as $$
declare
  new_num integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
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
security invoker
set search_path = public
as $$
declare
  current_num integer;
  new_num integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role is required' using errcode = '42501';
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.claim_public_action(text, text, interval) to service_role;
grant execute on function public.record_reaction_stamp(text, text) to service_role;
grant execute on function public.record_reach(text) to service_role;
grant execute on function public.increment_reach() to service_role;
grant execute on function public.decrement_reach() to service_role;
grant execute on function public.is_admin(uuid) to service_role;
grant execute on function public.set_updated_at() to service_role;

do $$
begin
  if exists (
    select 1
    from pg_roles
    where rolname = 'supabase_auth_admin'
  ) then
    execute 'grant execute on function public.handle_new_user() to supabase_auth_admin';
    execute 'grant execute on function public.set_updated_at() to supabase_auth_admin';
  end if;
end
$$;

do $$
declare
  table_name text;
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    foreach table_name in array array['numbers', 'prizes', 'app_state', 'reach_logs', 'stamp_triggers']
    loop
      if exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime drop table public.%I', table_name);
      end if;
    end loop;
  end if;
end
$$;

commit;
