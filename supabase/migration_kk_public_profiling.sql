alter table kk_monitoring
  add column if not exists sex text,
  add column if not exists contact_number text,
  add column if not exists education_level text,
  add column if not exists employment_status text,
  add column if not exists youth_classification text,
  add column if not exists profile_status text not null default 'verified',
  add column if not exists consent_given boolean not null default false,
  add column if not exists guardian_consent boolean not null default false;

alter table kk_monitoring
  alter column profile_status set default 'pending_review';

alter table kk_monitoring
  drop constraint if exists kk_monitoring_profile_status_check;
alter table kk_monitoring
  add constraint kk_monitoring_profile_status_check
  check (profile_status in ('pending_review', 'verified', 'rejected'));

alter table kk_monitoring enable row level security;

grant insert on table kk_monitoring to anon, authenticated;

drop policy if exists "public submit kk profiling" on kk_monitoring;
create policy "public submit kk profiling" on kk_monitoring
  for insert
  with check (
    created_by is null
    and profile_status = 'pending_review'
    and participation_status = 'registered'
    and sk_program_id is null
    and notes is null
    and age between 15 and 30
    and consent_given
    and (age >= 18 or guardian_consent)
    and sex in ('female', 'male', 'prefer_not_to_say')
    and education_level in ('elementary', 'junior_high', 'senior_high', 'college', 'vocational', 'not_in_school')
    and employment_status in ('employed', 'self_employed', 'unemployed', 'not_applicable')
    and youth_classification in ('in_school', 'out_of_school', 'working', 'youth_with_disability', 'indigenous_youth', 'other')
  );

create index if not exists kk_monitoring_review_queue_idx
  on kk_monitoring (barangay_id, profile_status, created_at desc);
