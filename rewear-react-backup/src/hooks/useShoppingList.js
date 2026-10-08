import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROLES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';

/**
 * State and persistence shared by the bag and the wishlist.
 *
 *   local   { read(), write(items) }                        browser storage (guests, and everyone in mock mode)
 *   remote  { list, add, remove, clear } | null             per-account storage (Supabase). null in mock mode.
 *
 * Who is stored where:
 *   - signed out, admin, or mock mode      -> `local`
 *   - signed-in buyer or seller (Supabase) -> `remote`. On sign-in the guest items are merged into the account first,
 *     then the local copy is emptied, so a shared browser never leaks one person's list to the next.
 *
 * Updates are optimistic: the UI changes at once and the call returns synchronously. If the server refuses
 * (for example the piece sold meanwhile), the change is rolled back and `onError(kind)` is called.
 */
export function useShoppingList({ local, remote, onError }) {
  const { user, role, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const useRemote = Boolean(remote && userId && (role === ROLES.BUYER || role === ROLES.SELLER));

  const [items, setItems] = useState(() => local.read());
  const [syncing, setSyncing] = useState(false);
  const itemsRef = useRef(items);
  const remoteRef = useRef({ useRemote, userId });
  remoteRef.current = { useRemote, userId };

  const replace = useCallback((next, { persist = true } = {}) => {
    itemsRef.current = next;
    setItems(next);
    if (persist && !remoteRef.current.useRemote) local.write(next);
  }, [local]);

  const load = useCallback(async (isActive = () => true) => {
    if (!useRemote) {
      replace(local.read(), { persist: false });
      setSyncing(false);
      return;
    }
    setSyncing(true);
    try {
      const guest = local.read();
      if (guest.length) {
        // Items the account cannot hold (sold meanwhile, your own listing) are skipped; the rest move over.
        await Promise.allSettled(guest.map((item) => remote.add(userId, item.id)));
        local.write([]);
      }
      const list = await remote.list(userId);
      if (isActive()) replace(list, { persist: false });
    } catch {
      if (isActive()) {
        replace([], { persist: false });
        onError?.('load');
      }
    } finally {
      if (isActive()) setSyncing(false);
    }
  }, [useRemote, userId, local, remote, replace, onError]);

  useEffect(() => {
    if (authLoading) return undefined;
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [authLoading, useRemote, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const has = useCallback((id) => items.some((item) => item.id === id), [items]);

  /** Adds `item` (already a snapshot). Returns false when it is already there. Rolls back if the server refuses. */
  const addItem = useCallback((item) => {
    if (itemsRef.current.some((entry) => entry.id === item.id)) return false;
    replace([...itemsRef.current, item]);
    if (remoteRef.current.useRemote) {
      remote.add(remoteRef.current.userId, item.id).catch(() => {
        replace(itemsRef.current.filter((entry) => entry.id !== item.id));
        onError?.('add');
      });
    }
    return true;
  }, [remote, replace, onError]);

  const removeItem = useCallback((id) => {
    const before = itemsRef.current;
    if (!before.some((entry) => entry.id === id)) return;
    replace(before.filter((entry) => entry.id !== id));
    if (remoteRef.current.useRemote) {
      remote.remove(remoteRef.current.userId, id).catch(() => {
        replace(before);
        onError?.('remove');
      });
    }
  }, [remote, replace, onError]);

  const clearItems = useCallback(() => {
    const before = itemsRef.current;
    replace([]);
    if (remoteRef.current.useRemote) {
      remote.clear(remoteRef.current.userId).catch(() => {
        replace(before);
        onError?.('remove');
      });
    }
  }, [remote, replace, onError]);

  const refresh = useCallback(() => load(), [load]);

  return useMemo(
    () => ({ items, syncing, userId, has, addItem, removeItem, clearItems, refresh }),
    [items, syncing, userId, has, addItem, removeItem, clearItems, refresh]
  );
}
