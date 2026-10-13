-- Keep SK operational and financial records separate from authenticated
-- Barangay accounts while preserving the existing anonymous public portal.
-- Apply after migration_operations_audit.sql and migration_sk_program_milestones.sql.

begin;

create or replace function public.is_sk_member_for_barangay(target_barangay uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and barangay_id = target_barangay
       and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
       and is_active
  );
$$;

drop policy if exists "public read sk_fund_sources" on public.sk_fund_sources;
create policy "public read sk_fund_sources" on public.sk_fund_sources for select
  using (
    auth.uid() is null
    or not belongs_to_barangay(auth.uid(), barangay_id)
    or public.is_sk_member_for_barangay(barangay_id)
  );

drop policy if exists "public read sk_budget" on public.sk_budget;
create policy "public read sk_budget" on public.sk_budget for select
  using (
    auth.uid() is null
    or not belongs_to_barangay(auth.uid(), barangay_id)
    or public.is_sk_member_for_barangay(barangay_id)
  );

drop policy if exists "public read sk_expenses" on public.sk_expenses;
create policy "public read sk_expenses" on public.sk_expenses for select
  using (
    auth.uid() is null
    or not belongs_to_barangay(auth.uid(), barangay_id)
    or public.is_sk_member_for_barangay(barangay_id)
  );

drop policy if exists "public read sk_programs" on public.sk_programs;
create policy "public read sk_programs" on public.sk_programs for select
  using (
    auth.uid() is null
    or not belongs_to_barangay(auth.uid(), barangay_id)
    or public.is_sk_member_for_barangay(barangay_id)
  );

drop policy if exists "sk officials read kk" on public.kk_monitoring;
create policy "sk officials read kk" on public.kk_monitoring for select
  using (public.is_sk_member_for_barangay(barangay_id));
drop policy if exists "sk officials write kk" on public.kk_monitoring;
create policy "sk officials write kk" on public.kk_monitoring for insert
  with check (public.is_sk_member_for_barangay(barangay_id));

drop policy if exists "public read program milestones" on public.program_milestones;
drop policy if exists "read scoped public program milestones" on public.program_milestones;
create policy "read scoped public program milestones" on public.program_milestones for select
  using (
    auth.uid() is null
    or not belongs_to_barangay(auth.uid(), barangay_id)
    or (
      belongs_to_barangay(auth.uid(), barangay_id)
      and (
        (sk_program_id is not null and public.is_sk_member_for_barangay(barangay_id))
        or (sk_program_id is null and not public.is_sk_member_for_barangay(barangay_id))
      )
    )
  );

drop policy if exists "members read audit logs" on public.audit_logs;
drop policy if exists "read scoped audit logs" on public.audit_logs;
create policy "read scoped audit logs" on public.audit_logs for select
  using (
    belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (
        entity_table in ('sk_fund_sources', 'sk_budget', 'sk_expenses', 'sk_programs', 'kk_monitoring')
        or (
          entity_table = 'program_milestones'
          and coalesce(after_data->>'sk_program_id', before_data->>'sk_program_id') is not null
        )
      ) = public.is_sk_member_for_barangay(barangay_id)
    )
  );

commit;