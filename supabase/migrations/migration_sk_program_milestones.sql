-- Extend project milestones to SK programs without changing existing records.
-- Apply after migration_operations_audit.sql.

begin;

alter table public.program_milestones
  add column if not exists sk_program_id uuid;

alter table public.program_milestones
  alter column program_id drop not null;

create unique index if not exists sk_programs_id_barangay_uidx
  on public.sk_programs (id, barangay_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'program_milestones_sk_program_barangay_fk'
      and conrelid = 'public.program_milestones'::regclass
  ) then
    alter table public.program_milestones
      add constraint program_milestones_sk_program_barangay_fk
      foreign key (sk_program_id, barangay_id)
      references public.sk_programs (id, barangay_id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'program_milestones_exactly_one_program_check'
      and conrelid = 'public.program_milestones'::regclass
  ) then
    alter table public.program_milestones
      add constraint program_milestones_exactly_one_program_check
      check ((program_id is null) <> (sk_program_id is null));
  end if;
end;
$$;

drop policy if exists "editors manage program milestones" on public.program_milestones;
create policy "editors manage program milestones" on public.program_milestones for all
  using (
    belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (program_id is not null and is_barangay_editor(auth.uid()))
      or (sk_program_id is not null and is_sk_editor(auth.uid()))
    )
  )
  with check (
    belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (program_id is not null and is_barangay_editor(auth.uid()))
      or (sk_program_id is not null and is_sk_editor(auth.uid()))
    )
  );

commit;