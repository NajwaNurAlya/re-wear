import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { PRODUCT_STATUS } from '@/constants';

export const CartContext = createContext(null);

const STORAGE_KEY = 'rewear.cart';

// Every piece is one of a kind, so the cart holds each piece at most once (no quantities).
// It keeps a small snapshot of the piece so the cart page can render without refetching.
const snapshot = (p) => ({ id: p.id, title: p.title, brand: p.brand, price: p.price, size: p.size, sellerId: p.sellerId, image: p.images?.[0] ?? null });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * STEP 7 FOUNDATION: in-browser cart (localStorage). Replaced by the Supabase-backed
 * cart in Step 9/12 behind the same API.
 *   const cart = useCart();
 *   cart.add(product)  -> { ok: true } | { ok: false, reason: 'sold' | 'in-cart' }
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable (private mode): the cart still works for this session */
    }
  }, [items]);

  const has = useCallback((id) => items.some((i) => i.id === id), [items]);

  const add = useCallback(
    (product) => {
      if (product.status === PRODUCT_STATUS.SOLD) return { ok: false, reason: 'sold' };
      if (items.some((i) => i.id === product.id)) return { ok: false, reason: 'in-cart' };
      setItems((list) => [...list, snapshot(product)]);
      return { ok: true };
    },
    [items]
  );

  const remove = useCallback((id) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.length, total: items.reduce((sum, i) => sum + i.price, 0), has, add, remove, clear }),
    [items, has, add, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
