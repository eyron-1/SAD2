
drop table if exists ai_conversations cascade;
drop table if exists officials_transitions cascade;
drop table if exists feedback cascade;
drop table if exists kk_monitoring cascade;
drop table if exists sk_programs cascade;
drop table if exists sk_budget cascade;
drop table if exists sk_fund_sources cascade;
drop table if exists programs cascade;
drop table if exists expenses cascade;
drop table if exists sk_expenses cascade;
drop table if exists budget_allocations cascade;
drop table if exists fund_sources cascade;
drop table if exists profiles cascade;
drop table if exists barangays cascade;

drop function if exists is_barangay_editor(uuid) cascade;
drop function if exists is_sk_editor(uuid) cascade;
drop function if exists belongs_to_barangay(uuid, uuid) cascade;

drop type if exists official_role cascade;

create extension if not exists "uuid-ossp";
create extension if not exists unaccent;

-- ------------------------------------------------------------
-- TENANTS
-- ------------------------------------------------------------
create table barangays (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  municipality text,
  province text,
  logo_url text,
  sk_logo_url text,
  contact_email text,
  contact_number text,
  created_at timestamptz default now()
);

create or replace function generate_barangay_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug := trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(new.name, '') || ' ' || coalesce(new.municipality, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
  return new;
end;
$$;

create trigger barangays_generate_slug
before insert or update of name, municipality on barangays
for each row execute function generate_barangay_slug();

-- ------------------------------------------------------------
-- ROLES
-- captain / secretary / treasurer  -> full edit rights (barangay)
-- kagawad / staff                  -> view + limited create
-- sk_chairperson / sk_treasurer    -> full edit rights (SK)
-- sk_kagawad                       -> view + limited create (SK)
-- ------------------------------------------------------------
create type official_role as enum (
  'captain', 'secretary', 'treasurer', 'kagawad', 'staff',
  'sk_chairperson', 'sk_treasurer', 'sk_kagawad'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  barangay_id uuid references barangays(id) on delete cascade not null,
  full_name text not null,
  role official_role not null,
  position_title text,
  contact_number text,
  photo_url text,
  is_active boolean default true,
  term_start date,
  term_end date,
  created_at timestamptz default now()
);

-- Helper: roles allowed to edit barangay-level financial/program data
create or replace function is_barangay_editor(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles
    where id = uid and role in ('captain','secretary','treasurer') and is_active
  );
$$;

-- Helper: roles allowed to edit SK data
create or replace function is_sk_editor(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles
    where id = uid and role in ('sk_chairperson','sk_treasurer') and is_active
  );
$$;

create or replace function public.can_access_kk_id_documents(target_barangay text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from profiles
     where id = auth.uid()
       and barangay_id::text = target_barangay
       and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
       and is_active
  );
$$;
revoke all on function public.can_access_kk_id_documents(text) from public;
grant execute on function public.can_access_kk_id_documents(text) to anon, authenticated;

create or replace function public.can_upload_kk_id_documents(target_barangay text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.barangays
     where id::text = target_barangay
  );
$$;
revoke all on function public.can_upload_kk_id_documents(text) from public;
grant execute on function public.can_upload_kk_id_documents(text) to anon, authenticated;

-- Helper: any active official belonging to a given barangay
create or replace function belongs_to_barangay(uid uuid, bgy uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles where id = uid and barangay_id = bgy and is_active
  );
$$;

create or replace function is_empty_barangay(bgy uuid)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from profiles where barangay_id = bgy);
$$;

create or replace function is_sk_role_available(bgy uuid, requested_role text)
returns boolean language sql security definer set search_path = public as $$
  select requested_role in ('sk_chairperson', 'sk_treasurer')
    and not exists (
      select 1 from profiles
      where barangay_id = bgy
        and role::text = requested_role
        and is_active
    );
$$;

create or replace function is_barangay_role_available(bgy uuid, requested_role text)
returns boolean language sql security definer set search_path = public as $$
  select requested_role in ('captain', 'secretary', 'treasurer')
    and not exists (
      select 1 from profiles
      where barangay_id = bgy
        and role::text = requested_role
        and is_active
    );
$$;

-- ------------------------------------------------------------
-- FUND SOURCING
-- ------------------------------------------------------------
create table fund_sources (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  name text not null,
  source_type text not null,
  amount numeric(14,2) not null check (amount >= 0),
  fiscal_year text not null,
  received_date date,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- BUDGET ALLOCATION
-- ------------------------------------------------------------
create table budget_allocations (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  fiscal_year text not null,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- EXPENSES
-- ------------------------------------------------------------
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  budget_allocation_id uuid references budget_allocations(id),
  program_id uuid,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  date_incurred date not null,
  receipt_url text,
  status text default 'recorded',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- PROGRAM MANAGEMENT (barangay-level)
-- ------------------------------------------------------------
create table programs (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  title text not null,
  description text,
  category text,
  budget_amount numeric(14,2) default 0,
  budget_allocation_id uuid,
  start_date date,
  end_date date,
  status text default 'planned',
  beneficiaries_count integer default 0,
  beneficiary_category text default 'General Residents',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  constraint programs_id_barangay_unique unique (id, barangay_id),
  constraint programs_budget_amount_check check (budget_amount >= 0 and budget_amount <= 999999999999.99),
  constraint programs_status_check check (status in ('planned', 'ongoing', 'completed', 'cancelled')),
  constraint programs_date_range_check check (end_date is null or start_date is null or end_date >= start_date),
  constraint programs_content_limits_check check (
    length(trim(title)) between 1 and 200
    and coalesce(length(description), 0) <= 5000
    and coalesce(length(category), 0) <= 120
    and coalesce(length(beneficiary_category), 0) between 1 and 120
    and beneficiaries_count >= 0
  )
);

-- Migration for existing databases:
-- alter table programs add column if not exists beneficiary_category text default 'General Residents';

-- ------------------------------------------------------------
-- SK BUDGET + PROGRAMS
-- ------------------------------------------------------------
create table sk_fund_sources (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  name text not null,
  source_type text not null,
  amount numeric(14,2) not null check (amount >= 0),
  fiscal_year text not null,
  received_date date,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table sk_budget (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  fiscal_year text not null,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table sk_programs (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  title text not null,
  description text,
  category text,
  budget_amount numeric(14,2) default 0,
  sk_budget_id uuid,
  start_date date,
  end_date date,
  status text default 'planned',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  constraint sk_programs_id_barangay_unique unique (id, barangay_id),
  constraint sk_programs_budget_amount_check check (budget_amount >= 0 and budget_amount <= 999999999999.99),
  constraint sk_programs_status_check check (status in ('planned', 'ongoing', 'completed', 'cancelled')),
  constraint sk_programs_date_range_check check (end_date is null or start_date is null or end_date >= start_date),
  constraint sk_programs_content_limits_check check (
    length(trim(title)) between 1 and 200
    and coalesce(length(description), 0) <= 5000
    and coalesce(length(category), 0) <= 120
  )
);

-- ------------------------------------------------------------
-- SK EXPENSES
-- ------------------------------------------------------------
create table sk_expenses (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  sk_budget_id uuid references sk_budget(id),
  sk_program_id uuid,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  date_incurred date not null,
  receipt_url text,
  status text default 'recorded',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table expenses
  add constraint expenses_program_same_barangay
  foreign key (program_id, barangay_id)
  references programs (id, barangay_id);

alter table sk_expenses
  add constraint sk_expenses_program_same_barangay
  foreign key (sk_program_id, barangay_id)
  references sk_programs (id, barangay_id);

create index expenses_program_barangay_idx
  on expenses (program_id, barangay_id);
create index sk_expenses_program_barangay_idx
  on sk_expenses (sk_program_id, barangay_id);

create or replace function validate_program_expense_budget()
returns trigger
language plpgsql
security invoker
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
    from programs
   where id = new.program_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'Expense must reference a project in the same barangay';
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from expenses
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

create or replace function validate_sk_program_expense_budget()
returns trigger
language plpgsql
security invoker
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
    from sk_programs
   where id = new.sk_program_id
     and barangay_id = new.barangay_id
   for update;

  if not found then
    raise exception 'SK expense must reference a project in the same barangay';
  end if;

  select coalesce(sum(amount), 0)
    into committed_expenses
    from sk_expenses
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

create or replace function prevent_program_budget_below_expenses()
returns trigger
language plpgsql
security invoker
as $$
declare
  committed_expenses numeric(14,2);
begin
  select coalesce(sum(amount), 0)
    into committed_expenses
    from expenses
   where program_id = old.id
     and barangay_id = old.barangay_id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses > coalesce(new.budget_amount, 0) then
    raise exception 'Project budget cannot be lower than its recorded expenses';
  end if;

  return new;
end;
$$;

create or replace function prevent_sk_program_budget_below_expenses()
returns trigger
language plpgsql
security invoker
as $$
declare
  committed_expenses numeric(14,2);
begin
  select coalesce(sum(amount), 0)
    into committed_expenses
    from sk_expenses
   where sk_program_id = old.id
     and barangay_id = old.barangay_id
     and coalesce(status, 'recorded') <> 'voided';

  if committed_expenses > coalesce(new.budget_amount, 0) then
    raise exception 'SK project budget cannot be lower than its recorded expenses';
  end if;

  return new;
end;
$$;

create trigger validate_program_expense_budget
before insert or update of program_id, amount on expenses
for each row execute function validate_program_expense_budget();

create trigger validate_sk_program_expense_budget
before insert or update of sk_program_id, amount on sk_expenses
for each row execute function validate_sk_program_expense_budget();

create trigger prevent_program_budget_below_expenses
before update of budget_amount on programs
for each row execute function prevent_program_budget_below_expenses();

create trigger prevent_sk_program_budget_below_expenses
before update of budget_amount on sk_programs
for each row execute function prevent_sk_program_budget_below_expenses();

-- ------------------------------------------------------------
-- KATIPUNAN NG KABATAAN (KK) MONITORING
-- ------------------------------------------------------------
create table kk_monitoring (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  kk_name text not null,
  age integer check (age >= 15 and age <= 30),
  sex text,
  purok text,
  contact_number text,
  education_level text,
  employment_status text,
  youth_classification text,
  sk_program_id uuid references sk_programs(id),
  participation_status text default 'registered',
  profile_status text not null default 'pending_review' check (profile_status in ('pending_review', 'verified', 'rejected')),
  consent_given boolean not null default false,
  guardian_consent boolean not null default false,
  id_document_path text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
grant insert on table kk_monitoring to anon, authenticated;

-- ------------------------------------------------------------
-- COMMUNITY FEEDBACK (public can submit without an account)
-- ------------------------------------------------------------
create table feedback (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  addressed_to text not null default 'barangay' check (addressed_to in ('barangay', 'sk')),
  resident_name text not null,
  contact_number text,
  category text not null,
  message text not null,
  photo_urls text[] default '{}',
  status text default 'new',
  official_response text,
  responded_by uuid references profiles(id),
  responded_at timestamptz,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- OFFICIALS TRANSITION (election handover trail)
-- ------------------------------------------------------------
create table officials_transitions (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  position_title text not null,
  outgoing_official_id uuid references profiles(id),
  incoming_official_id uuid references profiles(id),
  term_start date not null,
  term_end date,
  transition_date date default current_date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- AI ASSISTANT CONVERSATION LOG
-- ------------------------------------------------------------
create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  user_id uuid references profiles(id),
  mode text not null,
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

create or replace function protect_program_audit_fields()
returns trigger language plpgsql security invoker as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.barangay_id := old.barangay_id;
  end if;
  return new;
end;
$$;

create trigger protect_program_audit_fields
before insert or update on programs
for each row execute function protect_program_audit_fields();

create trigger protect_sk_program_audit_fields
before insert or update on sk_programs
for each row execute function protect_program_audit_fields();

create or replace function protect_profile_privilege_fields()
returns trigger language plpgsql security invoker as $$
begin
  if old.id = auth.uid() then
    new.role := old.role;
    new.barangay_id := old.barangay_id;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger protect_profile_privilege_fields
before update on profiles
for each row execute function protect_profile_privilege_fields();

alter table barangays enable row level security;
alter table profiles enable row level security;
alter table fund_sources enable row level security;
alter table budget_allocations enable row level security;
alter table expenses enable row level security;
alter table sk_expenses enable row level security;
alter table programs enable row level security;
alter table sk_budget enable row level security;
alter table sk_programs enable row level security;
alter table sk_fund_sources enable row level security;
alter table kk_monitoring enable row level security;
alter table feedback enable row level security;
alter table officials_transitions enable row level security;
alter table ai_conversations enable row level security;

-- barangays
create policy "public read barangays" on barangays for select using (true);
create policy "authenticated users can create barangays" on barangays for insert to authenticated with check (true);
create policy "editors update barangays" on barangays for update using ((is_barangay_editor(auth.uid()) or is_sk_editor(auth.uid())) and belongs_to_barangay(auth.uid(), id));

-- profiles
create policy "public read active officials" on profiles for select using (is_active = true);
create policy "users create own profile" on profiles for insert with check (
  id = auth.uid()
  and (
    role in ('kagawad', 'staff', 'sk_kagawad')
      or (role in ('sk_chairperson', 'sk_treasurer') and is_sk_role_available(barangay_id, role::text))
      or (role in ('captain', 'secretary', 'treasurer') and is_barangay_role_available(barangay_id, role::text))
    or is_empty_barangay(barangay_id)
  )
);
create policy "users update own profile" on profiles for update using (id = auth.uid());
create policy "editors update other profiles" on profiles for update
  using ((is_barangay_editor(auth.uid()) or is_sk_editor(auth.uid())) and belongs_to_barangay(auth.uid(), barangay_id))
  with check ((is_barangay_editor(auth.uid()) or is_sk_editor(auth.uid())) and belongs_to_barangay(auth.uid(), barangay_id));

-- fund_sources
create policy "public read fund_sources" on fund_sources for select using (true);
create policy "editors write fund_sources" on fund_sources for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_barangay_editor(auth.uid()));
create policy "editors update fund_sources" on fund_sources for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors delete fund_sources" on fund_sources for delete using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- budget_allocations
create policy "public read budget_allocations" on budget_allocations for select using (true);
create policy "editors write budget_allocations" on budget_allocations for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_barangay_editor(auth.uid()));
create policy "editors update budget_allocations" on budget_allocations for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors delete budget_allocations" on budget_allocations for delete using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- expenses
create policy "public read expenses" on expenses for select using (true);
create policy "editors write expenses" on expenses for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_barangay_editor(auth.uid()));
create policy "editors update expenses" on expenses for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors delete expenses" on expenses for delete using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- programs
create policy "public read programs" on programs for select using (true);
create policy "editors write programs" on programs for insert with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors update programs" on programs for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id)) with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors delete programs" on programs for delete using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- sk_budget
-- sk_fund_sources
create policy "public read sk_fund_sources" on sk_fund_sources for select using (true);
create policy "sk editors write sk_fund_sources" on sk_fund_sources for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_sk_editor(auth.uid()));
create policy "sk editors update sk_fund_sources" on sk_fund_sources for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_fund_sources" on sk_fund_sources for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- sk_budget
create policy "public read sk_budget" on sk_budget for select using (true);
create policy "sk editors write sk_budget" on sk_budget for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_sk_editor(auth.uid()));
create policy "sk editors update sk_budget" on sk_budget for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_budget" on sk_budget for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- sk_programs
create policy "public read sk_programs" on sk_programs for select using (true);
create policy "sk editors write sk_programs" on sk_programs for insert with check (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors update sk_programs" on sk_programs for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id)) with check (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_programs" on sk_programs for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- sk_expenses
create policy "public read sk_expenses" on sk_expenses for select using (true);
create policy "sk editors write sk_expenses" on sk_expenses for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_sk_editor(auth.uid()));
create policy "sk editors update sk_expenses" on sk_expenses for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_expenses" on sk_expenses for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- kk_monitoring (internal, not public)
create policy "sk officials read kk" on kk_monitoring for select using (public.can_access_kk_id_documents(barangay_id::text));
create policy "sk officials write kk" on kk_monitoring for insert with check (public.can_access_kk_id_documents(barangay_id::text));
create policy "sk editors update kk" on kk_monitoring for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete kk" on kk_monitoring for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "public submit kk profiling" on kk_monitoring for insert with check (
  created_by is null
  and profile_status = 'pending_review'
  and participation_status = 'registered'
  and sk_program_id is null
  and notes is null
  and age between 15 and 30
  and id_document_path is not null
  and id_document_path ~ ('^' || barangay_id::text || '/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$')
  and consent_given
  and (age >= 18 or guardian_consent)
  and sex in ('female', 'male', 'prefer_not_to_say')
  and education_level in ('elementary', 'junior_high', 'senior_high', 'college', 'vocational', 'not_in_school')
  and employment_status in ('employed', 'self_employed', 'unemployed', 'not_applicable')
  and youth_classification in ('in_school', 'out_of_school', 'working', 'youth_with_disability', 'indigenous_youth', 'other')
);

-- feedback
create policy "anyone can submit feedback" on feedback for insert with check (true);
create policy "officials read feedback" on feedback for select using (belongs_to_barangay(auth.uid(), barangay_id));
create policy "officials respond feedback" on feedback for update using (belongs_to_barangay(auth.uid(), barangay_id));

-- officials_transitions
create policy "public read transitions" on officials_transitions for select using (true);
create policy "editors write transitions" on officials_transitions for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_barangay_editor(auth.uid()));
create policy "editors update transitions" on officials_transitions for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- ai_conversations
create policy "own ai conversations" on ai_conversations for select using (user_id = auth.uid());
create policy "insert own ai conversations" on ai_conversations for insert with check (user_id = auth.uid() and belongs_to_barangay(auth.uid(), barangay_id));
create policy "update own ai conversations" on ai_conversations for update using (user_id = auth.uid());

-- ------------------------------------------------------------
-- STORAGE — after running this, go to Storage in the sidebar and
-- create these 3 buckets manually, each set to "Public":
--   feedback-photos
--   receipts
--   barangay-logos
-- ------------------------------------------------------------