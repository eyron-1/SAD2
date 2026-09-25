-- Financial integrity safeguards for barangay and SK transparency records.
-- Run after schema.sql (or against an existing Supabase project).

alter table budget_allocations
  add constraint budget_allocations_id_barangay_unique unique (id, barangay_id);

alter table sk_budget
  add constraint sk_budget_id_barangay_unique unique (id, barangay_id);

alter table expenses
  add constraint expenses_budget_allocation_same_barangay
  foreign key (budget_allocation_id, barangay_id)
  references budget_allocations (id, barangay_id);

alter table sk_expenses
  add constraint sk_expenses_budget_same_barangay
  foreign key (sk_budget_id, barangay_id)
  references sk_budget (id, barangay_id);

alter table expenses
  add constraint expenses_status_check
  check (status in ('recorded', 'verified', 'voided'));

alter table sk_expenses
  add constraint sk_expenses_status_check
  check (status in ('recorded', 'verified', 'voided'));

create or replace function protect_financial_audit_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.status := coalesce(new.status, 'recorded');
  else
    new.created_by := old.created_by;
    new.status := old.status;
  end if;
  return new;
end;
$$;

create or replace function validate_barangay_expense()
returns trigger
language plpgsql
security invoker
as $$
declare
  allocation_amount numeric(14,2);
  allocation_category text;
  active_expenses numeric(14,2);
begin
  select amount, category
    into allocation_amount, allocation_category
    from budget_allocations
   where id = new.budget_allocation_id
     and barangay_id = new.barangay_id;

  if not found then
    raise exception 'Expense must reference an allocation in the same barangay';
  end if;

  if new.category <> allocation_category then
    raise exception 'Expense category must match its budget allocation category';
  end if;

  select coalesce(sum(amount), 0)
    into active_expenses
    from expenses
   where budget_allocation_id = new.budget_allocation_id
     and id <> new.id
     and status <> 'voided';

  if new.status <> 'voided' and active_expenses + new.amount > allocation_amount then
    raise exception 'Expense exceeds the selected budget allocation';
  end if;

  return new;
end;
$$;

create or replace function validate_sk_expense()
returns trigger
language plpgsql
security invoker
as $$
declare
  allocation_amount numeric(14,2);
  allocation_category text;
  active_expenses numeric(14,2);
begin
  select amount, category
    into allocation_amount, allocation_category
    from sk_budget
   where id = new.sk_budget_id
     and barangay_id = new.barangay_id;

  if not found then
    raise exception 'SK expense must reference an allocation in the same barangay';
  end if;

  if new.category <> allocation_category then
    raise exception 'SK expense category must match its budget allocation category';
  end if;

  select coalesce(sum(amount), 0)
    into active_expenses
    from sk_expenses
   where sk_budget_id = new.sk_budget_id
     and id <> new.id
     and status <> 'voided';

  if new.status <> 'voided' and active_expenses + new.amount > allocation_amount then
    raise exception 'SK expense exceeds the selected budget allocation';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_expense_audit_fields on expenses;
create trigger protect_expense_audit_fields
before insert or update on expenses
for each row execute function protect_financial_audit_fields();

drop trigger if exists validate_expense_budget on expenses;
create trigger validate_expense_budget
before insert or update on expenses
for each row execute function validate_barangay_expense();

drop trigger if exists protect_sk_expense_audit_fields on sk_expenses;
create trigger protect_sk_expense_audit_fields
before insert or update on sk_expenses
for each row execute function protect_financial_audit_fields();

drop trigger if exists validate_sk_expense_budget on sk_expenses;
create trigger validate_sk_expense_budget
before insert or update on sk_expenses
for each row execute function validate_sk_expense();
