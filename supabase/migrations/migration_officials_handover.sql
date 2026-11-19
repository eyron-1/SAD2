-- Restore inactive profiles to same-barangay editors and make handovers atomic.
-- Run after schema.sql and the existing profile/security migrations.

create or replace function public.can_read_barangay_profiles(target_barangay_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from profiles
     where id = auth.uid()
       and barangay_id = target_barangay_id
       and role in ('captain', 'secretary', 'treasurer', 'staff', 'sk_chairperson', 'sk_treasurer')
       and is_active
  );
$$;
revoke all on function public.can_read_barangay_profiles(uuid) from public;
grant execute on function public.can_read_barangay_profiles(uuid) to anon, authenticated;

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
      or (role = 'captain' and is_active is false)
      or is_empty_barangay(barangay_id)
    )
  );

drop policy if exists "editors read barangay profiles" on profiles;
create policy "editors read barangay profiles" on profiles for select
  using (public.can_read_barangay_profiles(barangay_id));

create or replace function protect_profile_privilege_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  if old.id = auth.uid()
     and current_user <> (
       select pg_get_userbyid(proowner)
         from pg_proc
        where oid = 'public.complete_officials_handover(uuid,public.official_role,uuid,uuid,date,date,text)'::regprocedure
     ) then
    new.role := old.role;
    new.barangay_id := old.barangay_id;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create or replace function public.complete_officials_handover(
  p_barangay_id uuid,
  p_position_role official_role,
  p_outgoing_official_id uuid,
  p_incoming_official_id uuid,
  p_term_start date,
  p_term_end date,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_profile profiles%rowtype;
  seat_limit integer;
  occupied_seats integer;
  handover_id uuid;
  position_name text;
begin
  if auth.uid() is null or not exists (
    select 1
      from profiles
     where id = auth.uid()
       and barangay_id = p_barangay_id
       and is_active
       and (
         (p_position_role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad') and role in ('sk_chairperson', 'sk_treasurer'))
         or (p_position_role not in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad') and role in ('captain', 'secretary', 'treasurer', 'staff'))
       )
  ) then
    raise exception 'You do not have permission to record this officials handover';
  end if;

  if p_term_start is null or (p_term_end is not null and p_term_end < p_term_start) then
    raise exception 'Term end date cannot be earlier than the term start date';
  end if;

  if p_outgoing_official_id is not null
     and p_outgoing_official_id = p_incoming_official_id then
    raise exception 'Outgoing and incoming officials must be different accounts';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_barangay_id::text || p_position_role::text, 0));

  if p_outgoing_official_id is not null and not exists (
    select 1
      from profiles
     where id = p_outgoing_official_id
       and barangay_id = p_barangay_id
       and role = p_position_role
       and is_active
  ) then
    raise exception 'The outgoing official must be an active holder of the selected position in this barangay';
  end if;

  select *
    into incoming_profile
    from profiles
   where id = p_incoming_official_id
     and barangay_id = p_barangay_id;
  if not found then
    raise exception 'The incoming official must have an account in this barangay';
  end if;

  if p_incoming_official_id = auth.uid() and exists (
    select 1
      from profiles
     where id = auth.uid()
       and role = 'staff'
       and is_active
  ) then
    raise exception 'Barangay Staff cannot assign the incoming seat to their own account';
  end if;

  if p_outgoing_official_id is null
     and incoming_profile.is_active
     and incoming_profile.role = p_position_role then
    raise exception 'The incoming official already holds the selected position';
  end if;

  seat_limit := case p_position_role
    when 'kagawad' then 7
    when 'sk_kagawad' then 7
    else 1
  end;

  select count(*)
    into occupied_seats
    from profiles
   where barangay_id = p_barangay_id
     and role = p_position_role
     and is_active
     and id <> p_incoming_official_id
     and (p_outgoing_official_id is null or id <> p_outgoing_official_id);

  if occupied_seats >= seat_limit then
    raise exception 'The selected position has no available seat; select its outgoing official or choose another position';
  end if;

  position_name := case p_position_role
    when 'captain' then 'Barangay Captain'
    when 'secretary' then 'Barangay Secretary'
    when 'treasurer' then 'Barangay Treasurer'
    when 'kagawad' then 'Barangay Kagawad'
    when 'staff' then 'Barangay Staff'
    when 'sk_chairperson' then 'SK Chairperson'
    when 'sk_treasurer' then 'SK Treasurer'
    when 'sk_kagawad' then 'SK Kagawad'
  end;

  if p_outgoing_official_id is not null then
    update profiles
       set is_active = false,
           term_end = p_term_start
     where id = p_outgoing_official_id;
  end if;

  update profiles
     set is_active = true,
         role = p_position_role,
         position_title = position_name,
         term_start = p_term_start,
         term_end = p_term_end
   where id = p_incoming_official_id;

  insert into officials_transitions (
    barangay_id,
    position_title,
    outgoing_official_id,
    incoming_official_id,
    term_start,
    term_end,
    notes,
    created_by
  ) values (
    p_barangay_id,
    position_name,
    p_outgoing_official_id,
    p_incoming_official_id,
    p_term_start,
    p_term_end,
    nullif(trim(p_notes), ''),
    auth.uid()
  )
  returning id into handover_id;

  return handover_id;
end;
$$;

revoke all on function public.complete_officials_handover(uuid, official_role, uuid, uuid, date, date, text) from public;
grant execute on function public.complete_officials_handover(uuid, official_role, uuid, uuid, date, date, text) to authenticated;

create or replace function public.end_official_term(
  p_barangay_id uuid,
  p_official_id uuid,
  p_term_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile profiles%rowtype;
begin
  if p_term_end is null or auth.uid() is null then
    raise exception 'A term end date and authenticated user are required';
  end if;
  if p_official_id = auth.uid() then
    raise exception 'You cannot end your own official term from this page';
  end if;

  select *
    into target_profile
    from profiles
   where id = p_official_id
     and barangay_id = p_barangay_id
     and is_active;
  if not found then
    raise exception 'The selected official is not active in this barangay';
  end if;

  if target_profile.role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad') then
    if not exists (
      select 1
        from profiles
       where id = auth.uid()
         and barangay_id = p_barangay_id
         and role in ('sk_chairperson', 'sk_treasurer')
         and is_active
    ) then
      raise exception 'Only an active SK Chairperson or SK Treasurer can end an SK official term';
    end if;
  elsif not exists (
    select 1
      from profiles
     where id = auth.uid()
       and barangay_id = p_barangay_id
       and role in ('captain', 'secretary', 'treasurer', 'staff')
       and is_active
  ) then
    raise exception 'Only an active Barangay Captain, Secretary, Treasurer, or Staff member can end a Barangay official term';
  end if;

  update profiles
     set is_active = false,
         term_end = p_term_end
   where id = p_official_id;
end;
$$;

revoke all on function public.end_official_term(uuid, uuid, date) from public;
grant execute on function public.end_official_term(uuid, uuid, date) to authenticated;
