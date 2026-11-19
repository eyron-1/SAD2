-- Cap program-linked expense totals at each program's own budget.
-- Run after migration_expense_program_links.sql.

create or replace function public.validate_program_expense_budget()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  program_budget numeric(14,2);
  committed_expenses numeric(14,2);
begin
  if tg_op = 'UPDATE'
     and new.program_id is not distinct from old.program_id
     and new.amount = old.amount then
    return new;
  end if;

  if new.program_id is null or coalesce(new.status, 'recorded') = 'voided' then
    return new;
  end if;

  select coalesce(budget_amount, 0)
    into program_budget
    from public.programs
   where id = new.program_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'Expense must reference a project in the same barangay';
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.expenses
   where program_id = new.program_id
     and barangay_id = new.barangay_id
     and id <> new.id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses + new.amount > program_budget then
    raise exception 'Expense exceeds the selected project budget';
  end if;

  return new;
end;
$$;

create or replace function public.validate_sk_program_expense_budget()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  program_budget numeric(14,2);
  committed_expenses numeric(14,2);
begin
  if tg_op = 'UPDATE'
     and new.sk_program_id is not distinct from old.sk_program_id
     and new.amount = old.amount then
    return new;
  end if;

  if new.sk_program_id is null or coalesce(new.status, 'recorded') = 'voided' then
    return new;
  end if;

  select coalesce(budget_amount, 0)
    into program_budget
    from public.sk_programs
   where id = new.sk_program_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'SK expense must reference a project in the same barangay';
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.sk_expenses
   where sk_program_id = new.sk_program_id
     and barangay_id = new.barangay_id
     and id <> new.id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses + new.amount > program_budget then
    raise exception 'SK expense exceeds the selected project budget';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_program_budget_below_expenses()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  committed_expenses numeric(14,2);
begin
  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.expenses
   where program_id = old.id
     and barangay_id = old.barangay_id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses > coalesce(new.budget_amount, 0) then
    raise exception 'Project budget cannot be lower than its recorded expenses';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_sk_program_budget_below_expenses()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  committed_expenses numeric(14,2);
begin
  select coalesce(sum(amount), 0)
    into committed_expenses
    from public.sk_expenses
   where sk_program_id = old.id
     and barangay_id = old.barangay_id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses > coalesce(new.budget_amount, 0) then
    raise exception 'SK project budget cannot be lower than its recorded expenses';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_program_expense_budget on public.expenses;
create trigger validate_program_expense_budget
before insert or update of program_id, amount on public.expenses
for each row execute function public.validate_program_expense_budget();

drop trigger if exists validate_sk_program_expense_budget on public.sk_expenses;
create trigger validate_sk_program_expense_budget
before insert or update of sk_program_id, amount on public.sk_expenses
for each row execute function public.validate_sk_program_expense_budget();

drop trigger if exists prevent_program_budget_below_expenses on public.programs;
create trigger prevent_program_budget_below_expenses
before update of budget_amount on public.programs
for each row execute function public.prevent_program_budget_below_expenses();

drop trigger if exists prevent_sk_program_budget_below_expenses on public.sk_programs;
create trigger prevent_sk_program_budget_below_expenses
before update of budget_amount on public.sk_programs
for each row execute function public.prevent_sk_program_budget_below_expenses();
