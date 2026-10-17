-- Allow available Barangay Captain, Secretary, and Treasurer seats to self-register.
-- Run after schema.sql and the existing signup/security migrations.

create or replace function is_barangay_role_available(bgy uuid, requested_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select requested_role in ('captain', 'secretary', 'treasurer')
    and not exists (
      select 1
      from profiles
      where barangay_id = bgy
        and role::text = requested_role
        and is_active
    );
$$;

drop policy if exists "users create own profile" on profiles;
create policy "users create own profile" on profiles
  for insert with check (
    id = auth.uid()
    and (
      role in ('kagawad', 'staff', 'sk_kagawad')
      or (role in ('sk_chairperson', 'sk_treasurer') and is_sk_role_available(barangay_id, role::text))
      or (role in ('captain', 'secretary', 'treasurer') and is_barangay_role_available(barangay_id, role::text))
      or is_empty_barangay(barangay_id)
    )
  );
