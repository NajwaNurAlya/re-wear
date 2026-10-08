-- RE:WEAR  ·  Migration 5 of 5  ·  Admin manual product status
--
-- Curators may manually mark an approved piece as sold, without creating a fake order,
-- and may restore a manually-sold piece when no active order owns it. Completed or
-- otherwise active order history must stay authoritative and be handled through the
-- order workflow.

create function public.admin_set_product_status(
  p_product_id uuid,
  p_status public.product_status
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'Only admins can update product availability.' using errcode = '42501';
  end if;

  if p_status not in ('approved', 'sold') then
    raise exception 'Manual product status must be approved or sold.' using errcode = 'P0001';
  end if;

  select * into v_product
    from public.products
   where id = p_product_id
   for update;

  if not found then
    raise exception 'Product not found.' using errcode = 'P0001';
  end if;

  if v_product.status = p_status then
    return v_product;
  end if;

  if v_product.status not in ('approved', 'sold') then
    raise exception 'Only approved or sold products can be updated manually.' using errcode = 'P0001';
  end if;

  if v_product.status = 'approved' and p_status <> 'sold' then
    raise exception 'Approved products can only be marked as sold.' using errcode = 'P0001';
  end if;

  if v_product.status = 'sold' and p_status <> 'approved' then
    raise exception 'Sold products can only be restored to approved.' using errcode = 'P0001';
  end if;

  if p_status = 'approved' and exists (
    select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where oi.product_id = p_product_id
       and oi.released_at is null
       and o.status <> 'cancelled'
  ) then
    raise exception 'This product has an order. Use the order workflow before restoring it.' using errcode = 'P0001';
  end if;

  update public.products
     set status = p_status,
         rejection_reason = null,
         reviewed_by = case when p_status = 'approved' then auth.uid() else reviewed_by end,
         reviewed_at = case when p_status = 'approved' then now() else reviewed_at end
   where id = p_product_id
   returning * into v_product;

  return v_product;
end;
$$;

revoke all on function public.admin_set_product_status(uuid, public.product_status) from public, anon;
grant execute on function public.admin_set_product_status(uuid, public.product_status) to authenticated;
