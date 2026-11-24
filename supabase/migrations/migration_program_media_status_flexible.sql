-- Migration: Allow documentation upload for active (ongoing and planned) programs
-- Run this in Supabase SQL Editor if program documentation uploads fail with RLS.

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
