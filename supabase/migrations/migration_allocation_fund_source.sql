-- Tie each new budget allocation to a fund source in the same barangay and fiscal year.
-- Existing allocations remain valid and can be linked when edited.

begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'fund_sources_id_barangay_unique'
       and conrelid = 'public.fund_sources'::regclass
  ) then
    alter table public.fund_sources
      add constraint fund_sources_id_barangay_unique unique (id, barangay_id);
  end if;
  if not exists (
    select 1 from pg_constraint
     where conname = 'sk_fund_sources_id_barangay_unique'
       and conrelid = 'public.sk_fund_sources'::regclass
  ) then
    alter table public.sk_fund_sources
      add constraint sk_fund_sources_id_barangay_unique unique (id, barangay_id);
  end if;
end;
$$;

alter table public.budget_allocations
  add column if not exists fund_source_id uuid;

alter table public.sk_budget
  add column if not exists sk_fund_source_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'budget_allocations_fund_source_same_barangay'
       and conrelid = 'public.budget_allocations'::regclass
  ) then
    alter table public.budget_allocations
      add constraint budget_allocations_fund_source_same_barangay
      foreign key (fund_source_id, barangay_id)
      references public.fund_sources (id, barangay_id);
  end if;
  if not exists (
    select 1 from pg_constraint
     where conname = 'sk_budget_fund_source_same_barangay'
       and conrelid = 'public.sk_budget'::regclass
  ) then
    alter table public.sk_budget
      add constraint sk_budget_fund_source_same_barangay
      foreign key (sk_fund_source_id, barangay_id)
      references public.sk_fund_sources (id, barangay_id);
  end if;
end;
$$;

create or replace function public.validate_allocation_fund_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_amount numeric(14,2);
  source_year text;
  source_allocations numeric(14,2);
begin
  if new.fund_source_id is null then
    raise exception 'Choose a fund source for this allocation so its usage can be validated.';
  end if;

  select amount, fiscal_year
    into source_amount, source_year
    from public.fund_sources
   where id = new.fund_source_id
     and barangay_id = new.barangay_id
   for update;

  if not found or source_year <> new.fiscal_year then
    raise exception 'Choose a fund source for the same fiscal year as this allocation.';
  end if;

  select coalesce(sum(amount), 0)
    into source_allocations
    from public.budget_allocations
   where fund_source_id = new.fund_source_id
     and id is distinct from new.id;

  if source_allocations + new.amount > source_amount then
    raise exception 'Allocation exceeds the remaining amount of the selected fund source.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_sk_allocation_fund_source()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_amount numeric(14,2);
  source_year text;
  source_allocations numeric(14,2);
begin
  if new.sk_fund_source_id is null then
    raise exception 'Choose an SK fund source for this allocation so its usage can be validated.';
  end if;

  select amount, fiscal_year
    into source_amount, source_year
    from public.sk_fund_sources
   where id = new.sk_fund_source_id
     and barangay_id = new.barangay_id
   for update;

  if not found or source_year <> new.fiscal_year then
    raise exception 'Choose an SK fund source for the same fiscal year as this allocation.';
  end if;

  select coalesce(sum(amount), 0)
    into source_allocations
    from public.sk_budget
   where sk_fund_source_id = new.sk_fund_source_id
     and id is distinct from new.id;

  if source_allocations + new.amount > source_amount then
    raise exception 'SK allocation exceeds the remaining amount of the selected fund source.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_allocation_fund_source on public.budget_allocations;
create trigger validate_allocation_fund_source
before insert or update on public.budget_allocations
for each row execute function public.validate_allocation_fund_source();

drop trigger if exists validate_sk_allocation_fund_source on public.sk_budget;
create trigger validate_sk_allocation_fund_source
before insert or update on public.sk_budget
for each row execute function public.validate_sk_allocation_fund_source();

commit;
