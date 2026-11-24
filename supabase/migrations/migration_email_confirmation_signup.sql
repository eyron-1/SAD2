drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles
  for insert with check (
    id = auth.uid()
    and (
      role in ('kagawad', 'staff', 'sk_kagawad')
      or (role in ('sk_chairperson', 'sk_treasurer') and public.is_sk_role_available(barangay_id, role::text))
      or (role in ('captain', 'secretary', 'treasurer') and public.is_barangay_role_available(barangay_id, role::text))
      or (role = 'captain' and is_active is false)
      or public.is_empty_barangay(barangay_id)
    )
  );

create or replace function public.complete_official_signup(p_registration jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_profile public.profiles%rowtype;
  v_role_text text;
  v_role public.official_role;
  v_tenant_mode text;
  v_barangay_id uuid;
  v_full_name text;
  v_contact_number text;
  v_pending_handover boolean;
  v_is_active boolean := true;
  v_seat_limit integer;
  v_active_seats integer;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to complete official registration';
  end if;

  if jsonb_typeof(p_registration) is distinct from 'object' then
    raise exception 'Registration details are missing or invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
    into v_existing_profile
    from public.profiles
   where id = v_user_id;

  if found then
    return jsonb_build_object(
      'id', v_existing_profile.id,
      'role', v_existing_profile.role::text,
      'is_active', v_existing_profile.is_active
    );
  end if;

  v_full_name := trim(coalesce(p_registration->>'full_name', ''));
  v_contact_number := nullif(trim(coalesce(p_registration->>'contact_number', '')), '');
  v_role_text := p_registration->>'role';
  v_tenant_mode := p_registration->>'tenant_mode';
  v_pending_handover := coalesce((p_registration->>'pending_handover')::boolean, false);

  if v_full_name = '' then
    raise exception 'Full name is required';
  end if;

  if v_role_text is null or v_role_text not in (
    'captain', 'secretary', 'treasurer', 'kagawad', 'staff',
    'sk_chairperson', 'sk_treasurer', 'sk_kagawad'
  ) then
    raise exception 'Select a valid official role';
  end if;
  v_role := v_role_text::public.official_role;

  if v_pending_handover and (v_role <> 'captain' or v_tenant_mode <> 'existing') then
    raise exception 'Only an incoming Captain in an existing barangay can be registered for handover';
  end if;

  if v_tenant_mode = 'existing' then
    v_barangay_id := nullif(p_registration->>'barangay_id', '')::uuid;
    if v_barangay_id is null or not exists (
      select 1 from public.barangays where id = v_barangay_id
    ) then
      raise exception 'Select an existing barangay';
    end if;
  elsif v_tenant_mode = 'new' then
    if trim(coalesce(p_registration->>'new_barangay_name', '')) = '' then
      raise exception 'Barangay name is required';
    end if;

    insert into public.barangays (name, slug, municipality, province)
    values (
      trim(p_registration->>'new_barangay_name'),
      nullif(trim(p_registration->>'new_barangay_slug'), ''),
      nullif(trim(coalesce(p_registration->>'new_barangay_municipality', '')), ''),
      nullif(trim(coalesce(p_registration->>'new_barangay_province', '')), '')
    )
    returning id into v_barangay_id;
  else
    raise exception 'Select whether to join an existing barangay or set up a new one';
  end if;

  v_seat_limit := case v_role
    when 'kagawad' then 7
    when 'sk_kagawad' then 7
    else 1
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(v_barangay_id::text || ':' || v_role::text, 0)
  );

  select count(*)
    into v_active_seats
    from public.profiles
   where barangay_id = v_barangay_id
     and role = v_role
     and is_active;

  if v_active_seats >= v_seat_limit then
    if v_role = 'captain' and v_pending_handover then
      v_is_active := false;
    else
      raise exception 'Official Seat Limit Reached: this position has no available seat in the selected barangay';
    end if;
  end if;

  insert into public.profiles (
    id, barangay_id, full_name, role, contact_number, is_active
  )
  values (
    v_user_id, v_barangay_id, v_full_name, v_role, v_contact_number, v_is_active
  )
  returning * into v_profile;

  return jsonb_build_object(
    'id', v_profile.id,
    'role', v_profile.role::text,
    'is_active', v_profile.is_active
  );
end;
$$;

revoke all on function public.complete_official_signup(jsonb) from public, anon, authenticated;
grant execute on function public.complete_official_signup(jsonb) to authenticated;
