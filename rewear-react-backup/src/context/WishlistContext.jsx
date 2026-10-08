import { createContext, useCallback, useMemo } from 'react';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useToast } from '@/hooks/useToast';
import { localWishlist, wishlistService } from '@/services';

export const WishlistContext = createContext(null);

const snapshot = (p) => ({ id: p.id, title: p.title, brand: p.brand, price: p.price, size: p.size, image: p.images?.[0] ?? null, status: p.status });

/**
 * The wishlist. Signed-in buyers and sellers keep it in their account (Supabase); guests, admins and mock mode keep it
 * in this browser. Same API either way:
 *   const wishlist = useWishlist();
 *   wishlist.toggle(product) -> true when the piece is now saved, false when it was removed
 */
export function WishlistProvider({ children }) {
  const toast = useToast();
  const onError = useCallback((kind) => {
    toast.error(
      kind === 'load'
        ? 'Your wishlist could not be loaded. Please refresh the page.'
        : kind === 'add'
          ? 'This piece could not be saved. It may no longer be available.'
          : 'That change could not be saved. Please try again.',
      { title: 'Wishlist' }
    );
  }, [toast]);

  const list = useShoppingList({ local: localWishlist, remote: wishlistService, onError });
  const { items, addItem, removeItem } = list;

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const toggle = useCallback(
    (product) => {
      if (ids.has(product.id)) {
        removeItem(product.id);
        return false;
      }
      addItem(snapshot(product));
      return true;
    },
    [ids, addItem, removeItem]
  );

  const value = useMemo(
    () => ({ items, ids, count: items.length, has: list.has, toggle, remove: removeItem }),
    [items, ids, list.has, toggle, removeItem]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
