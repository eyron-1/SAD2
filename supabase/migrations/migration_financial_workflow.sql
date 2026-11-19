-- Keep the workflow single-source: fund sources -> allocations -> expenses.
-- Run after migration_financial_integrity.sql.

alter table programs
  add column if not exists budget_allocation_id uuid;

alter table sk_programs
  add column if not exists sk_budget_id uuid;

-- Composite references below require tenant-scoped uniqueness. These indexes
-- also make this migration work when the integrity migration was not run yet.
create unique index if not exists budget_allocations_id_barangay_uidx
  on budget_allocations (id, barangay_id);
create unique index if not exists sk_budget_id_barangay_uidx
  on sk_budget (id, barangay_id);

alter table programs
  drop constraint if exists programs_budget_allocation_same_barangay;
alter table programs
  add constraint programs_budget_allocation_same_barangay
  foreign key (budget_allocation_id, barangay_id)
  references budget_allocations (id, barangay_id);

alter table sk_programs
  drop constraint if exists sk_programs_budget_same_barangay;
alter table sk_programs
  add constraint sk_programs_budget_same_barangay
  foreign key (sk_budget_id, barangay_id)
  references sk_budget (id, barangay_id);

create or replace function validate_allocation_funding()
returns trigger
language plpgsql
security invoker
as $$
declare
  available_funds numeric(14,2);
  allocated_funds numeric(14,2);
begin
  if tg_table_name = 'budget_allocations' then
    select coalesce(sum(amount), 0) into available_funds
      from fund_sources
     where barangay_id = new.barangay_id
       and fiscal_year = new.fiscal_year;
    select coalesce(sum(amount), 0) into allocated_funds
      from budget_allocations
     where barangay_id = new.barangay_id
       and fiscal_year = new.fiscal_year
       and id <> new.id;
  else
    select coalesce(sum(amount), 0) into available_funds
      from sk_fund_sources
     where barangay_id = new.barangay_id
       and fiscal_year = new.fiscal_year;
    select coalesce(sum(amount), 0) into allocated_funds
      from sk_budget
     where barangay_id = new.barangay_id
       and fiscal_year = new.fiscal_year
       and id <> new.id;
  end if;

  if allocated_funds + new.amount > available_funds then
    raise exception 'Allocations for fiscal year % exceed available fund sources', new.fiscal_year;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_allocation_funding on budget_allocations;
create trigger validate_allocation_funding
before insert or update on budget_allocations
for each row execute function validate_allocation_funding();

drop trigger if exists validate_sk_allocation_funding on sk_budget;
create trigger validate_sk_allocation_funding
before insert or update on sk_budget
for each row execute function validate_allocation_funding();

create index if not exists budget_allocations_barangay_year_idx
  on budget_allocations (barangay_id, fiscal_year);
create index if not exists fund_sources_barangay_year_idx
  on fund_sources (barangay_id, fiscal_year);
create index if not exists sk_budget_barangay_year_idx
  on sk_budget (barangay_id, fiscal_year);
create index if not exists sk_fund_sources_barangay_year_idx
  on sk_fund_sources (barangay_id, fiscal_year);