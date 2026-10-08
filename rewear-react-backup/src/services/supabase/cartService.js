import { createShoppingList } from './shoppingListService';

// public.cart_items. RLS: buyers and sellers only, approved pieces only, never your own listing.
export const { list, add, remove, clear } = createShoppingList('cart_items', 'bag');
