begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.public_action_rate_limits (
  fingerprint text not null,
  action text not null check (action in ('reach', 'stamp')),
  window_start timestamptz not null default timezone('utc', now()),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (fingerprint, action),
  constraint public_action_rate_limits_fingerprint_length check (
    length(fingerprint) between 16 and 128
  )
);

create index if not exists public_action_rate_limits_window_start_idx
on private.public_action_rate_limits (window_start);

alter table private.public_action_rate_limits enable row level security;
revoke all privileges on private.public_action_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on private.public_action_rate_limits to service_role;

create or replace function private.enforce_public_action_rate_limit(
  p_fingerprint text,
  p_action text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security invoker
set search_path = private
as $$
declare
  normalized_fingerprint text := nullif(trim(p_fingerprint), '');
  next_request_count integer;
begin
  if normalized_fingerprint is null
    or length(normalized_fingerprint) < 16
    or length(normalized_fingerprint) > 128 then
    raise exception 'invalid_action_fingerprint' using errcode = '22023';
  end if;

  if p_action not in ('reach', 'stamp') then
    raise exception 'invalid_public_action' using errcode = '22023';
  end if;

  if p_limit < 1 or p_window <= interval '0 seconds' then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;

  delete from private.public_action_rate_limits
  where window_start < timezone('utc', now()) - interval '1 day';

  insert into private.public_action_rate_limits as limits (
    fingerprint,
    action,
    window_start,
    request_count
  )
  values (normalized_fingerprint, p_action, timezone('utc', now()), 1)
  on conflict (fingerprint, action) do update
    set window_start = case
          when limits.window_start <= timezone('utc', now()) - p_window
            then timezone('utc', now())
          else limits.window_start
        end,
        request_count = case
          when limits.window_start <= timezone('utc', now()) - p_window
            then 1
          else limits.request_count + 1
        end
  returning request_count into next_request_count;

  if next_request_count > p_limit then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.enforce_public_action_rate_limit(text, text, integer, interval)
from public, anon, authenticated;
grant execute on function private.enforce_public_action_rate_limit(text, text, integer, interval)
to service_role;

create or replace function private.append_reach_log(p_delta integer, p_source text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_num integer;
  new_num integer;
  actual_delta integer;
begin
  if p_delta not in (-1, 1) then
    raise exception 'invalid_reach_delta' using errcode = '22023';
  end if;

  if p_source not in ('public', 'admin', 'system') then
    raise exception 'invalid_reach_source' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(20260313, 1);

  select coalesce((
    select reach_num
    from public.reach_logs
    order by created_at desc, id desc
    limit 1
  ), 0)
  into current_num;

  new_num := greatest(current_num + p_delta, 0);
  actual_delta := new_num - current_num;

  insert into public.reach_logs (delta, reach_num, source)
  values (actual_delta, new_num, p_source);

  return new_num;
end;
$$;

revoke all on function private.append_reach_log(integer, text) from public, anon, authenticated;
grant execute on function private.append_reach_log(integer, text) to service_role;

drop function if exists public.record_reach();

create or replace function public.record_reach(p_fingerprint text)
returns integer
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  perform private.enforce_public_action_rate_limit(
    p_fingerprint,
    'reach',
    6,
    interval '1 minute'
  );

  return private.append_reach_log(1, 'public');
end;
$$;

create or replace function public.increment_reach()
returns integer
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  return private.append_reach_log(1, 'admin');
end;
$$;

create or replace function public.decrement_reach()
returns integer
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  return private.append_reach_log(-1, 'admin');
end;
$$;

create or replace function public.record_stamp_trigger(p_name text, p_fingerprint text)
returns bigint
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  new_id bigint;
begin
  perform private.enforce_public_action_rate_limit(
    p_fingerprint,
    'stamp',
    30,
    interval '1 minute'
  );

  insert into public.stamp_triggers (name)
  values (p_name)
  returning id into new_id;

  return new_id;
end;
$$;

drop policy if exists "stamp_triggers_insert_all" on public.stamp_triggers;
revoke insert on public.stamp_triggers from anon, authenticated;
revoke usage on sequence public.stamp_triggers_id_seq from anon, authenticated;

revoke all on function public.record_reach(text) from public, anon, authenticated;
revoke all on function public.increment_reach() from public, anon, authenticated;
revoke all on function public.decrement_reach() from public, anon, authenticated;
revoke all on function public.record_stamp_trigger(text, text) from public, anon, authenticated;

grant execute on function public.record_reach(text) to service_role;
grant execute on function public.increment_reach() to service_role;
grant execute on function public.decrement_reach() to service_role;
grant execute on function public.record_stamp_trigger(text, text) to service_role;

commit;
