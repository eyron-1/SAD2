-- Public disclosure documents are immediately available to residents after upload.
create table if not exists public.transparency_documents (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  scope text not null check (scope in ('barangay', 'sk')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  category text not null check (char_length(trim(category)) between 1 and 80),
  description text check (description is null or char_length(description) <= 1000),
  file_name text not null,
  file_path text not null unique,
  mime_type text not null check (mime_type in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Older deployments may already have this table without the MIME type field.
alter table public.transparency_documents
  add column if not exists mime_type text;

-- Keep the optional legacy field for databases that received the first version
-- of this migration, which used content_type instead of mime_type.
alter table public.transparency_documents
  add column if not exists content_type text;

create index if not exists transparency_documents_public_listing_idx
  on public.transparency_documents (barangay_id, scope, created_at desc);

alter table public.transparency_documents enable row level security;
grant select, insert, delete on public.transparency_documents to anon, authenticated;

drop policy if exists "public read transparency documents" on public.transparency_documents;
create policy "public read transparency documents"
  on public.transparency_documents for select
  using (true);

drop policy if exists "officials upload transparency documents" on public.transparency_documents;
create policy "officials upload transparency documents"
  on public.transparency_documents for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      (scope = 'barangay' and public.is_barangay_editor(auth.uid()))
      or (
        scope = 'sk'
        and exists (
          select 1
            from public.profiles
           where id = auth.uid()
             and barangay_id = public.transparency_documents.barangay_id
             and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
             and is_active
        )
      )
    )
    and public.belongs_to_barangay(auth.uid(), barangay_id)
    and file_path ~ (
      '^' || barangay_id::text || '/' || scope || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf|xls|xlsx|doc|docx)$'
    )
  );

drop policy if exists "officials delete transparency documents" on public.transparency_documents;
create policy "officials delete transparency documents"
  on public.transparency_documents for delete to authenticated
  using (
    public.belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (scope = 'barangay' and public.is_barangay_editor(auth.uid()))
      or (
        scope = 'sk'
        and exists (
          select 1
            from public.profiles
           where id = auth.uid()
             and barangay_id = public.transparency_documents.barangay_id
             and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
             and is_active
        )
      )
    )
  );

create or replace function public.can_manage_transparency_documents(
  target_barangay text,
  target_scope text
)
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
       and is_active
       and (
         (target_scope = 'barangay' and role in ('captain', 'secretary', 'treasurer'))
         or (target_scope = 'sk' and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad'))
       )
  );
$$;
revoke all on function public.can_manage_transparency_documents(text, text) from public;
grant execute on function public.can_manage_transparency_documents(text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transparency-documents',
  'transparency-documents',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read transparency documents" on storage.objects;
create policy "Public can read transparency documents"
  on storage.objects for select
  using (bucket_id = 'transparency-documents');

drop policy if exists "Officials can upload transparency documents" on storage.objects;
create policy "Officials can upload transparency documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'transparency-documents'
    and name ~ '^[0-9a-fA-F-]{36}/(barangay|sk)/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf|xls|xlsx|doc|docx)$'
    and public.can_manage_transparency_documents(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

drop policy if exists "Officials can delete transparency documents" on storage.objects;
create policy "Officials can delete transparency documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'transparency-documents'
    and public.can_manage_transparency_documents(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

notify pgrst, 'reload schema';
