-- RE:WEAR  ·  Migration 2 of 3  ·  Inventory (one-of-a-kind) and business-rule guards
--
-- RLS decides WHO may touch a row. These triggers decide WHAT changes are legal
-- (product lifecycle, order status flow), because RLS cannot compare old and new values.
--
-- Convention used below: guards only restrict calls made through the API roles
-- ('authenticated' / 'anon'). SECURITY DEFINER functions (place_order, the cancel release) and
-- maintenance work from the SQL editor / service role run as a different role and are not blocked,
-- which is how a piece is allowed to become 'sold' while no client ever can.

-- ---------------------------------------------------------------------------
-- Order ownership helpers (used by RLS in migration 3).
-- SECURITY DEFINER avoids policy recursion between orders <-> order_items.
-- ---------------------------------------------------------------------------
create function public.is_order_buyer(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.orders o where o.id = p_order_id and o.buyer_id = auth.uid());
$$;

create function public.is_order_seller(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.order_items i where i.order_id = p_order_id and i.seller_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Product lifecycle guard
--
--   Seller:  draft | rejected | approved  ->  draft | pending     (never approved/rejected/sold)
--   Admin:   pending | approved | rejected  ->  approved | rejected, with notes when rejecting
--   Nobody through the API can move a piece to or from 'sold'. Only place_order() / cancellation can.
-- ---------------------------------------------------------------------------
create function public.guard_product_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;                                   -- definer functions, SQL editor, service role
  end if;

  v_is_admin := public.is_admin();

  if tg_op = 'INSERT' then
    if new.status = 'sold' then
      raise exception 'A piece cannot be created as sold.' using errcode = 'P0001';
    end if;
    if not v_is_admin then
      new.featured         := false;
      new.rejection_reason := null;
      new.reviewed_by      := null;
      new.reviewed_at      := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.id is distinct from old.id or new.seller_id is distinct from old.seller_id then
    raise exception 'The owner of a piece cannot be changed.' using errcode = 'P0001';
  end if;
  new.created_at := old.created_at;

  if old.status = 'sold' or new.status = 'sold' then
    raise exception 'Sold pieces are final and cannot be edited.' using errcode = 'P0001';
  end if;

  if v_is_admin then
    if new.status is distinct from old.status then
      if new.status not in ('approved', 'rejected') or old.status = 'draft' then
        raise exception 'Curators can only approve or reject pieces that were submitted for review.' using errcode = 'P0001';
      end if;
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      if new.status = 'approved' then
        new.rejection_reason := null;
      end if;
    end if;
    if new.status <> 'approved' then
      new.featured := false;
    end if;
  else
    -- The owning seller (RLS already guarantees ownership). Protected columns are not theirs to set.
    if new.status not in ('draft', 'pending') then
      raise exception 'Sellers can only save drafts or submit pieces for review.' using errcode = 'P0001';
    end if;
    new.featured         := false;
    new.rejection_reason := null;                 -- editing or resubmitting clears the old curator notes
    new.reviewed_by      := null;
    new.reviewed_at      := null;
  end if;

  return new;
end;
$$;

create trigger products_guard_write
  before insert or update on public.products
  for each row execute function public.guard_product_write();

-- ---------------------------------------------------------------------------
-- Order guard: through the API only `status` can change, and only along the real flow.
--
--   pending    -> paid | processing | cancelled
--   paid       -> processing | cancelled
--   processing -> shipped | cancelled
--   shipped    -> completed
--
--   Admin: any legal step.      Seller of an item in the order: processing -> shipped only.
--   (The mock skips 'paid': "Record payment & prepare" goes pending -> processing.)
-- ---------------------------------------------------------------------------
create function public.guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_legal boolean;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Only the status of an order can be changed.' using errcode = 'P0001';
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_legal := case old.status
    when 'pending'    then new.status in ('paid', 'processing', 'cancelled')
    when 'paid'       then new.status in ('processing', 'cancelled')
    when 'processing' then new.status in ('shipped', 'cancelled')
    when 'shipped'    then new.status = 'completed'
    else false
  end;
  if not v_legal then
    raise exception 'An order cannot move from % to %.', old.status, new.status using errcode = 'P0001';
  end if;

  if public.is_admin() then
    return new;
  end if;

  if public.is_order_seller(old.id) and old.status = 'processing' and new.status = 'shipped' then
    return new;
  end if;

  raise exception 'You are not allowed to make this order update.' using errcode = '42501';
end;
$$;

create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

-- ---------------------------------------------------------------------------
-- Order history + releasing pieces when an order is cancelled
-- ---------------------------------------------------------------------------
create function public.record_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_status_events (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());
  return null;
end;
$$;

create trigger orders_record_status_insert
  after insert on public.orders
  for each row execute function public.record_order_status();

create trigger orders_record_status_update
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.record_order_status();

-- A cancelled order puts its pieces back on sale (they were one-of-a-kind and are still unsold).
create function public.release_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.order_items
     set released_at = now()
   where order_id = new.id and released_at is null;

  update public.products
     set status = 'approved'
   where status = 'sold'
     and id in (select product_id from public.order_items where order_id = new.id);

  return null;
end;
$$;

create trigger orders_release_on_cancel
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.release_cancelled_order();

-- ---------------------------------------------------------------------------
-- place_order: the ONLY way an order comes into existence.
--
-- One transaction: lock the pieces, check each is still approved and not the buyer's own,
-- write the order + price/title snapshots, mark every piece 'sold', clear them from the buyer's cart.
-- If two buyers race for the same piece, the second one waits on the row lock, then sees 'sold' and fails
-- with PRODUCT_UNAVAILABLE. Nothing is written in that case.
--
-- Error messages are stable codes the adapter can map to friendly text:
--   NOT_AUTHENTICATED · FORBIDDEN · EMPTY_ORDER · INVALID_INPUT · PRODUCT_UNAVAILABLE · OWN_PRODUCT
-- ---------------------------------------------------------------------------
create function public.place_order(
  p_product_ids    uuid[],
  p_recipient      text,
  p_phone          text,
  p_address_line   text,
  p_city           text,
  p_postal_code    text,
  p_payment_method text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_role        public.app_role;
  v_ids         uuid[];
  v_missing     text;
  v_unavailable text;
  v_total       integer;
  v_order       public.orders;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  v_role := public.current_app_role();
  if v_role is null or v_role = 'admin' then
    raise exception 'FORBIDDEN' using errcode = '42501', detail = 'Curator accounts cannot place orders.';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_product_ids) as x where x is not null;
  if cardinality(v_ids) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_recipient, '')) = '' or btrim(coalesce(p_phone, '')) = ''
     or btrim(coalesce(p_address_line, '')) = '' or btrim(coalesce(p_city, '')) = ''
     or btrim(coalesce(p_postal_code, '')) = '' or p_payment_method not in ('bank_transfer', 'e_wallet', 'cod') then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  -- Lock in a stable order so two overlapping carts cannot deadlock each other.
  perform 1 from public.products where id = any (v_ids) order by id for update;

  select string_agg(i::text, ',') into v_missing
    from unnest(v_ids) as i
   where not exists (select 1 from public.products p where p.id = i);
  select string_agg(p.id::text, ',') into v_unavailable
    from public.products p
   where p.id = any (v_ids) and p.status <> 'approved';
  if v_missing is not null or v_unavailable is not null then
    raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001', detail = concat_ws(',', v_missing, v_unavailable);
  end if;

  if exists (select 1 from public.products p where p.id = any (v_ids) and p.seller_id = v_uid) then
    raise exception 'OWN_PRODUCT' using errcode = 'P0001', detail = 'You cannot buy your own listing.';
  end if;

  select sum(p.price)::integer into v_total from public.products p where p.id = any (v_ids);

  insert into public.orders (buyer_id, total, payment_method, recipient, phone, address_line, city, postal_code)
  values (v_uid, v_total, p_payment_method, btrim(p_recipient), btrim(p_phone), btrim(p_address_line), btrim(p_city), btrim(p_postal_code))
  returning * into v_order;

  insert into public.order_items (order_id, product_id, seller_id, title, brand, size, image, price)
  select v_order.id, p.id, p.seller_id, p.title, p.brand, p.size, p.images[1], p.price
    from public.products p
   where p.id = any (v_ids);

  update public.products set status = 'sold' where id = any (v_ids);

  delete from public.cart_items where user_id = v_uid and product_id = any (v_ids);

  return v_order;
end;
$$;

revoke all on function public.place_order(uuid[], text, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(uuid[], text, text, text, text, text, text) to authenticated;
