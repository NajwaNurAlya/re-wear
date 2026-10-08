-- RE:WEAR  ·  Migration 3 of 3  ·  Grants + Row Level Security
--
-- Deny by default: RLS is on for every table, nothing is granted that the app does not need,
-- and every policy names the role it applies to. Two layers protect each table:
--   1. GRANTs   -> which statements/columns an API role may even attempt
--   2. policies -> which rows those statements may touch
-- Business-rule checks that need old vs new values live in migration 2's triggers.
--
-- The frontend uses the anon/publishable key only. The service_role key must never reach the browser.

-- Start from zero: remove the broad default grants Supabase gives new tables.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
-- Postgres lets everyone EXECUTE new functions by default. Close that for every RE:WEAR function
-- (listed by name on purpose: a blanket "all functions in schema public" would also hit extension functions),
-- then open only what the app needs. Trigger functions need no grant: triggers run regardless of who fires them.
revoke execute on function
  public.set_updated_at(),
  public.current_app_role(),
  public.is_admin(),
  public.handle_new_user(),
  public.sync_profile_email(),
  public.is_order_buyer(uuid),
  public.is_order_seller(uuid),
  public.guard_product_write(),
  public.guard_order_update(),
  public.record_order_status(),
  public.release_cancelled_order(),
  public.place_order(uuid[], text, text, text, text, text, text)
from public, anon, authenticated;

-- Helpers that policies and guard triggers call. Safe to expose: they only answer questions about the caller.
grant execute on function public.current_app_role()    to anon, authenticated;
grant execute on function public.is_admin()            to anon, authenticated;
grant execute on function public.is_order_buyer(uuid)  to authenticated;
grant execute on function public.is_order_seller(uuid) to authenticated;
-- The one door to creating an order (it is SECURITY DEFINER and checks auth.uid() itself).
grant execute on function public.place_order(uuid[], text, text, text, text, text, text) to authenticated;

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.wishlist_items      enable row level security;
alter table public.cart_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_events enable row level security;
alter table public.articles            enable row level security;
alter table public.article_products    enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
--   read:   your own row; admins read all (Members page)
--   update: your own name only. `role` and `email` are not grantable, so nobody can promote themselves.
--   insert/delete: none (rows come from the signup trigger and cascade from auth.users)
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- categories: public read, admin write
-- ---------------------------------------------------------------------------
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

create policy categories_select on public.categories
  for select to anon, authenticated
  using (true);

create policy categories_admin_insert on public.categories
  for insert to authenticated
  with check (public.is_admin());

create policy categories_admin_update on public.categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy categories_admin_delete on public.categories
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- products
--   public (anon + signed in): approved pieces, plus sold ones (reachable by direct link / order history)
--   seller: sees all of their own pieces in any status, creates drafts, submits for review
--   admin:  sees everything and curates
--   No deletes. Which status changes are legal is enforced by products_guard_write.
-- ---------------------------------------------------------------------------
grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;

create policy products_select on public.products
  for select to anon, authenticated
  using (status in ('approved', 'sold') or seller_id = auth.uid() or public.is_admin());

create policy products_seller_insert on public.products
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and public.current_app_role() = 'seller'
    and status in ('draft', 'pending')
  );

create policy products_seller_update on public.products
  for update to authenticated
  using (seller_id = auth.uid() and public.current_app_role() = 'seller')
  with check (
    seller_id = auth.uid()
    and public.current_app_role() = 'seller'
    and status in ('draft', 'pending')
  );

create policy products_admin_update on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- wishlist_items / cart_items: private to their owner. Buyers and sellers only (admins have neither).
-- Only approved pieces can be added; a cart additionally refuses your own listings.
-- A saved piece that later sells stays in the wishlist (SELECT/DELETE do not look at product status).
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.wishlist_items to authenticated;
grant select, insert, delete on public.cart_items     to authenticated;

create policy wishlist_select on public.wishlist_items
  for select to authenticated
  using (user_id = auth.uid());

create policy wishlist_insert on public.wishlist_items
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_app_role() in ('buyer', 'seller')
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'approved')
  );

create policy wishlist_delete on public.wishlist_items
  for delete to authenticated
  using (user_id = auth.uid());

create policy cart_select on public.cart_items
  for select to authenticated
  using (user_id = auth.uid());

create policy cart_insert on public.cart_items
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_app_role() in ('buyer', 'seller')
    and exists (
      select 1 from public.products p
       where p.id = product_id and p.status = 'approved' and p.seller_id <> auth.uid()
    )
  );

create policy cart_delete on public.cart_items
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- orders
--   read:   the buyer; sellers with a piece in the order (they need the delivery address to ship); admins
--   create: only via place_order()  (no INSERT grant)
--   update: `status` column only; who may do which step is enforced by orders_guard_update
-- ---------------------------------------------------------------------------
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

create policy orders_select on public.orders
  for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin() or public.is_order_seller(id));

create policy orders_update_status on public.orders
  for update to authenticated
  using (public.is_admin() or public.is_order_seller(id))
  with check (public.is_admin() or public.is_order_seller(id));

-- order_items: read-only for everyone. Sellers see only their own pieces; buyers see their whole order.
grant select on public.order_items to authenticated;

create policy order_items_select on public.order_items
  for select to authenticated
  using (seller_id = auth.uid() or public.is_admin() or public.is_order_buyer(order_id));

-- order_status_events: read-only, same audience as the order
grant select on public.order_status_events to authenticated;

create policy order_status_events_select on public.order_status_events
  for select to authenticated
  using (public.is_admin() or public.is_order_buyer(order_id) or public.is_order_seller(order_id));

-- ---------------------------------------------------------------------------
-- editorial: published articles are public; only admins write
-- ---------------------------------------------------------------------------
grant select on public.articles, public.article_products to anon, authenticated;
grant insert, update, delete on public.articles, public.article_products to authenticated;

create policy articles_select on public.articles
  for select to anon, authenticated
  using (is_published or public.is_admin());

create policy articles_admin_insert on public.articles
  for insert to authenticated
  with check (public.is_admin());

create policy articles_admin_update on public.articles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy articles_admin_delete on public.articles
  for delete to authenticated
  using (public.is_admin());

create policy article_products_select on public.article_products
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_id));

create policy article_products_admin_insert on public.article_products
  for insert to authenticated
  with check (public.is_admin());

create policy article_products_admin_update on public.article_products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy article_products_admin_delete on public.article_products
  for delete to authenticated
  using (public.is_admin());
