-- Record authenticated changes to core barangay and SK records.
-- Apply after schema.sql and the existing profile/security migrations.

begin;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  barangay_id uuid not null,
  entity_table text not null,
  record_id text not null,
  scope text not null default 'barangay' check (scope in ('barangay', 'sk')),
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  actor_name text,
  actor_role text,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists actor_name text,
  add column if not exists scope text not null default 'barangay';
alter table public.audit_logs
  drop constraint if exists audit_logs_scope_check;
alter table public.audit_logs
  add constraint audit_logs_scope_check check (scope in ('barangay', 'sk'));

update public.audit_logs
   set scope = 'sk'
 where scope = 'barangay'
   and (
     entity_table in (
       'sk_fund_sources', 'sk_budget', 'sk_expenses', 'sk_programs', 'kk_monitoring'
     )
     or (
       entity_table = 'program_milestones'
       and coalesce(after_data->>'sk_program_id', before_data->>'sk_program_id') is not null
     )
     or (
       entity_table = 'officials_transitions'
       and coalesce(after_data->>'position_title', before_data->>'position_title') like 'SK %'
     )
     or (
       entity_table = 'feedback'
       and coalesce(after_data->>'addressed_to', before_data->>'addressed_to') = 'sk'
     )
     or (
       entity_table = 'profiles'
       and actor_role like 'sk_%'
     )
     or (entity_table = 'barangays' and actor_role like 'sk_%')
   );

create index if not exists audit_logs_barangay_created_idx
  on public.audit_logs (barangay_id, created_at desc, id desc);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

drop policy if exists "members read audit logs" on public.audit_logs;
drop policy if exists "read scoped audit logs" on public.audit_logs;
create policy "read scoped audit logs" on public.audit_logs for select
  using (
    belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (scope = 'sk') = exists (
        select 1
          from public.profiles
         where id = auth.uid()
           and barangay_id = audit_logs.barangay_id
           and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
           and is_active
      )
    )
  );

create or replace function public.capture_audit_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_row jsonb := '{}'::jsonb;
  new_row jsonb := '{}'::jsonb;
  old_safe jsonb := '{}'::jsonb;
  new_safe jsonb := '{}'::jsonb;
  before_changes jsonb := '{}'::jsonb;
  after_changes jsonb := '{}'::jsonb;
  target_row jsonb;
  target_barangay_id uuid;
  target_record_id text;
  target_scope text;
  actor_name_value text;
  actor_role_value text;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    old_row := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_row := to_jsonb(new);
  end if;
  target_row := case when tg_op = 'DELETE' then old_row else new_row end;
  target_record_id := target_row->>'id';
  target_barangay_id := case
    when tg_table_name = 'barangays' then (target_row->>'id')::uuid
    else (target_row->>'barangay_id')::uuid
  end;

  if target_barangay_id is null or target_record_id is null then
    raise exception 'Cannot record audit history for %.%', tg_table_name, target_record_id;
  end if;

  select full_name, role::text
    into actor_name_value, actor_role_value
    from public.profiles
   where id = auth.uid();

  target_scope := case
    when tg_table_name in (
      'sk_fund_sources', 'sk_budget', 'sk_expenses', 'sk_programs', 'kk_monitoring'
    ) then 'sk'
    when tg_table_name = 'program_milestones'
      and target_row->>'sk_program_id' is not null then 'sk'
    when tg_table_name = 'profiles'
      and actor_role_value like 'sk_%' then 'sk'
    when tg_table_name = 'feedback'
      and target_row->>'addressed_to' = 'sk' then 'sk'
    when tg_table_name = 'barangays'
      and actor_role_value like 'sk_%' then 'sk'
    when tg_table_name = 'officials_transitions'
      and target_row->>'position_title' like 'SK %' then 'sk'
    else 'barangay'
  end;

  case tg_table_name
    when 'barangays' then
      old_safe := jsonb_build_object(
        'name', old_row->'name',
        'slug', old_row->'slug',
        'municipality', old_row->'municipality',
        'province', old_row->'province'
      );
      new_safe := jsonb_build_object(
        'name', new_row->'name',
        'slug', new_row->'slug',
        'municipality', new_row->'municipality',
        'province', new_row->'province'
      );
    when 'profiles' then
      old_safe := jsonb_build_object(
        'full_name', old_row->'full_name',
        'role', old_row->'role',
        'position_title', old_row->'position_title',
        'is_active', old_row->'is_active',
        'term_start', old_row->'term_start',
        'term_end', old_row->'term_end'
      );
      new_safe := jsonb_build_object(
        'full_name', new_row->'full_name',
        'role', new_row->'role',
        'position_title', new_row->'position_title',
        'is_active', new_row->'is_active',
        'term_start', new_row->'term_start',
        'term_end', new_row->'term_end'
      );
    when 'fund_sources', 'sk_fund_sources' then
      old_safe := jsonb_build_object(
        'name', old_row->'name',
        'source_type', old_row->'source_type',
        'amount', old_row->'amount',
        'fiscal_year', old_row->'fiscal_year',
        'received_date', old_row->'received_date'
      );
      new_safe := jsonb_build_object(
        'name', new_row->'name',
        'source_type', new_row->'source_type',
        'amount', new_row->'amount',
        'fiscal_year', new_row->'fiscal_year',
        'received_date', new_row->'received_date'
      );
    when 'budget_allocations', 'sk_budget' then
      old_safe := jsonb_build_object(
        'fiscal_year', old_row->'fiscal_year',
        'category', old_row->'category',
        'amount', old_row->'amount'
      );
      new_safe := jsonb_build_object(
        'fiscal_year', new_row->'fiscal_year',
        'category', new_row->'category',
        'amount', new_row->'amount'
      );
    when 'expenses', 'sk_expenses' then
      old_safe := jsonb_build_object(
        'budget_allocation_id', old_row->'budget_allocation_id',
        'sk_budget_id', old_row->'sk_budget_id',
        'program_id', old_row->'program_id',
        'sk_program_id', old_row->'sk_program_id',
        'category', old_row->'category',
        'amount', old_row->'amount',
        'date_incurred', old_row->'date_incurred',
        'status', old_row->'status'
      );
      new_safe := jsonb_build_object(
        'budget_allocation_id', new_row->'budget_allocation_id',
        'sk_budget_id', new_row->'sk_budget_id',
        'program_id', new_row->'program_id',
        'sk_program_id', new_row->'sk_program_id',
        'category', new_row->'category',
        'amount', new_row->'amount',
        'date_incurred', new_row->'date_incurred',
        'status', new_row->'status'
      );
    when 'programs', 'sk_programs' then
      old_safe := jsonb_build_object(
        'title', old_row->'title',
        'category', old_row->'category',
        'budget_amount', old_row->'budget_amount',
        'budget_allocation_id', old_row->'budget_allocation_id',
        'sk_budget_id', old_row->'sk_budget_id',
        'start_date', old_row->'start_date',
        'end_date', old_row->'end_date',
        'status', old_row->'status',
        'beneficiaries_count', old_row->'beneficiaries_count',
        'beneficiary_category', old_row->'beneficiary_category'
      );
      new_safe := jsonb_build_object(
        'title', new_row->'title',
        'category', new_row->'category',
        'budget_amount', new_row->'budget_amount',
        'budget_allocation_id', new_row->'budget_allocation_id',
        'sk_budget_id', new_row->'sk_budget_id',
        'start_date', new_row->'start_date',
        'end_date', new_row->'end_date',
        'status', new_row->'status',
        'beneficiaries_count', new_row->'beneficiaries_count',
        'beneficiary_category', new_row->'beneficiary_category'
      );
    when 'kk_monitoring' then
      old_safe := jsonb_build_object(
        'profile_status', old_row->'profile_status',
        'participation_status', old_row->'participation_status',
        'sk_program_id', old_row->'sk_program_id'
      );
      new_safe := jsonb_build_object(
        'profile_status', new_row->'profile_status',
        'participation_status', new_row->'participation_status',
        'sk_program_id', new_row->'sk_program_id'
      );
    when 'program_milestones' then
      old_safe := jsonb_build_object(
        'title', old_row->'title',
        'progress_percent', old_row->'progress_percent',
        'due_date', old_row->'due_date',
        'program_id', old_row->'program_id',
        'sk_program_id', old_row->'sk_program_id'
      );
      new_safe := jsonb_build_object(
        'title', new_row->'title',
        'progress_percent', new_row->'progress_percent',
        'due_date', new_row->'due_date',
        'program_id', new_row->'program_id',
        'sk_program_id', new_row->'sk_program_id'
      );
    when 'feedback' then
      old_safe := jsonb_build_object(
        'status', old_row->'status',
        'addressed_to', old_row->'addressed_to',
        'responded_at', old_row->'responded_at',
        'responded_by', old_row->'responded_by'
      );
      new_safe := jsonb_build_object(
        'status', new_row->'status',
        'addressed_to', new_row->'addressed_to',
        'responded_at', new_row->'responded_at',
        'responded_by', new_row->'responded_by'
      );
    when 'officials_transitions' then
      old_safe := jsonb_build_object(
        'position_title', old_row->'position_title',
        'outgoing_official_id', old_row->'outgoing_official_id',
        'incoming_official_id', old_row->'incoming_official_id',
        'term_start', old_row->'term_start',
        'term_end', old_row->'term_end',
        'transition_date', old_row->'transition_date'
      );
      new_safe := jsonb_build_object(
        'position_title', new_row->'position_title',
        'outgoing_official_id', new_row->'outgoing_official_id',
        'incoming_official_id', new_row->'incoming_official_id',
        'term_start', new_row->'term_start',
        'term_end', new_row->'term_end',
        'transition_date', new_row->'transition_date'
      );
    else
      raise exception 'Audit history is not configured for table %', tg_table_name;
  end case;

  if tg_op = 'INSERT' then
    after_changes := new_safe;
  elsif tg_op = 'DELETE' then
    before_changes := old_safe;
  else
    select coalesce(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      into before_changes
      from jsonb_each(old_safe) as entry
     where old_safe->entry.key is distinct from new_safe->entry.key;
    select coalesce(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      into after_changes
      from jsonb_each(new_safe) as entry
     where old_safe->entry.key is distinct from new_safe->entry.key;

    if before_changes = '{}'::jsonb and after_changes = '{}'::jsonb then
      return new;
    end if;
  end if;

  insert into public.audit_logs (
    barangay_id,
    entity_table,
    record_id,
    scope,
    action,
    actor_id,
    actor_name,
    actor_role,
    before_data,
    after_data
  ) values (
    target_barangay_id,
    tg_table_name,
    target_record_id,
    target_scope,
    tg_op,
    auth.uid(),
    actor_name_value,
    actor_role_value,
    before_changes,
    after_changes
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_audit_history() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'barangays',
    'profiles',
    'fund_sources',
    'budget_allocations',
    'expenses',
    'programs',
    'sk_fund_sources',
    'sk_budget',
    'sk_expenses',
    'sk_programs',
    'kk_monitoring',
    'feedback',
    'officials_transitions'
  ] loop
    execute format(
      'drop trigger if exists capture_audit_history on public.%I',
      table_name
    );
    execute format(
      'create trigger capture_audit_history after insert or update or delete on public.%I for each row execute function public.capture_audit_history()',
      table_name
    );
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.program_milestones') is not null then
    drop trigger if exists capture_audit_history on public.program_milestones;
    create trigger capture_audit_history
      after insert or update or delete on public.program_milestones
      for each row execute function public.capture_audit_history();
  end if;
end;
$$;

commit;
