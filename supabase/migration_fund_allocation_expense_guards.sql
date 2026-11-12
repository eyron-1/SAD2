-- Enforce the fund -> allocation -> expense workflow for barangay and SK records.
-- Apply after the financial workflow and financial integrity migrations.

begin;

create or replace function public.assert_barangay_fiscal_year_funded(
  target_barangay_id uuid,
  target_fiscal_year text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  sourced_amount numeric(14,2);
  allocated_amount numeric(14,2);
begin
  perform 1
    from public.barangays
   where id = target_barangay_id
   for update;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0)
    into sourced_amount
    from public.fund_sources
   where barangay_id = target_barangay_id
     and fiscal_year = target_fiscal_year;

  select coalesce(sum(amount), 0)
    into allocated_amount
    from public.budget_allocations
   where barangay_id = target_barangay_id
     and fiscal_year = target_fiscal_year;

  if allocated_amount > sourced_amount then
    raise exception 'Allocations for fiscal year % exceed available fund sources', target_fiscal_year;
  end if;
end;
$$;

create or replace function public.assert_sk_fiscal_year_funded(
  target_barangay_id uuid,
  target_fiscal_year text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  sourced_amount numeric(14,2);
  allocated_amount numeric(14,2);
begin
  perform 1
    from public.barangays
   where id = target_barangay_id
   for update;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0)
    into sourced_amount
    from public.sk_fund_sources
   where barangay_id = target_barangay_id
     and fiscal_year = target_fiscal_year;

  select coalesce(sum(amount), 0)
    into allocated_amount
    from public.sk_budget
   where barangay_id = target_barangay_id
     and fiscal_year = target_fiscal_year;

  if allocated_amount > sourced_amount then
    raise exception 'SK allocations for fiscal year % exceed available fund sources', target_fiscal_year;
  end if;
end;
$$;

create or replace function public.validate_barangay_allocation_funding()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  sourced_amount numeric(14,2);
  other_allocations numeric(14,2);
  committed_expenses numeric(14,2);
begin
  perform 1
    from public.barangays
   where id = new.barangay_id
   for update;

  if new.amount <= 0 then
    raise exception 'Allocation amount must be greater than zero';
  end if;

  select coalesce(sum(amount), 0)
    into sourced_amount
    from public.fund_sources
   where barangay_id = new.barangay_id
     and fiscal_year = new.fiscal_year;

  if sourced_amount <= 0 then
    raise exception 'Cannot allocate funds without a fund source for fiscal year %', new.fiscal_year;
  end if;

  select coalesce(sum(amount), 0)
    into other_allocations
    from public.budget_allocations
   where barangay_id = new.barangay_id
     and fiscal_year = new.fiscal_year
     and id is distinct from new.id;

  if other_allocations + new.amount > sourced_amount then
    raise exception 'Allocation exceeds available fund sources for fiscal year %', new.fiscal_year;
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.expenses
   where budget_allocation_id = new.id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses > new.amount then
    raise exception 'Allocation cannot be lower than its recorded expenses';
  end if;

  return new;
end;
$$;

create or replace function public.validate_sk_allocation_funding()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  sourced_amount numeric(14,2);
  other_allocations numeric(14,2);
  committed_expenses numeric(14,2);
begin
  perform 1
    from public.barangays
   where id = new.barangay_id
   for update;

  if new.amount <= 0 then
    raise exception 'SK allocation amount must be greater than zero';
  end if;

  select coalesce(sum(amount), 0)
    into sourced_amount
    from public.sk_fund_sources
   where barangay_id = new.barangay_id
     and fiscal_year = new.fiscal_year;

  if sourced_amount <= 0 then
    raise exception 'Cannot allocate SK funds without a fund source for fiscal year %', new.fiscal_year;
  end if;

  select coalesce(sum(amount), 0)
    into other_allocations
    from public.sk_budget
   where barangay_id = new.barangay_id
     and fiscal_year = new.fiscal_year
     and id is distinct from new.id;

  if other_allocations + new.amount > sourced_amount then
    raise exception 'SK allocation exceeds available fund sources for fiscal year %', new.fiscal_year;
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.sk_expenses
   where sk_budget_id = new.id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses > new.amount then
    raise exception 'SK allocation cannot be lower than its recorded expenses';
  end if;

  return new;
end;
$$;

create or replace function public.validate_barangay_fund_source_totals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.assert_barangay_fiscal_year_funded(old.barangay_id, old.fiscal_year);
    return old;
  end if;

  perform public.assert_barangay_fiscal_year_funded(new.barangay_id, new.fiscal_year);
  if tg_op = 'UPDATE'
     and (old.barangay_id, old.fiscal_year) is distinct from (new.barangay_id, new.fiscal_year) then
    perform public.assert_barangay_fiscal_year_funded(old.barangay_id, old.fiscal_year);
  end if;
  return new;
end;
$$;

create or replace function public.validate_sk_fund_source_totals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.assert_sk_fiscal_year_funded(old.barangay_id, old.fiscal_year);
    return old;
  end if;

  perform public.assert_sk_fiscal_year_funded(new.barangay_id, new.fiscal_year);
  if tg_op = 'UPDATE'
     and (old.barangay_id, old.fiscal_year) is distinct from (new.barangay_id, new.fiscal_year) then
    perform public.assert_sk_fiscal_year_funded(old.barangay_id, old.fiscal_year);
  end if;
  return new;
end;
$$;

create or replace function public.validate_barangay_expense_funding()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  allocation_amount numeric(14,2);
  allocation_category text;
  allocation_year text;
  sourced_amount numeric(14,2);
  total_allocations numeric(14,2);
  committed_expenses numeric(14,2);
begin
  if new.budget_allocation_id is null then
    raise exception 'Expense must reference a budget allocation';
  end if;
  if new.amount <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  select amount, category, fiscal_year
    into allocation_amount, allocation_category, allocation_year
    from public.budget_allocations
   where id = new.budget_allocation_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'Expense must reference an allocation in the same barangay';
  end if;
  if new.category <> allocation_category then
    raise exception 'Expense category must match its budget allocation category';
  end if;

  select coalesce(sum(amount), 0)
    into sourced_amount
    from public.fund_sources
   where barangay_id = new.barangay_id
     and fiscal_year = allocation_year;
  select coalesce(sum(amount), 0)
    into total_allocations
    from public.budget_allocations
   where barangay_id = new.barangay_id
     and fiscal_year = allocation_year;
  if sourced_amount <= 0 or total_allocations > sourced_amount then
    raise exception 'Expense cannot be recorded because its fiscal year is not fully funded';
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.expenses
   where budget_allocation_id = new.budget_allocation_id
     and id is distinct from new.id
     and coalesce(status, 'recorded') <> 'voided';

  if coalesce(new.status, 'recorded') <> 'voided'
     and committed_expenses + new.amount > allocation_amount then
    raise exception 'Expense exceeds the selected budget allocation';
  end if;
  return new;
end;
$$;

create or replace function public.validate_sk_expense_funding()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  allocation_amount numeric(14,2);
  allocation_category text;
  allocation_year text;
  sourced_amount numeric(14,2);
  total_allocations numeric(14,2);
  committed_expenses numeric(14,2);
begin
  if new.sk_budget_id is null then
    raise exception 'SK expense must reference an SK budget allocation';
  end if;
  if new.amount <= 0 then
    raise exception 'SK expense amount must be greater than zero';
  end if;

  select amount, category, fiscal_year
    into allocation_amount, allocation_category, allocation_year
    from public.sk_budget
   where id = new.sk_budget_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'SK expense must reference an allocation in the same barangay';
  end if;
  if new.category <> allocation_category then
    raise exception 'SK expense category must match its budget allocation category';
  end if;

  select coalesce(sum(amount), 0)
    into sourced_amount
    from public.sk_fund_sources
   where barangay_id = new.barangay_id
     and fiscal_year = allocation_year;
  select coalesce(sum(amount), 0)
    into total_allocations
    from public.sk_budget
   where barangay_id = new.barangay_id
     and fiscal_year = allocation_year;
  if sourced_amount <= 0 or total_allocations > sourced_amount then
    raise exception 'SK expense cannot be recorded because its fiscal year is not fully funded';
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.sk_expenses
   where sk_budget_id = new.sk_budget_id
     and id is distinct from new.id
     and coalesce(status, 'recorded') <> 'voided';

  if coalesce(new.status, 'recorded') <> 'voided'
     and committed_expenses + new.amount > allocation_amount then
    raise exception 'SK expense exceeds the selected budget allocation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_allocation_funding on public.budget_allocations;
drop trigger if exists validate_barangay_allocation_funding on public.budget_allocations;
create trigger validate_barangay_allocation_funding
before insert or update on public.budget_allocations
for each row execute function public.validate_barangay_allocation_funding();

drop trigger if exists validate_sk_allocation_funding on public.sk_budget;
create trigger validate_sk_allocation_funding
before insert or update on public.sk_budget
for each row execute function public.validate_sk_allocation_funding();

drop trigger if exists validate_barangay_fund_source_totals on public.fund_sources;
create trigger validate_barangay_fund_source_totals
after insert or update or delete on public.fund_sources
for each row execute function public.validate_barangay_fund_source_totals();

drop trigger if exists validate_sk_fund_source_totals on public.sk_fund_sources;
create trigger validate_sk_fund_source_totals
after insert or update or delete on public.sk_fund_sources
for each row execute function public.validate_sk_fund_source_totals();

drop trigger if exists validate_expense_budget on public.expenses;
create trigger validate_expense_budget
before insert or update on public.expenses
for each row execute function public.validate_barangay_expense_funding();

drop trigger if exists validate_sk_expense_budget on public.sk_expenses;
create trigger validate_sk_expense_budget
before insert or update on public.sk_expenses
for each row execute function public.validate_sk_expense_funding();

commit;
