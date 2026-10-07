import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const WishlistContext = createContext(null);

const STORAGE_KEY = 'rewear.wishlist';

const snapshot = (p) => ({ id: p.id, title: p.title, brand: p.brand, price: p.price, size: p.size, image: p.images?.[0] ?? null });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * STEP 7 FOUNDATION: in-browser wishlist (localStorage). Replaced by the Supabase-backed
 * wishlist in Step 9/12 behind the same API.
 *   const wishlist = useWishlist();
 *   wishlist.toggle(product) -> true when the piece is now saved, false when it was removed
 */
export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable: the wishlist still works for this session */
    }
  }, [items]);

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const has = useCallback((id) => ids.has(id), [ids]);

  const toggle = useCallback(
    (product) => {
      const saved = !ids.has(product.id);
      setItems((list) => (list.some((i) => i.id === product.id) ? list.filter((i) => i.id !== product.id) : [...list, snapshot(product)]));
      return saved;
    },
    [ids]
  );

  const remove = useCallback((id) => setItems((list) => list.filter((i) => i.id !== id)), []);

  const value = useMemo(
    () => ({ items, ids, count: items.length, has, toggle, remove }),
    [items, ids, has, toggle, remove]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
