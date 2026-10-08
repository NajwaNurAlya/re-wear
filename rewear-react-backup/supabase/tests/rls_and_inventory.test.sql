-- RE:WEAR database tests: RLS, grants, product lifecycle, one-of-a-kind inventory.
--
-- Run after migrations + seed (needs the demo users and the 12 seeded pieces):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_inventory.test.sql
--
-- Everything happens in ONE transaction that is rolled back at the end, so no data is left behind.
-- The script stops at the first failed expectation. Impersonation mimics PostgREST: it switches to the
-- `authenticated` / `anon` role and sets the JWT `sub` claim that auth.uid() reads.
\set ON_ERROR_STOP on
begin;

create schema rw_test;
grant usage on schema rw_test to public;

-- Lookups run as the definer (bypass RLS) so the tests can find ids while impersonating someone else.
create function rw_test.uid(p_email text) returns uuid language sql security definer set search_path = '' as
$$ select id from public.profiles where email = p_email $$;
create function rw_test.pid(p_title text) returns uuid language sql security definer set search_path = '' as
$$ select id from public.products where title = p_title $$;
create function rw_test.cid(p_slug text) returns uuid language sql security definer set search_path = '' as
$$ select id from public.categories where slug = p_slug $$;
create function rw_test.status_of(p_id uuid) returns text language sql security definer set search_path = '' as
$$ select status::text from public.products where id = p_id $$;

create function rw_test.as_user(p_email text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', rw_test.uid(p_email)::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end $$;

create function rw_test.as_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
end $$;

create function rw_test.as_superuser() returns void language plpgsql as $$
begin reset role; end $$;

create function rw_test.fail(p_label text, p_pattern text, p_sql text) returns void language plpgsql as $$
declare v_failed boolean := false; v_msg text;
begin
  begin execute p_sql; exception when others then v_failed := true; v_msg := sqlerrm; end;
  if not v_failed then raise exception 'FAIL [%]: expected an error but the statement succeeded', p_label; end if;
  if v_msg !~* p_pattern then raise exception 'FAIL [%]: wrong error "%", wanted /%/', p_label, v_msg, p_pattern; end if;
  raise notice 'ok   %', p_label;
end $$;

create function rw_test.rows(p_label text, p_expected bigint, p_sql text) returns void language plpgsql as $$
declare v bigint;
begin
  execute 'select count(*) from (' || p_sql || ') t' into v;
  if v is distinct from p_expected then raise exception 'FAIL [%]: expected % rows, got %', p_label, p_expected, v; end if;
  raise notice 'ok   %', p_label;
end $$;

create function rw_test.affects(p_label text, p_expected bigint, p_sql text) returns void language plpgsql as $$
declare v bigint;
begin
  execute p_sql;
  get diagnostics v = row_count;
  if v <> p_expected then raise exception 'FAIL [%]: expected % rows affected, got %', p_label, p_expected, v; end if;
  raise notice 'ok   %', p_label;
end $$;

create function rw_test.eq(p_label text, p_actual text, p_expected text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAIL [%]: expected "%", got "%"', p_label, p_expected, p_actual; end if;
  raise notice 'ok   %', p_label;
end $$;

grant execute on all functions in schema rw_test to public;

-- Extra accounts for cross-user checks. Created as the superuser, exactly like a signup (trigger makes the profile).
-- 'escalator' tries to sign up as admin through the metadata: it must end up a buyer.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'seller2@rewear.test',  'x', '{"full_name":"Second Seller","role":"seller"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'buyer2@rewear.test',   'x', '{"full_name":"Second Buyer","role":"buyer"}',   now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'escalator@rewear.test','x', '{"full_name":"Sneaky","role":"admin"}',          now(), now());

-- ===========================================================================
do $$
declare
  v_order   public.orders;
  v_order2  public.orders;
  v_order3  public.orders;
  v_chore   uuid := rw_test.pid('Washed denim chore jacket');   -- approved, seller-demo
  v_skirt   uuid := rw_test.pid('Pleated wool midi skirt');     -- approved, seller-demo
  v_blazer  uuid := rw_test.pid('Houndstooth wool blazer');     -- approved, seller-demo
  v_trouser uuid := rw_test.pid('Wide-leg pleated trousers');   -- approved, seller-demo
  v_jeans   uuid := rw_test.pid('Low-rise flared jeans');       -- seeded as sold
  v_truck   uuid := rw_test.pid('Corduroy trucker jacket');     -- seeded as pending
  v_cat     uuid := rw_test.cid('tops');
  v_draft   uuid;
  v_draft2  uuid;
  v_bad     uuid := gen_random_uuid();
  v_a       text := 'select 1';
begin
  ---------------------------------------------------------------------------
  raise notice '--- signup and roles';
  perform rw_test.as_superuser();
  perform rw_test.eq('signup metadata cannot create an admin', (select role::text from public.profiles where email = 'escalator@rewear.test'), 'buyer');
  perform rw_test.eq('signup metadata can choose seller',      (select role::text from public.profiles where email = 'seller2@rewear.test'), 'seller');
  perform rw_test.eq('seed admin is admin',                    (select role::text from public.profiles where email = 'admin@rewear.test'), 'admin');

  ---------------------------------------------------------------------------
  raise notice '--- anonymous visitor';
  perform rw_test.as_anon();
  perform rw_test.rows('anon sees approved + sold pieces only', 11, 'select 1 from public.products');
  perform rw_test.rows('anon cannot see a pending piece', 0, format('select 1 from public.products where id = %L', v_truck));
  perform rw_test.rows('anon sees categories', 6, 'select 1 from public.categories');
  perform rw_test.rows('anon sees editorial', 5, 'select 1 from public.articles');
  perform rw_test.rows('anon sees article links', 15, 'select 1 from public.article_products');
  perform rw_test.fail('anon cannot read profiles',   'permission denied', 'select 1 from public.profiles');
  perform rw_test.fail('anon cannot read orders',     'permission denied', 'select 1 from public.orders');
  perform rw_test.fail('anon cannot read carts',      'permission denied', 'select 1 from public.cart_items');
  perform rw_test.fail('anon cannot read wishlists',  'permission denied', 'select 1 from public.wishlist_items');
  perform rw_test.fail('anon cannot write products',  'permission denied', 'update public.products set price = 1');
  perform rw_test.fail('anon cannot place orders',    'permission denied', format('select public.place_order(array[%L]::uuid[], ''a'',''b'',''c'',''d'',''e'',''cod'')', v_chore));

  ---------------------------------------------------------------------------
  raise notice '--- buyer: profile, catalog, wishlist, cart';
  perform rw_test.as_user('buyer@rewear.test');
  perform rw_test.rows('buyer sees only their own profile', 1, 'select 1 from public.profiles');
  perform rw_test.rows('buyer sees public pieces only', 11, 'select 1 from public.products');
  perform rw_test.affects('buyer can rename themselves', 1, $q$update public.profiles set full_name = 'Dina B.' where email = 'buyer@rewear.test'$q$);
  perform rw_test.fail('buyer cannot promote themselves', 'permission denied', $q$update public.profiles set role = 'admin' where email = 'buyer@rewear.test'$q$);
  perform rw_test.fail('buyer cannot change their email column', 'permission denied', $q$update public.profiles set email = 'x@x.io' where email = 'buyer@rewear.test'$q$);
  perform rw_test.affects('buyer cannot edit another profile', 0, $q$update public.profiles set full_name = 'x' where email = 'seller@rewear.test'$q$);
  perform rw_test.affects('buyer cannot edit pieces', 0, 'update public.products set price = 1');
  perform rw_test.fail('buyer cannot create pieces', 'row-level security', format('insert into public.products (seller_id, title) values (%L, ''Sneaky listing'')', rw_test.uid('buyer@rewear.test')));
  perform rw_test.affects('buyer cannot edit categories', 0, $q$update public.categories set name = 'Hacked'$q$);
  perform rw_test.fail('buyer cannot add categories', 'row-level security', $q$insert into public.categories (slug, name) values ('hacked', 'Hacked')$q$);
  perform rw_test.fail('buyer cannot insert orders directly', 'permission denied', 'insert into public.orders (buyer_id, total) values (gen_random_uuid(), 1)');
  perform rw_test.affects('buyer cannot edit editorial', 0, $q$update public.articles set title = 'x'$q$);
  perform rw_test.fail('buyer cannot publish editorial', 'row-level security', $q$insert into public.articles (slug, title, topic, author) values ('x', 'x', 'x', 'x')$q$);

  perform rw_test.affects('buyer can wishlist an approved piece', 1, format('insert into public.wishlist_items (user_id, product_id) values (auth.uid(), %L)', v_chore));
  perform rw_test.fail('buyer cannot wishlist a pending piece', 'row-level security', format('insert into public.wishlist_items (user_id, product_id) values (auth.uid(), %L)', v_truck));
  perform rw_test.fail('buyer cannot wishlist for someone else', 'row-level security', format('insert into public.wishlist_items (user_id, product_id) values (%L, %L)', rw_test.uid('buyer2@rewear.test'), v_skirt));
  perform rw_test.affects('buyer can add to cart', 1, format('insert into public.cart_items (user_id, product_id) values (auth.uid(), %L)', v_chore));
  perform rw_test.affects('buyer can add a second piece', 1, format('insert into public.cart_items (user_id, product_id) values (auth.uid(), %L)', v_skirt));
  perform rw_test.fail('a piece sits in a cart once (no quantity)', 'duplicate key', format('insert into public.cart_items (user_id, product_id) values (auth.uid(), %L)', v_skirt));
  perform rw_test.fail('buyer cannot cart a sold piece', 'row-level security', format('insert into public.cart_items (user_id, product_id) values (auth.uid(), %L)', v_jeans));
  perform rw_test.fail('buyer cannot cart a pending piece', 'row-level security', format('insert into public.cart_items (user_id, product_id) values (auth.uid(), %L)', v_truck));
  perform rw_test.rows('buyer sees own cart', 2, 'select 1 from public.cart_items');

  perform rw_test.as_user('buyer2@rewear.test');
  perform rw_test.rows('another buyer sees nobody else''s cart', 0, 'select 1 from public.cart_items');
  perform rw_test.rows('another buyer sees nobody else''s wishlist', 0, 'select 1 from public.wishlist_items');
  perform rw_test.affects('another buyer cannot delete someone else''s cart row', 0, format('delete from public.cart_items where product_id = %L', v_chore));

  ---------------------------------------------------------------------------
  raise notice '--- seller: drafts, submission, ownership';
  perform rw_test.as_user('seller@rewear.test');
  perform rw_test.rows('seller sees public pieces + own pending', 12, 'select 1 from public.products');
  perform rw_test.rows('seller sees only their own profile', 1, 'select 1 from public.profiles');

  insert into public.products (seller_id, title) values (auth.uid(), 'Draft linen shirt') returning id into v_draft;
  perform rw_test.eq('a title-only draft is accepted', rw_test.status_of(v_draft), 'draft');
  perform rw_test.fail('a draft needs a real title', 'products_title_min', format('insert into public.products (seller_id, title) values (auth.uid(), %L)', 'ab'));
  perform rw_test.fail('an incomplete draft cannot be submitted', 'products_complete_when_submitted', format('update public.products set status = ''pending'' where id = %L', v_draft));
  perform rw_test.fail('price must be positive to submit', 'products_complete_when_submitted',
    format($q$update public.products set description = 'Soft linen shirt, light wear at cuffs.', category_id = %L, size = 'M', condition = 'good', price = 0, images = array['a.jpg'], status = 'pending' where id = %L$q$, v_cat, v_draft));
  perform rw_test.affects('a complete piece can be submitted for review', 1,
    format($q$update public.products set description = 'Soft linen shirt, light wear at cuffs.', category_id = %L, size = 'M', condition = 'good', price = 120000, images = array['a.jpg'], status = 'pending' where id = %L$q$, v_cat, v_draft));
  perform rw_test.eq('submitted piece is pending', rw_test.status_of(v_draft), 'pending');
  perform rw_test.fail('seller cannot insert an approved piece', 'row-level security',
    format($q$insert into public.products (seller_id, title, description, category_id, size, condition, price, images, status) values (auth.uid(), 'Self approved', 'A description that is long enough.', %L, 'M', 'good', 1000, array['a.jpg'], 'approved')$q$, v_cat));
  perform rw_test.fail('seller cannot approve their own piece', 'drafts or submit|row-level security', format('update public.products set status = ''approved'' where id = %L', v_draft));
  perform rw_test.fail('seller cannot mark a piece sold', 'final|row-level security', format('update public.products set status = ''sold'' where id = %L', v_draft));
  perform rw_test.fail('seller cannot hand a piece to someone else', 'owner of a piece|row-level security', format('update public.products set seller_id = %L where id = %L', rw_test.uid('seller2@rewear.test'), v_draft));
  perform rw_test.affects('seller can set featured, but it is ignored', 1, format('update public.products set featured = true where id = %L', v_draft));
  perform rw_test.fail('seller cannot edit an approved piece without resubmitting', 'drafts or submit|row-level security', format('update public.products set price = 999000 where id = %L', v_blazer));
  perform rw_test.affects('seller can pull an approved piece back for edits', 1, format('update public.products set price = 320000, status = ''pending'' where id = %L', v_blazer));
  perform rw_test.fail('seller cannot edit a sold piece', 'final', format('update public.products set title = ''Changed title'' , status = ''draft'' where id = %L', v_jeans));
  perform rw_test.fail('seller cannot cart their own piece', 'row-level security', format('insert into public.cart_items (user_id, product_id) values (auth.uid(), %L)', v_chore));

  perform rw_test.as_superuser();
  perform rw_test.eq('seller-set featured flag was discarded', (select featured::text from public.products where id = v_draft), 'false');
  perform rw_test.eq('pulled-back piece left the public rack', rw_test.status_of(v_blazer), 'pending');

  perform rw_test.as_user('seller2@rewear.test');
  perform rw_test.rows('another seller cannot see someone else''s draft/pending pieces', 0, format('select 1 from public.products where id in (%L, %L)', v_draft, v_truck));
  perform rw_test.affects('another seller cannot edit it', 0, format('update public.products set title = ''Mine now'' where id = %L', v_draft));
  perform rw_test.affects('another seller cannot edit an approved piece of someone else', 0, format('update public.products set price = 1 where id = %L', v_chore));
  perform rw_test.fail('another seller cannot file a piece under someone else''s name', 'row-level security', format('insert into public.products (seller_id, title) values (%L, ''Forged'')', rw_test.uid('seller@rewear.test')));

  ---------------------------------------------------------------------------
  raise notice '--- admin: curation';
  perform rw_test.as_user('admin@rewear.test');
  perform rw_test.rows('admin sees every piece, drafts included', 1, format('select 1 from public.products where id = %L', v_draft));
  perform rw_test.rows('admin sees all profiles', 6, 'select 1 from public.profiles');
  perform rw_test.affects('admin approves a pending piece', 1, format('update public.products set status = ''approved'' where id = %L', v_truck));
  perform rw_test.fail('admin must give notes when rejecting', 'rejection_reason_consistent', format('update public.products set status = ''rejected'' where id = %L', v_draft));
  perform rw_test.affects('admin rejects with notes', 1, format('update public.products set status = ''rejected'', rejection_reason = ''Please add a close-up of the cuffs.'' where id = %L', v_draft));
  perform rw_test.fail('admin cannot send a piece back to draft', 'approve or reject', format('update public.products set status = ''draft'' where id = %L', v_draft));
  perform rw_test.fail('admin cannot mark a piece sold', 'final', format('update public.products set status = ''sold'' where id = %L', v_chore));
  perform rw_test.fail('admin cannot reopen a sold piece', 'final', format('update public.products set status = ''approved'' where id = %L', v_jeans));
  perform rw_test.fail('admin cannot reassign ownership', 'owner of a piece', format('update public.products set seller_id = %L where id = %L', rw_test.uid('buyer@rewear.test'), v_chore));
  perform rw_test.affects('admin can feature an approved piece', 1, format('update public.products set featured = true where id = %L', v_skirt));
  perform rw_test.affects('admin can add a category', 1, $q$insert into public.categories (slug, name, description, sort_order) values ('shoes', 'Shoes', 'Footwear with miles left.', 7)$q$ || ' on conflict do nothing');
  perform rw_test.affects('admin can rename a category', 1, $q$update public.categories set description = 'Footwear with more miles left.' where slug = 'shoes'$q$);

  perform rw_test.as_superuser();
  perform rw_test.eq('approval is stamped with the curator', (select (reviewed_by = rw_test.uid('admin@rewear.test'))::text from public.products where id = v_truck), 'true');
  perform rw_test.eq('approved piece carries no rejection notes', (select coalesce(rejection_reason, 'none') from public.products where id = v_truck), 'none');

  perform rw_test.as_user('seller@rewear.test');
  perform rw_test.eq('seller can read the curator notes', (select rejection_reason from public.products where id = v_draft), 'Please add a close-up of the cuffs.');
  perform rw_test.affects('seller resubmits after a rejection', 1, format('update public.products set status = ''pending'' where id = %L', v_draft));
  perform rw_test.as_superuser();
  perform rw_test.eq('resubmitting clears the old notes', (select coalesce(rejection_reason, 'none') from public.products where id = v_draft), 'none');

  ---------------------------------------------------------------------------
  raise notice '--- checkout: one-of-a-kind inventory';
  perform rw_test.as_user('buyer@rewear.test');
  select * into v_order from public.place_order(array[v_chore, v_skirt, v_chore], 'Dina Buyer', '0812345', 'Jl. Mawar 1', 'Bandung', '40111', 'bank_transfer');
  perform rw_test.eq('order total is the sum of the pieces (duplicates ignored)', v_order.total::text, '450000');
  perform rw_test.eq('order starts as pending', v_order.status::text, 'pending');
  perform rw_test.eq('order gets a readable number', (v_order.order_number ~ '^RW-[0-9]{4}-[0-9]{5}$')::text, 'true');
  perform rw_test.eq('piece 1 is now sold', rw_test.status_of(v_chore), 'sold');
  perform rw_test.eq('piece 2 is now sold', rw_test.status_of(v_skirt), 'sold');
  perform rw_test.rows('ordered pieces left the buyer''s cart', 0, 'select 1 from public.cart_items');
  perform rw_test.rows('buyer sees their order', 1, 'select 1 from public.orders');
  perform rw_test.rows('buyer sees both order items', 2, 'select 1 from public.order_items');
  perform rw_test.eq('order items keep a price snapshot', (select sum(price)::text from public.order_items where order_id = v_order.id), '450000');
  perform rw_test.eq('order items keep a title snapshot', (select title from public.order_items where product_id = v_chore), 'Washed denim chore jacket');
  perform rw_test.rows('order history starts with one event', 1, 'select 1 from public.order_status_events');
  perform rw_test.fail('buyer cannot change an order total', 'permission denied', format('update public.orders set total = 1 where id = %L', v_order.id));
  perform rw_test.affects('buyer cannot change an order status', 0, format('update public.orders set status = ''cancelled'' where id = %L', v_order.id));
  perform rw_test.fail('buyer cannot add items to an order', 'permission denied', 'insert into public.order_items (order_id, product_id, seller_id, title, price) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), ''x'', 1)');

  perform rw_test.as_user('buyer2@rewear.test');
  perform rw_test.fail('a sold piece cannot be bought again', 'PRODUCT_UNAVAILABLE', format('select public.place_order(array[%L]::uuid[], ''B'',''1'',''x'',''y'',''z'',''cod'')', v_chore));
  perform rw_test.fail('a piece sold earlier cannot be ordered', 'PRODUCT_UNAVAILABLE', format('select public.place_order(array[%L]::uuid[], ''B'',''1'',''x'',''y'',''z'',''cod'')', v_jeans));
  perform rw_test.fail('a pending piece cannot be ordered', 'PRODUCT_UNAVAILABLE', format('select public.place_order(array[%L]::uuid[], ''B'',''1'',''x'',''y'',''z'',''cod'')', v_blazer));
  perform rw_test.fail('an unknown piece cannot be ordered', 'PRODUCT_UNAVAILABLE', format('select public.place_order(array[%L]::uuid[], ''B'',''1'',''x'',''y'',''z'',''cod'')', v_bad));
  perform rw_test.fail('one unavailable piece fails the whole order', 'PRODUCT_UNAVAILABLE', format('select public.place_order(array[%L, %L]::uuid[], ''B'',''1'',''x'',''y'',''z'',''cod'')', v_trouser, v_chore));
  perform rw_test.eq('...and the available piece stays on sale (atomic)', rw_test.status_of(v_trouser), 'approved');
  perform rw_test.fail('an empty order is refused', 'EMPTY_ORDER', 'select public.place_order(array[]::uuid[], ''B'',''1'',''x'',''y'',''z'',''cod'')');
  perform rw_test.fail('a blank delivery field is refused', 'INVALID_INPUT', format('select public.place_order(array[%L]::uuid[], ''B'','' '',''x'',''y'',''z'',''cod'')', v_trouser));
  perform rw_test.fail('an unknown payment method is refused', 'INVALID_INPUT', format('select public.place_order(array[%L]::uuid[], ''B'',''1'',''x'',''y'',''z'',''bitcoin'')', v_trouser));
  perform rw_test.rows('another buyer cannot see the order', 0, 'select 1 from public.orders');
  perform rw_test.rows('another buyer cannot see its items', 0, 'select 1 from public.order_items');
  perform rw_test.rows('another buyer cannot see its history', 0, 'select 1 from public.order_status_events');

  perform rw_test.as_user('seller@rewear.test');
  perform rw_test.fail('a seller cannot buy their own piece', 'OWN_PRODUCT', format('select public.place_order(array[%L]::uuid[], ''S'',''1'',''x'',''y'',''z'',''cod'')', v_trouser));
  perform rw_test.rows('the selling seller sees the order (needs the address)', 1, 'select 1 from public.orders');
  perform rw_test.rows('...and their items in it', 2, 'select 1 from public.order_items');

  perform rw_test.as_user('seller2@rewear.test');
  perform rw_test.rows('an unrelated seller sees no orders', 0, 'select 1 from public.orders');
  perform rw_test.rows('an unrelated seller sees no order items', 0, 'select 1 from public.order_items');
  perform rw_test.affects('an unrelated seller cannot touch the order', 0, format('update public.orders set status = ''shipped'' where id = %L', v_order.id));

  perform rw_test.as_user('admin@rewear.test');
  perform rw_test.fail('a curator cannot place orders', 'FORBIDDEN', format('select public.place_order(array[%L]::uuid[], ''A'',''1'',''x'',''y'',''z'',''cod'')', v_trouser));
  perform rw_test.rows('admin sees the order', 1, 'select 1 from public.orders');

  ---------------------------------------------------------------------------
  raise notice '--- order status flow';
  perform rw_test.as_user('seller@rewear.test');
  perform rw_test.fail('seller cannot skip steps', 'cannot move from pending to shipped', format('update public.orders set status = ''shipped'' where id = %L', v_order.id));
  perform rw_test.fail('seller cannot start processing (admin step)', 'not allowed', format('update public.orders set status = ''processing'' where id = %L', v_order.id));
  perform rw_test.as_user('admin@rewear.test');
  perform rw_test.fail('admin cannot tamper with order data', 'permission denied', format('update public.orders set total = 1 where id = %L', v_order.id));
  perform rw_test.affects('admin records payment and starts processing', 1, format('update public.orders set status = ''processing'' where id = %L', v_order.id));
  perform rw_test.as_user('seller@rewear.test');
  perform rw_test.affects('seller marks the order shipped', 1, format('update public.orders set status = ''shipped'' where id = %L', v_order.id));
  perform rw_test.fail('seller cannot complete an order', 'not allowed', format('update public.orders set status = ''completed'' where id = %L', v_order.id));
  perform rw_test.as_user('admin@rewear.test');
  perform rw_test.fail('a shipped order cannot be cancelled', 'cannot move from shipped to cancelled', format('update public.orders set status = ''cancelled'' where id = %L', v_order.id));
  perform rw_test.affects('admin marks it delivered', 1, format('update public.orders set status = ''completed'' where id = %L', v_order.id));
  perform rw_test.fail('a completed order is final', 'cannot move from completed', format('update public.orders set status = ''pending'' where id = %L', v_order.id));
  perform rw_test.as_user('buyer@rewear.test');
  perform rw_test.rows('buyer sees the full timeline (pending, processing, shipped, completed)', 4, 'select 1 from public.order_status_events');
  perform rw_test.eq('completed pieces stay sold', rw_test.status_of(v_chore), 'sold');

  ---------------------------------------------------------------------------
  raise notice '--- cancellation puts a piece back on sale';
  perform rw_test.as_user('buyer2@rewear.test');
  select * into v_order2 from public.place_order(array[v_trouser], 'Buyer Two', '0899', 'Jl. Melati 2', 'Jakarta', '10110', 'e_wallet');
  perform rw_test.eq('buyer2 got the trousers', rw_test.status_of(v_trouser), 'sold');
  perform rw_test.as_user('admin@rewear.test');
  perform rw_test.affects('admin cancels the unpaid order', 1, format('update public.orders set status = ''cancelled'' where id = %L', v_order2.id));
  perform rw_test.eq('the trousers are back on the rack', rw_test.status_of(v_trouser), 'approved');
  perform rw_test.as_superuser();
  perform rw_test.eq('the cancelled sale is marked released', (select (released_at is not null)::text from public.order_items where order_id = v_order2.id), 'true');
  perform rw_test.as_user('buyer@rewear.test');
  select * into v_order3 from public.place_order(array[v_trouser], 'Dina Buyer', '0812345', 'Jl. Mawar 1', 'Bandung', '40111', 'cod');
  perform rw_test.eq('another buyer can now buy them', rw_test.status_of(v_trouser), 'sold');

  perform rw_test.as_superuser();
  perform rw_test.fail('the database itself refuses a second active sale', 'one_active_sale',
    format('insert into public.order_items (order_id, product_id, seller_id, title, price) values (%L, %L, %L, ''dup'', 1)', v_order.id, v_trouser, rw_test.uid('seller@rewear.test')));

  raise notice 'ALL CHECKS PASSED';
end $$;

rollback;
