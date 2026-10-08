// Supabase order adapter (Step 3D). Same functions and shapes as services/mock/orderService.js:
//
//   listOrders()                 -> all orders visible to the caller (admin: everything)
//   listBuyerOrders(userId)      -> the buyer's orders
//   listSellerOrders(sellerId)   -> orders containing the seller's pieces, each with ONLY that seller's items
//   getOrder(id)                 -> order | null
//   createOrder({ items, address, paymentMethod }) -> order     (calls public.place_order, the only way an order exists)
//   updateOrderStatus(id, status) -> order | null
//
// order = { id (uuid, for routes), orderNumber (RW-2610-00042, for display), buyerId, buyerName, items, address,
//           paymentMethod, total, status, createdAt, events: { status: ISO date } }
// item  = { id (product id), title, brand, size, price, sellerId, image }
//
// What is allowed is decided by the database (RLS + place_order + guard_order_update), never by this file.
import { supabase } from './client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_SELECT = `
  id, order_number, buyer_id, status, total, payment_method,
  recipient, phone, address_line, city, postal_code, created_at,
  order_items ( product_id, seller_id, title, brand, size, image, price ),
  order_status_events ( status, created_at ),
  buyer:profiles!buyer_id ( full_name )
`;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapOrder(row) {
  const events = {};
  for (const event of [...(row.order_status_events ?? [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))) {
    if (!events[event.status]) events[event.status] = event.created_at;
  }
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    // Admins can read the buyer's profile; for everyone else the delivery recipient is the name that matters.
    buyerName: row.buyer?.full_name || row.recipient,
    items: (row.order_items ?? []).map((item) => ({
      id: item.product_id,
      title: item.title,
      brand: item.brand ?? '',
      size: item.size ?? '',
      price: Number(item.price ?? 0),
      sellerId: item.seller_id,
      image: item.image ?? null,
    })),
    address: {
      recipient: row.recipient,
      phone: row.phone,
      line: row.address_line,
      city: row.city,
      postalCode: row.postal_code,
    },
    paymentMethod: row.payment_method,
    total: Number(row.total ?? 0),
    status: row.status,
    createdAt: row.created_at,
    events,
  };
}

function fail(error, fallback = 'Orders could not be loaded right now. Please try again.') {
  if (import.meta.env.DEV) console.warn('[supabase orders]', error?.code ?? error?.name, error?.message);
  const message = error?.code === '42501' ? 'You are not allowed to do that.' : fallback;
  const wrapped = new Error(message);
  wrapped.code = error?.code;
  wrapped.cause = error;
  return wrapped;
}

async function fetchOrders(build) {
  const client = requireClient();
  const { data, error } = await build(client.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }));
  if (error) throw fail(error);
  return (data ?? []).map(mapOrder);
}

export const listOrders = () => fetchOrders((query) => query);

export async function listBuyerOrders(userId) {
  if (!userId) return [];
  return fetchOrders((query) => query.eq('buyer_id', userId));
}

export async function listSellerOrders(sellerId) {
  if (!sellerId) return [];
  // RLS already limits a seller to orders that contain their pieces (and to their own order_items rows).
  const orders = await fetchOrders((query) => query);
  return orders
    .map((order) => ({ ...order, items: order.items.filter((item) => item.sellerId === sellerId) }))
    .filter((order) => order.items.length > 0);
}

export async function getOrder(id) {
  if (!id || !UUID.test(id)) return null;
  const client = requireClient();
  const { data, error } = await client.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw fail(error);
  return data ? mapOrder(data) : null;
}

// place_order raises stable codes (see supabase/README.md). Map each to something a buyer can act on.
function placeOrderError(error) {
  if (import.meta.env.DEV) console.warn('[supabase place_order]', error?.code ?? error?.name, error?.message);
  const text = String(error?.message ?? '');
  const has = (code) => text.includes(code);
  let message = 'We could not place this order. Please try again.';
  if (has('NOT_AUTHENTICATED')) message = 'Please log in to place an order.';
  else if (has('FORBIDDEN')) message = 'Curator accounts cannot place orders.';
  else if (has('EMPTY_ORDER')) message = 'Your bag is empty.';
  else if (has('INVALID_INPUT')) message = 'Please check your delivery details and payment method.';
  else if (has('OWN_PRODUCT')) message = 'You cannot buy your own listing. Remove it from your bag.';
  else if (has('PRODUCT_UNAVAILABLE')) message = 'One or more pieces were just taken or are no longer available. They are marked in your bag.';
  else if (error?.code === '22P02') message = 'Your bag contains an item that is no longer valid. Remove it and try again.';
  else if (error?.name === 'TypeError' || error?.code === '') message = 'Could not reach the server. Check your connection and try again.';

  const wrapped = new Error(message);
  wrapped.code = has('PRODUCT_UNAVAILABLE') ? 'PRODUCT_UNAVAILABLE' : error?.code;
  // The database lists the offending product ids in DETAIL (comma separated).
  wrapped.unavailableIds = has('PRODUCT_UNAVAILABLE')
    ? String(error?.details ?? '').split(',').map((part) => part.trim()).filter((part) => UUID.test(part))
    : [];
  wrapped.cause = error;
  return wrapped;
}

export async function createOrder({ items, address, paymentMethod }) {
  const client = requireClient();
  const productIds = (items ?? []).map((item) => item.id);
  if (!productIds.length) throw new Error('Your bag is empty.');

  const { data, error } = await client.rpc('place_order', {
    p_product_ids: productIds,
    p_recipient: address?.recipient ?? '',
    p_phone: address?.phone ?? '',
    p_address_line: address?.line ?? '',
    p_city: address?.city ?? '',
    p_postal_code: address?.postalCode ?? '',
    p_payment_method: paymentMethod ?? '',
  });
  if (error) throw placeOrderError(error);

  // The order exists now. If the follow-up read fails, still hand back enough to show the confirmation page.
  try {
    return (await getOrder(data.id)) ?? { id: data.id, orderNumber: data.order_number, status: data.status };
  } catch {
    return { id: data.id, orderNumber: data.order_number, status: data.status };
  }
}

export async function updateOrderStatus(id, status) {
  if (!id || !UUID.test(id)) return null;
  const client = requireClient();
  const { data, error } = await client.from('orders').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error) {
    // guard_order_update raises readable P0001 messages ("An order cannot move from shipped to pending.").
    throw error.code === 'P0001' ? Object.assign(new Error(error.message), { code: error.code }) : fail(error, 'The order could not be updated. Please try again.');
  }
  if (!data) return null; // no row matched: not visible to this account
  return getOrder(id);
}
