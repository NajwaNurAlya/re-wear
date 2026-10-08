// Browser-side storage for the bag and the wishlist.
//   - mock mode: this IS the storage.
//   - Supabase mode: this is the guest list (signed out). When someone signs in, the guest items are merged into their
//     account lists and this storage is emptied, so nothing is left behind for the next person on a shared browser.
function createLocalList(key) {
  return {
    read() {
      try {
        const raw = JSON.parse(localStorage.getItem(key));
        return Array.isArray(raw) ? raw.filter((item) => item && typeof item.id === 'string') : [];
      } catch {
        return [];
      }
    },
    write(items) {
      try {
        localStorage.setItem(key, JSON.stringify(items));
      } catch {
        /* storage unavailable (private mode): the list still works for this session */
      }
    },
  };
}

export const localCart = createLocalList('rewear.cart');
export const localWishlist = createLocalList('rewear.wishlist');
