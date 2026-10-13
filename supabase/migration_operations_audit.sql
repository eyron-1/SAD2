-- Additive operations and accountability features. Apply after schema.sql and
-- the existing security/financial workflow migrations. This preserves data.

begin;

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_table text not null,
  record_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_barangay_created_idx
  on public.audit_logs (barangay_id, created_at desc);

create table if not exists public.approval_requests (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  request_type text not null check (request_type in ('budget', 'expense', 'procurement', 'document', 'other')),
  title text not null check (length(trim(title)) between 1 and 200),
  details text not null check (length(trim(details)) between 1 and 5000),
  amount numeric(14,2) check (amount is null or amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists approval_requests_barangay_status_idx
  on public.approval_requests (barangay_id, status, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  related_type text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create unique index if not exists programs_id_barangay_uidx
  on public.programs (id, barangay_id);

create table if not exists public.program_milestones (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  program_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 200),
  due_date date,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'complete', 'blocked')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint program_milestones_program_barangay_fk
    foreign key (program_id, barangay_id)
    references public.programs (id, barangay_id) on delete cascade
);

create table if not exists public.activity_calendar (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint activity_calendar_time_range_check check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  item_name text not null check (length(trim(item_name)) between 1 and 200),
  category text not null,
  quantity numeric(12,2) not null default 1 check (quantity >= 0),
  unit text not null default 'unit',
  condition text not null default 'good' check (condition in ('new', 'good', 'fair', 'poor', 'disposed')),
  location text,
  acquired_on date,
  estimated_value numeric(14,2) not null default 0 check (estimated_value >= 0),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.disaster_incidents (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  incident_type text not null,
  status text not null default 'active' check (status in ('active', 'response', 'recovery', 'closed')),
  incident_date date not null default current_date,
  location text,
  details text,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint disaster_incidents_id_barangay_unique unique (id, barangay_id)
);

create table if not exists public.relief_distributions (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  incident_id uuid,
  item_name text not null check (length(trim(item_name)) between 1 and 200),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'pack',
  distributed_on date not null default current_date,
  location text,
  notes text,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint relief_incident_barangay_fk foreign key (incident_id, barangay_id)
    references public.disaster_incidents (id, barangay_id)
);

create table if not exists public.official_documents (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  document_type text not null check (document_type in ('minutes', 'resolution', 'ordinance', 'memo', 'report', 'other')),
  document_date date,
  summary text,
  document_url text check (document_url is null or document_url ~ '^https?://'),
  is_public boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.expenses
  add column if not exists receipt_verified_at timestamptz,
  add column if not exists receipt_verified_by uuid references public.profiles(id);
alter table public.sk_expenses
  add column if not exists receipt_verified_at timestamptz,
  add column if not exists receipt_verified_by uuid references public.profiles(id);

alter table public.audit_logs enable row level security;
alter table public.approval_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.program_milestones enable row level security;
alter table public.activity_calendar enable row level security;
alter table public.inventory_items enable row level security;
alter table public.disaster_incidents enable row level security;
alter table public.relief_distributions enable row level security;
alter table public.official_documents enable row level security;

drop policy if exists "members read audit logs" on public.audit_logs;
create policy "members read audit logs" on public.audit_logs for select
  using (belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "members read approval requests" on public.approval_requests;
create policy "members read approval requests" on public.approval_requests for select
  using (created_by = auth.uid() or (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id)));
drop policy if exists "members submit approval requests" on public.approval_requests;
create policy "members submit approval requests" on public.approval_requests for insert
  with check (created_by = auth.uid() and belongs_to_barangay(auth.uid(), barangay_id));
drop policy if exists "editors decide approval requests" on public.approval_requests;
create policy "editors decide approval requests" on public.approval_requests for update
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select
  using (user_id = auth.uid() and belongs_to_barangay(auth.uid(), barangay_id));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications for update
  using (user_id = auth.uid() and belongs_to_barangay(auth.uid(), barangay_id))
  with check (user_id = auth.uid() and belongs_to_barangay(auth.uid(), barangay_id));

create or replace function public.protect_notification_fields()
returns trigger language plpgsql security invoker as $$
begin
  new.id := old.id;
  new.barangay_id := old.barangay_id;
  new.user_id := old.user_id;
  new.title := old.title;
  new.message := old.message;
  new.related_type := old.related_type;
  new.related_id := old.related_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_notification_fields on public.notifications;
create trigger protect_notification_fields before update on public.notifications
for each row execute function public.protect_notification_fields();

drop policy if exists "public read program milestones" on public.program_milestones;
create policy "public read program milestones" on public.program_milestones for select using (true);
drop policy if exists "editors manage program milestones" on public.program_milestones;
create policy "editors manage program milestones" on public.program_milestones for all
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "public read public activities" on public.activity_calendar;
create policy "public read public activities" on public.activity_calendar for select using (is_public);
drop policy if exists "editors manage activities" on public.activity_calendar;
create policy "editors manage activities" on public.activity_calendar for all
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "members read inventory" on public.inventory_items;
create policy "members read inventory" on public.inventory_items for select
  using (belongs_to_barangay(auth.uid(), barangay_id));
drop policy if exists "editors manage inventory" on public.inventory_items;
create policy "editors manage inventory" on public.inventory_items for all
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "public read public incidents" on public.disaster_incidents;
create policy "public read public incidents" on public.disaster_incidents for select using (is_public);
drop policy if exists "members read private incidents" on public.disaster_incidents;
create policy "members read private incidents" on public.disaster_incidents for select
  using (belongs_to_barangay(auth.uid(), barangay_id));
drop policy if exists "editors manage incidents" on public.disaster_incidents;
create policy "editors manage incidents" on public.disaster_incidents for all
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "public read public relief distributions" on public.relief_distributions;
create policy "public read public relief distributions" on public.relief_distributions for select using (is_public);
drop policy if exists "members read private relief distributions" on public.relief_distributions;
create policy "members read private relief distributions" on public.relief_distributions for select
  using (belongs_to_barangay(auth.uid(), barangay_id));
drop policy if exists "editors manage relief distributions" on public.relief_distributions;
create policy "editors manage relief distributions" on public.relief_distributions for all
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

drop policy if exists "public read public documents" on public.official_documents;
create policy "public read public documents" on public.official_documents for select using (is_public);
drop policy if exists "members read private documents" on public.official_documents;
create policy "members read private documents" on public.official_documents for select
  using (belongs_to_barangay(auth.uid(), barangay_id));
drop policy if exists "editors manage documents" on public.official_documents;
create policy "editors manage documents" on public.official_documents for all
  using (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id))
  with check (is_barangay_editor(auth.uid()) and belongs_to_barangay(auth.uid(), barangay_id));

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_data jsonb;
begin
  if tg_op = 'INSERT' then
    new_row := to_jsonb(new);
    row_data := new_row;
  elsif tg_op = 'UPDATE' then
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);
    row_data := new_row;
  else
    old_row := to_jsonb(old);
    row_data := old_row;
  end if;

  insert into public.audit_logs (
    barangay_id, actor_id, actor_role, action, entity_table, record_id, before_data, after_data
  ) values (
    (row_data->>'barangay_id')::uuid,
    auth.uid(),
    (select role::text from public.profiles where id = auth.uid()),
    tg_op,
    tg_table_name,
    row_data->>'id',
    old_row,
    new_row
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'fund_sources', 'budget_allocations', 'expenses', 'programs', 'sk_fund_sources',
    'sk_budget', 'sk_expenses', 'sk_programs', 'approval_requests', 'program_milestones',
    'activity_calendar', 'inventory_items', 'disaster_incidents', 'relief_distributions',
    'official_documents'
  ] loop
    execute format('drop trigger if exists audit_row_change on public.%I', table_name);
    execute format(
      'create trigger audit_row_change after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.notify_approval_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.status := 'pending';
    new.decision_note := null;
    new.decided_by := null;
    new.decided_at := null;
    insert into public.notifications (barangay_id, user_id, title, message, related_type, related_id)
    select new.barangay_id, p.id, 'Approval request submitted', new.title, 'approval_request', new.id
      from public.profiles p
     where p.barangay_id = new.barangay_id
       and p.is_active
       and p.role in ('captain', 'secretary', 'treasurer')
       and p.id <> new.created_by;
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'A decided approval request cannot be changed';
  end if;
  if new.status not in ('approved', 'rejected') then
    raise exception 'Approval requests can only be approved or rejected';
  end if;

  new.id := old.id;
  new.barangay_id := old.barangay_id;
  new.created_by := old.created_by;
  new.request_type := old.request_type;
  new.title := old.title;
  new.details := old.details;
  new.amount := old.amount;
  new.created_at := old.created_at;
  new.decided_by := auth.uid();
  new.decided_at := now();

  insert into public.notifications (barangay_id, user_id, title, message, related_type, related_id)
  values (
    new.barangay_id,
    new.created_by,
    'Approval request ' || new.status,
    new.title || coalesce(': ' || nullif(new.decision_note, ''), ''),
    'approval_request',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists notify_approval_activity on public.approval_requests;
create trigger notify_approval_activity before insert or update on public.approval_requests
for each row execute function public.notify_approval_activity();

grant select on public.audit_logs to authenticated;
grant select, insert, update on public.approval_requests to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.program_milestones, public.activity_calendar,
  public.inventory_items, public.disaster_incidents, public.relief_distributions,
  public.official_documents to authenticated;
grant select on public.program_milestones, public.activity_calendar,
  public.disaster_incidents, public.relief_distributions, public.official_documents
  to anon, authenticated;

commit;