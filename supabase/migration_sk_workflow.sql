

alter table barangays add column if not exists sk_logo_url text;
alter table sk_programs add column if not exists category text;
alter table feedback add column if not exists addressed_to text not null default 'barangay';
alter table feedback drop constraint if exists feedback_addressed_to_check;
alter table feedback add constraint feedback_addressed_to_check check (addressed_to in ('barangay', 'sk'));

create table if not exists sk_fund_sources (
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

create table if not exists sk_expenses (
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

alter table sk_fund_sources enable row level security;
alter table sk_expenses enable row level security;

drop policy if exists "public read sk_fund_sources" on sk_fund_sources;
drop policy if exists "sk editors write sk_fund_sources" on sk_fund_sources;
drop policy if exists "sk editors update sk_fund_sources" on sk_fund_sources;
drop policy if exists "sk editors delete sk_fund_sources" on sk_fund_sources;
create policy "public read sk_fund_sources" on sk_fund_sources for select using (true);
create policy "sk editors write sk_fund_sources" on sk_fund_sources for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_sk_editor(auth.uid()));
create policy "sk editors update sk_fund_sources" on sk_fund_sources for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_fund_sources" on sk_fund_sources for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "public read sk_expenses" on sk_expenses;
drop policy if exists "sk editors write sk_expenses" on sk_expenses;
drop policy if exists "sk editors update sk_expenses" on sk_expenses;
drop policy if exists "sk editors delete sk_expenses" on sk_expenses;
create policy "public read sk_expenses" on sk_expenses for select using (true);
create policy "sk editors write sk_expenses" on sk_expenses for insert with check (belongs_to_barangay(auth.uid(), barangay_id) and is_sk_editor(auth.uid()));
create policy "sk editors update sk_expenses" on sk_expenses for update using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
create policy "sk editors delete sk_expenses" on sk_expenses for delete using (is_sk_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));
