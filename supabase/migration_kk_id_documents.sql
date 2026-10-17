alter table public.kk_monitoring
  add column if not exists id_document_path text;

create or replace function public.can_access_kk_id_documents(target_barangay text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
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

grant insert on table public.kk_monitoring to anon, authenticated;

drop policy if exists "sk officials read kk" on public.kk_monitoring;
create policy "sk officials read kk" on public.kk_monitoring for select
  using (public.can_access_kk_id_documents(barangay_id::text));

drop policy if exists "sk officials write kk" on public.kk_monitoring;
create policy "sk officials write kk" on public.kk_monitoring for insert
  with check (public.can_access_kk_id_documents(barangay_id::text));

drop policy if exists "public submit kk profiling" on public.kk_monitoring;
create policy "public submit kk profiling" on public.kk_monitoring
  for insert
  with check (
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kk-id-documents',
  'kk-id-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload KK ID documents" on storage.objects;
create policy "Anyone can upload KK ID documents"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'kk-id-documents'
    and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$'
    and public.can_upload_kk_id_documents((storage.foldername(name))[1])
  );

drop policy if exists "SK members can read KK ID documents" on storage.objects;
create policy "SK members can read KK ID documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kk-id-documents'
    and public.can_access_kk_id_documents((storage.foldername(name))[1])
  );

drop policy if exists "SK members can delete KK ID documents" on storage.objects;
create policy "SK members can delete KK ID documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'kk-id-documents'
    and public.can_access_kk_id_documents((storage.foldername(name))[1])
  );
