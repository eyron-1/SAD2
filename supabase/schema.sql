
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

-- Helper: any active official belonging to a given barangay
create or replace function belongs_to_barangay(uid uuid, bgy uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles where id = uid and barangay_id = bgy and is_active
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
  start_date date,
  end_date date,
  status text default 'planned',
  beneficiaries_count integer default 0,
  beneficiary_category text default 'General Residents',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
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
  start_date date,
  end_date date,
  status text default 'planned',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- SK EXPENSES
-- ------------------------------------------------------------
create table sk_expenses (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  sk_budget_id uuid references sk_budget(id),
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
-- KATIPUNAN NG KABATAAN (KK) MONITORING
-- ------------------------------------------------------------
create table kk_monitoring (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid references barangays(id) on delete cascade not null,
  kk_name text not null,
  age integer check (age >= 15 and age <= 30),
  purok text,
  sk_program_id uuid references sk_programs(id),
  participation_status text default 'registered',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

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
create policy "editors update barangays" on barangays for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), id));

-- profiles
create policy "public read active officials" on profiles for select using (is_active = true);
create policy "users create own profile" on profiles for insert with check (id = auth.uid());
create policy "users update own profile" on profiles for update using (id = auth.uid());
create policy "editors update other profiles" on profiles for update using ((is_barangay_editor(auth.uid()) or is_sk_editor(auth.uid())) and belongs_to_barangay(auth.uid(), barangay_id));

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
create policy "officials write programs" on programs for insert with check (belongs_to_barangay(auth.uid(), barangay_id));
create policy "editors update programs" on programs for update using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
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
create policy "sk officials write sk_programs" on sk_programs for insert with check (belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors update sk_programs" on sk_programs for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_programs" on sk_programs for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- sk_expenses
create policy "public read sk_expenses" on sk_expenses for select using (true);
create policy "sk editors write sk_expenses" on sk_expenses for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_sk_editor(auth.uid()));
create policy "sk editors update sk_expenses" on sk_expenses for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_expenses" on sk_expenses for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

-- kk_monitoring (internal, not public)
create policy "sk officials read kk" on kk_monitoring for select using (belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk officials write kk" on kk_monitoring for insert with check (belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors update kk" on kk_monitoring for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete kk" on kk_monitoring for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

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