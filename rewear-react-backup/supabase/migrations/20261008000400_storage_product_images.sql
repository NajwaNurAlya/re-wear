-- RE:WEAR  ·  Migration 4 of 4  ·  Storage for product photos
--
-- Photos used to be sent to the database as base64 text inside products.images. They now live in Storage and
-- products.images holds their public URLs (the column and its 6-photo limit are unchanged).
--
-- Bucket "product-images"
--   public read   photos are shown on public pages, so the bucket serves them by URL (no SELECT policy is needed or granted)
--   write         only a seller, only into their own folder  <auth.uid()>/<file>
--   limits        5 MB per file, JPEG / PNG / WebP only (enforced by Storage itself, not just by the browser)
--   delete        the owner of the folder; nobody can overwrite or move an existing object (no UPDATE policy)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_seller_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_app_role() = 'seller'
  );

create policy product_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
