-- Keep project allocation references within the owning barangay.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'budget_allocations_id_barangay_unique'
       and conrelid = 'public.budget_allocations'::regclass
  ) then
    alter table public.budget_allocations
      add constraint budget_allocations_id_barangay_unique unique (id, barangay_id);
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'programs_budget_allocation_same_barangay'
       and conrelid = 'public.programs'::regclass
  ) then
    alter table public.programs
      add constraint programs_budget_allocation_same_barangay
      foreign key (budget_allocation_id, barangay_id)
      references public.budget_allocations (id, barangay_id);
  end if;
end;
$$;