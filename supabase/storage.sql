-- Supabase Storage setup for uploaded feedback photos, receipts, and logos.
-- Run after supabase/schema.sql.

insert into storage.buckets (id, name, public)
values
  ('feedback-photos', 'feedback-photos', true),
  ('receipts', 'receipts', true),
  ('barangay-logos', 'barangay-logos', true)
on conflict (id) do update
set public = excluded.public;

-- Keep limits in the bucket metadata instead of relying on client-side checks.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = case id
      when 'feedback-photos' then array['image/jpeg', 'image/png', 'image/webp']::text[]
      when 'receipts' then array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
      when 'barangay-logos' then array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
    end
where id in ('feedback-photos', 'receipts', 'barangay-logos');

-- Public buckets need public reads for the URLs stored in the application tables.
drop policy if exists "Public can read feedback photos" on storage.objects;
create policy "Public can read feedback photos"
  on storage.objects for select
  using (bucket_id = 'feedback-photos');

drop policy if exists "Public can read receipts" on storage.objects;
create policy "Public can read receipts"
  on storage.objects for select
  using (bucket_id = 'receipts');

drop policy if exists "Public can read barangay logos" on storage.objects;
create policy "Public can read barangay logos"
  on storage.objects for select
  using (bucket_id = 'barangay-logos');

-- Residents submit feedback without signing in, so feedback photo uploads must
-- accept both anonymous and authenticated clients.
drop policy if exists "Anyone can upload feedback photos" on storage.objects;
create policy "Anyone can upload feedback photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'feedback-photos');

-- Officials are authenticated when uploading receipts or replacing logos.
drop policy if exists "Officials can upload receipts" on storage.objects;
create policy "Officials can upload receipts"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');

drop policy if exists "Officials can upload logos" on storage.objects;
create policy "Officials can upload logos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'barangay-logos');

drop policy if exists "Officials can update logos" on storage.objects;
create policy "Officials can update logos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'barangay-logos')
  with check (bucket_id = 'barangay-logos');
