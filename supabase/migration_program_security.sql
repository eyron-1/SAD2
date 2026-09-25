-- Program, project, and profile security hardening.
-- Run after schema.sql and the existing migrations.

-- Programs are public records, but only the same editor roles exposed by the
-- application may create, change, or delete them.
alter table programs add column if not exists beneficiary_category text default 'General Residents';
drop policy if exists "officials write programs" on programs;
drop policy if exists "editors write programs" on programs;
drop policy if exists "editors update programs" on programs;
drop policy if exists "editors delete programs" on programs;
create policy "editors write programs" on programs
  for insert with check (
    is_barangay_editor(auth.uid())
    and belongs_to_barangay(auth.uid(), barangay_id)
  );
create policy "editors update programs" on programs
  for update
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors delete programs" on programs
  for delete using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "sk officials write sk_programs" on sk_programs;
drop policy if exists "sk editors write sk_programs" on sk_programs;
drop policy if exists "sk editors update sk_programs" on sk_programs;
drop policy if exists "sk editors delete sk_programs" on sk_programs;
create policy "sk editors write sk_programs" on sk_programs
  for insert with check (
    is_sk_editor(auth.uid())
    and belongs_to_barangay(auth.uid(), barangay_id)
  );
create policy "sk editors update sk_programs" on sk_programs
  for update
  using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_programs" on sk_programs
  for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

alter table programs drop constraint if exists programs_budget_amount_check;
alter table programs add constraint programs_budget_amount_check
  check (budget_amount >= 0 and budget_amount <= 999999999999.99);
alter table programs drop constraint if exists programs_status_check;
alter table programs add constraint programs_status_check
  check (status in ('planned', 'ongoing', 'completed', 'cancelled'));
alter table programs drop constraint if exists programs_date_range_check;
alter table programs add constraint programs_date_range_check
  check (end_date is null or start_date is null or end_date >= start_date);
alter table programs drop constraint if exists programs_content_limits_check;
alter table programs add constraint programs_content_limits_check
  check (
    length(trim(title)) between 1 and 200
    and coalesce(length(description), 0) <= 5000
    and coalesce(length(category), 0) <= 120
    and coalesce(length(beneficiary_category), 0) between 1 and 120
    and beneficiaries_count >= 0
  );

alter table sk_programs drop constraint if exists sk_programs_budget_amount_check;
alter table sk_programs add constraint sk_programs_budget_amount_check
  check (budget_amount >= 0 and budget_amount <= 999999999999.99);
alter table sk_programs drop constraint if exists sk_programs_status_check;
alter table sk_programs add constraint sk_programs_status_check
  check (status in ('planned', 'ongoing', 'completed', 'cancelled'));
alter table sk_programs drop constraint if exists sk_programs_date_range_check;
alter table sk_programs add constraint sk_programs_date_range_check
  check (end_date is null or start_date is null or end_date >= start_date);
alter table sk_programs drop constraint if exists sk_programs_content_limits_check;
alter table sk_programs add constraint sk_programs_content_limits_check
  check (
    length(trim(title)) between 1 and 200
    and coalesce(length(description), 0) <= 5000
    and coalesce(length(category), 0) <= 120
  );

create or replace function protect_program_audit_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.barangay_id := old.barangay_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_program_audit_fields on programs;
create trigger protect_program_audit_fields
before insert or update on programs
for each row execute function protect_program_audit_fields();

drop trigger if exists protect_sk_program_audit_fields on sk_programs;
create trigger protect_sk_program_audit_fields
before insert or update on sk_programs
for each row execute function protect_program_audit_fields();

create or replace function is_empty_barangay(bgy uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from profiles where barangay_id = bgy);
$$;

-- New users may register into an empty tenant, or join as a non-editor. They
-- cannot self-assign an editor role in an existing barangay.
drop policy if exists "users create own profile" on profiles;
create policy "users create own profile" on profiles
  for insert with check (
    id = auth.uid()
    and (
      role in ('kagawad', 'staff', 'sk_kagawad')
      or is_empty_barangay(barangay_id)
    )
  );

create or replace function protect_profile_privilege_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  if old.id = auth.uid() then
    new.role := old.role;
    new.barangay_id := old.barangay_id;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privilege_fields on profiles;
create trigger protect_profile_privilege_fields
before update on profiles
for each row execute function protect_profile_privilege_fields();

drop policy if exists "editors update other profiles" on profiles;
create policy "editors update other profiles" on profiles
  for update
  using ((is_barangay_editor(auth.uid()) or is_sk_editor(auth.uid())) and belongs_to_barangay(auth.uid(), barangay_id))
  with check ((is_barangay_editor(auth.uid()) or is_sk_editor(auth.uid())) and belongs_to_barangay(auth.uid(), barangay_id));