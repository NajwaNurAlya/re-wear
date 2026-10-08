-- RE:WEAR  ·  Migration 6  ·  Editorial management
--
-- Keep the existing public contract (published articles read from public.articles),
-- while giving admins a reversible archive state and a place to upload cover images
-- through the same public Storage bucket used by product photos.

alter table public.articles
  add column if not exists archived_at timestamptz;

drop index if exists public.articles_published_idx;
create index if not exists articles_published_idx
  on public.articles (published_at desc)
  where is_published and archived_at is null;

drop policy if exists articles_select on public.articles;
create policy articles_select on public.articles
  for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_admin());

drop policy if exists product_images_admin_editorial_insert on storage.objects;
create policy product_images_admin_editorial_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'editorial'
    and public.is_admin()
  );

drop policy if exists product_images_admin_editorial_delete on storage.objects;
create policy product_images_admin_editorial_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'editorial'
    and public.is_admin()
  );
