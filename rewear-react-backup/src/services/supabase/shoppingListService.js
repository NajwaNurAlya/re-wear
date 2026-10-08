// Shared adapter for the two per-user lists that hold products: cart_items and wishlist_items (Step 3C).
// Both tables are (user_id, product_id) with RLS "own rows only", so one factory serves both.
//
//   list(userId)              -> [{ id, title, brand, price, size, sellerId, image, status }]  oldest first
//   add(userId, productId)    -> void   (already there = success)
//   remove(userId, productId) -> void
//   clear(userId)             -> void
//
// The item shape is the same snapshot the in-browser lists use, plus `status`, so the UI can flag a piece that has since sold.
import { supabase } from './client';

const PRODUCT_COLUMNS = 'id, title, brand, price, size, seller_id, images, status';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function toItem(row) {
  const product = row.product;
  if (!product) return null; // the piece is no longer visible to this account (e.g. pulled back to review)
  return {
    id: product.id,
    title: product.title,
    brand: product.brand ?? '',
    price: Number(product.price ?? 0),
    size: product.size ?? '',
    sellerId: product.seller_id,
    image: product.images?.[0] ?? null,
    status: product.status,
  };
}

function fail(error, what) {
  if (import.meta.env.DEV) console.warn(`[supabase ${what}]`, error?.code ?? error?.name, error?.message);
  const wrapped = new Error(`Your ${what} could not be updated right now.`);
  wrapped.code = error?.code;
  wrapped.cause = error;
  return wrapped;
}

export function createShoppingList(table, what) {
  return {
    async list(userId) {
      const { data, error } = await requireClient()
        .from(table)
        .select(`created_at, product:products ( ${PRODUCT_COLUMNS} )`)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw fail(error, what);
      return (data ?? []).map(toItem).filter(Boolean);
    },

    async add(userId, productId) {
      const { error } = await requireClient().from(table).insert({ user_id: userId, product_id: productId });
      if (error && error.code !== '23505') throw fail(error, what); // 23505 = already saved, which is fine
    },

    async remove(userId, productId) {
      const { error } = await requireClient().from(table).delete().eq('user_id', userId).eq('product_id', productId);
      if (error) throw fail(error, what);
    },

    async clear(userId) {
      const { error } = await requireClient().from(table).delete().eq('user_id', userId);
      if (error) throw fail(error, what);
    },
  };
}
