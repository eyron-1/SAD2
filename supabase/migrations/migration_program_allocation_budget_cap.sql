-- Reserve each linked project's budget from its selected allocation.
-- Run after migration_financial_workflow.sql.

begin;

create or replace function public.validate_program_allocation_budget()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  allocation_amount numeric(14,2);
  other_program_budgets numeric(14,2);
begin
  if new.budget_allocation_id is null then
    return new;
  end if;

  select amount
    into allocation_amount
    from public.budget_allocations
   where id = new.budget_allocation_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'Project must reference an allocation in the same barangay';
  end if;

  select coalesce(sum(budget_amount), 0)
    into other_program_budgets
    from public.programs
   where budget_allocation_id = new.budget_allocation_id
     and barangay_id = new.barangay_id
     and id is distinct from new.id;

  if other_program_budgets + coalesce(new.budget_amount, 0) > allocation_amount then
    raise exception 'Project budgets exceed the selected allocation balance';
  end if;

  return new;
end;
$$;

create or replace function public.validate_sk_program_allocation_budget()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  allocation_amount numeric(14,2);
  other_program_budgets numeric(14,2);
begin
  if new.sk_budget_id is null then
    return new;
  end if;

  select amount
    into allocation_amount
    from public.sk_budget
   where id = new.sk_budget_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'SK project must reference an allocation in the same barangay';
  end if;

  select coalesce(sum(budget_amount), 0)
    into other_program_budgets
    from public.sk_programs
   where sk_budget_id = new.sk_budget_id
     and barangay_id = new.barangay_id
     and id is distinct from new.id;

  if other_program_budgets + coalesce(new.budget_amount, 0) > allocation_amount then
    raise exception 'SK project budgets exceed the selected allocation balance';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_allocation_below_program_budgets()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  committed_program_budgets numeric(14,2);
begin
  select coalesce(sum(budget_amount), 0)
    into committed_program_budgets
    from public.programs
   where budget_allocation_id = old.id
     and barangay_id = old.barangay_id;

  if committed_program_budgets > coalesce(new.amount, 0) then
    raise exception 'Allocation cannot be lower than its linked project budgets';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_sk_allocation_below_program_budgets()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  committed_program_budgets numeric(14,2);
begin
  select coalesce(sum(budget_amount), 0)
    into committed_program_budgets
    from public.sk_programs
   where sk_budget_id = old.id
     and barangay_id = old.barangay_id;

  if committed_program_budgets > coalesce(new.amount, 0) then
    raise exception 'SK allocation cannot be lower than its linked project budgets';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_program_allocation_budget on public.programs;
create trigger validate_program_allocation_budget
before insert or update of budget_amount, budget_allocation_id on public.programs
for each row execute function public.validate_program_allocation_budget();

drop trigger if exists validate_sk_program_allocation_budget on public.sk_programs;
create trigger validate_sk_program_allocation_budget
before insert or update of budget_amount, sk_budget_id on public.sk_programs
for each row execute function public.validate_sk_program_allocation_budget();

drop trigger if exists prevent_allocation_below_program_budgets on public.budget_allocations;
create trigger prevent_allocation_below_program_budgets
before update of amount on public.budget_allocations
for each row execute function public.prevent_allocation_below_program_budgets();

drop trigger if exists prevent_sk_allocation_below_program_budgets on public.sk_budget;
create trigger prevent_sk_allocation_below_program_budgets
before update of amount on public.sk_budget
for each row execute function public.prevent_sk_allocation_below_program_budgets();

commit;
