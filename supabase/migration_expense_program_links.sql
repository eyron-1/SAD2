-- Link expense records to programs/projects while keeping links within a barangay.
-- Run after schema.sql on a new database, or on an existing database.

alter table public.expenses
  add column if not exists program_id uuid;

alter table public.sk_expenses
  add column if not exists sk_program_id uuid;

create unique index if not exists programs_id_barangay_unique
  on public.programs (id, barangay_id);

create unique index if not exists sk_programs_id_barangay_unique
  on public.sk_programs (id, barangay_id);

alter table public.expenses
  drop constraint if exists expenses_program_same_barangay;
alter table public.expenses
  add constraint expenses_program_same_barangay
  foreign key (program_id, barangay_id)
  references public.programs (id, barangay_id);

alter table public.sk_expenses
  drop constraint if exists sk_expenses_program_same_barangay;
alter table public.sk_expenses
  add constraint sk_expenses_program_same_barangay
  foreign key (sk_program_id, barangay_id)
  references public.sk_programs (id, barangay_id);

create index if not exists expenses_program_barangay_idx
  on public.expenses (program_id, barangay_id);

create index if not exists sk_expenses_program_barangay_idx
  on public.sk_expenses (sk_program_id, barangay_id);
