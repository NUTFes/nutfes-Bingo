begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
revoke all on schema private from service_role;

create or replace function private.bootstrap_initial_admin(
  p_user_id uuid,
  p_email text
)
returns table (
  user_id uuid,
  email text,
  role text,
  was_admin boolean
)
language plpgsql
security definer
set search_path = public, auth, private
as $$
declare
  normalized_email text := lower(nullif(btrim(p_email), ''));
  other_admin_count integer;
  was_admin_before boolean;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = '22023';
  end if;

  if normalized_email is null then
    raise exception 'email is required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_user_id
      and lower(email) = normalized_email
  ) then
    raise exception 'auth user does not match id/email' using errcode = 'P0001';
  end if;

  select count(*)
  into other_admin_count
  from public.profiles
  where role = 'admin'
    and id <> p_user_id;

  if other_admin_count > 0 then
    raise exception 'initial admin already exists' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'admin'
  )
  into was_admin_before;

  insert into public.profiles (id, email, role)
  values (p_user_id, normalized_email, 'admin')
  on conflict (id) do update
    set email = excluded.email,
        role = 'admin',
        updated_at = timezone('utc', now());

  return query
  select profiles.id, profiles.email, profiles.role, was_admin_before
  from public.profiles
  where profiles.id = p_user_id;
end;
$$;

comment on schema private is
  'Operational functions for LXC-only maintenance tasks. This schema is not exposed through PostgREST.';

comment on function private.bootstrap_initial_admin(uuid, text) is
  'Promotes the first production Auth user to profiles.role = admin. Intended for psql-only bootstrap operations.';

revoke all on function private.bootstrap_initial_admin(uuid, text) from public;
revoke all on function private.bootstrap_initial_admin(uuid, text) from anon;
revoke all on function private.bootstrap_initial_admin(uuid, text) from authenticated;
revoke all on function private.bootstrap_initial_admin(uuid, text) from service_role;

commit;
