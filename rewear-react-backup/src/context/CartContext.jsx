import { createContext, useCallback, useMemo } from 'react';
import { PRODUCT_STATUS } from '@/constants';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useToast } from '@/hooks/useToast';
import { cartService, localCart } from '@/services';

export const CartContext = createContext(null);

// Every piece is one of a kind, so the bag holds each piece at most once (no quantities).
// It keeps a small snapshot of the piece so the cart page can render without refetching.
const snapshot = (p) => ({ id: p.id, title: p.title, brand: p.brand, price: p.price, size: p.size, sellerId: p.sellerId, image: p.images?.[0] ?? null, status: p.status });

// A piece can sell while it sits in somebody's bag. Those lines stay visible but are not part of the order.
const isAvailable = (item) => !item.status || item.status === PRODUCT_STATUS.APPROVED;

/**
 * The bag. Signed-in buyers and sellers keep it in their account (Supabase); guests, admins and mock mode keep it in
 * this browser. Same API either way:
 *   const cart = useCart();
 *   cart.add(product)  -> { ok: true } | { ok: false, reason: 'sold' | 'in-cart' | 'own' }
 *   cart.items         every line, including pieces that sold since (item.status === 'sold')
 *   cart.available     the lines that can still be ordered; `total` and checkout use these
 *   cart.refresh()     re-reads the bag from the server
 */
export function CartProvider({ children }) {
  const toast = useToast();
  const onError = useCallback((kind) => {
    toast.error(
      kind === 'load' ? 'Your bag could not be loaded. Please refresh the page.' : 'That change could not be saved. Please try again.',
      { title: 'Bag' }
    );
  }, [toast]);

  const list = useShoppingList({ local: localCart, remote: cartService, onError });
  const { items, userId, addItem, removeItem, clearItems, refresh, syncing } = list;

  const add = useCallback(
    (product) => {
      if (product.status === PRODUCT_STATUS.SOLD) return { ok: false, reason: 'sold' };
      if (userId && product.sellerId === userId) return { ok: false, reason: 'own' };
      return addItem(snapshot(product)) ? { ok: true } : { ok: false, reason: 'in-cart' };
    },
    [addItem, userId]
  );

  const value = useMemo(() => {
    const available = items.filter(isAvailable);
    return {
      items,
      available,
      count: items.length,
      total: available.reduce((sum, i) => sum + i.price, 0),
      syncing,
      has: list.has,
      add,
      remove: removeItem,
      clear: clearItems,
      refresh,
    };
  }, [items, syncing, list.has, add, removeItem, clearItems, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
