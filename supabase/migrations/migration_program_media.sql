-- Public photo and video documentation for completed barangay and SK programs.
create table if not exists public.program_media (
  id uuid primary key default uuid_generate_v4(),
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  program_id uuid not null,
  program_type text not null check (program_type in ('barangay', 'sk')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  file_name text not null,
  file_path text not null unique,
  mime_type text not null check (mime_type in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  )),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists program_media_listing_idx
  on public.program_media (barangay_id, program_type, program_id, created_at desc);

alter table public.program_media enable row level security;
grant select, insert, delete on public.program_media to anon, authenticated;

drop policy if exists "public read program media" on public.program_media;
create policy "public read program media"
  on public.program_media for select
  using (true);

drop policy if exists "editors upload program media" on public.program_media;
create policy "editors upload program media"
  on public.program_media for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (program_type = 'barangay' and public.is_barangay_editor(auth.uid()))
      or (
        program_type = 'sk'
        and (
          public.is_sk_editor(auth.uid())
          or exists (
            select 1 from public.profiles
            where id = auth.uid()
              and barangay_id = public.program_media.barangay_id
              and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
              and is_active
          )
        )
      )
    )
    and (
      (program_type = 'barangay' and exists (
        select 1 from public.programs
        where programs.id = program_media.program_id
          and programs.barangay_id = program_media.barangay_id
          and programs.status != 'cancelled'
      ))
      or (program_type = 'sk' and exists (
        select 1 from public.sk_programs
        where sk_programs.id = program_media.program_id
          and sk_programs.barangay_id = program_media.barangay_id
          and sk_programs.status != 'cancelled'
      ))
    )
    and file_path ~ (
      '^' || barangay_id::text || '/' || program_type || '/' || program_id::text
        || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|mp4|webm|mov)$'
    )
  );

drop policy if exists "editors delete program media" on public.program_media;
create policy "editors delete program media"
  on public.program_media for delete to authenticated
  using (
    public.belongs_to_barangay(auth.uid(), barangay_id)
    and (
      (program_type = 'barangay' and public.is_barangay_editor(auth.uid()))
      or (
        program_type = 'sk'
        and (
          public.is_sk_editor(auth.uid())
          or exists (
            select 1 from public.profiles
            where id = auth.uid()
              and barangay_id = public.program_media.barangay_id
              and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
              and is_active
          )
        )
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'program-media',
  'program-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read program media" on storage.objects;
create policy "Public can read program media"
  on storage.objects for select
  using (bucket_id = 'program-media');

drop policy if exists "Editors can upload program media" on storage.objects;
create policy "Editors can upload program media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'program-media'
    and name ~ '^[0-9a-fA-F-]{36}/(barangay|sk)/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|mp4|webm|mov)$'
    and public.belongs_to_barangay(auth.uid(), ((storage.foldername(name))[1])::uuid)
    and (
      (
        (storage.foldername(name))[2] = 'barangay'
        and public.is_barangay_editor(auth.uid())
      )
      or (
        (storage.foldername(name))[2] = 'sk'
        and (
          public.is_sk_editor(auth.uid())
          or exists (
            select 1 from public.profiles
            where id = auth.uid()
              and barangay_id = ((storage.foldername(name))[1])::uuid
              and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
              and is_active
          )
        )
      )
    )
  );

drop policy if exists "Editors can delete program media" on storage.objects;
create policy "Editors can delete program media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'program-media'
    and public.belongs_to_barangay(auth.uid(), ((storage.foldername(name))[1])::uuid)
    and (
      (
        (storage.foldername(name))[2] = 'barangay'
        and public.is_barangay_editor(auth.uid())
      )
      or (
        (storage.foldername(name))[2] = 'sk'
        and (
          public.is_sk_editor(auth.uid())
          or exists (
            select 1 from public.profiles
            where id = auth.uid()
              and barangay_id = ((storage.foldername(name))[1])::uuid
              and role in ('sk_chairperson', 'sk_treasurer', 'sk_kagawad')
              and is_active
          )
        )
      )
    )
  );

notify pgrst, 'reload schema';
