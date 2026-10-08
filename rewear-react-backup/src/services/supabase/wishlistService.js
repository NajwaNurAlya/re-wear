import { createShoppingList } from './shoppingListService';

// public.wishlist_items. RLS: buyers and sellers only, approved pieces only. A saved piece that later sells stays listed.
export const { list, add, remove, clear } = createShoppingList('wishlist_items', 'wishlist');
