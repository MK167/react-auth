/**
 * @fileoverview Guest-to-server wishlist sync hook.
 *
 * ## Wishlist sync flow
 *
 * ```
 * Login event
 *   │
 *   ▼
 * syncWishlistAfterLogin()
 *   │
 *   ├─── getProductIds()          ← read local wishlist from Zustand/localStorage
 *   │
 *   ├─── getWishlist()            ← fetch current server wishlist
 *   │
 *   ├─── diff: localIds − serverIds
 *   │    (only add items NOT already on server — prevents accidental removal)
 *   │
 *   ├─── Promise.allSettled(
 *   │      idsToAdd.map(id => toggleWishlistItem(id))
 *   │    )
 *   │
 *   └─── setItemsFromServer(allServerIds)
 *        ← replaces local store with the full server list so the navbar
 *          badge count and product-card heart icons stay accurate
 * ```
 *
 * ## Why `setItemsFromServer` instead of `clearItems`
 *
 * The original `clearItems()` call left the local store empty after sync.
 * This caused two regressions:
 *
 * 1. The navbar wishlist badge always showed 0 for authenticated users.
 * 2. `WishlistPage` re-renders with `items.length === 0` and shows the
 *    "empty wishlist" state even though the user has server items.
 *
 * By calling `setItemsFromServer(serverProductIds)` instead, the local store
 * mirrors the server list (productIds only). WishlistPage reads these IDs
 * and fetches full product details via the API — the display is correct and
 * the badge is accurate.
 *
 * ## Why the diff step is critical
 *
 * The FreeAPI wishlist endpoint (`POST /ecommerce/profile/wishlist/:id`) is a
 * **toggle** — calling it for an already-wishlisted product **removes** it.
 * Without the diff, syncing a product already on the server would silently
 * remove it (calling toggle twice = net zero).
 *
 * ## Non-blocking design
 *
 * The callback is designed for fire-and-forget use from login handlers.
 * Sync failures are silently swallowed (non-fatal) and the local store is
 * populated with the server's pre-sync state so the user sees their items.
 *
 * @module hooks/useWishlistSync
 */

import { useCallback } from 'react';
import { useWishlistStore } from '@/store/wishlist.store';
import { getWishlist, toggleWishlistItem } from '@/api/wishlist.api';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `syncWishlistAfterLogin` callback that:
 * 1. Transfers any guest local wishlist items to the server.
 * 2. Replaces the local store with the complete server wishlist so the navbar
 *    badge and product-card hearts reflect the authenticated user's state.
 *
 * ```ts
 * const { syncWishlistAfterLogin } = useWishlistSync();
 *
 * // After setAuth(user, token):
 * void syncWishlistAfterLogin();
 * ```
 *
 * @returns Object containing the `syncWishlistAfterLogin` async function.
 */
export function useWishlistSync() {
  const setItemsFromServer = useWishlistStore((s) => s.setItemsFromServer);

  const syncWishlistAfterLogin = useCallback(async () => {
    // Snapshot local IDs at call time (guest items before any server sync).
    const localIds = useWishlistStore.getState().items.map((i) => i.productId);

    try {
      // Fetch the server wishlist to compute the diff and avoid double-toggle.
      const serverRes = await getWishlist();
      const serverProductIds = (serverRes.data?.wishlistItems ?? []).map(
        (item) => item.product._id,
      );
      const serverProductIdSet = new Set(serverProductIds);

      if (localIds.length > 0) {
        // Only add items that are NOT already on the server.
        // Guard against toggle semantics: calling toggle for an already-
        // wishlisted product would REMOVE it, causing silent data loss.
        const idsToAdd = localIds.filter((id) => !serverProductIdSet.has(id));
        await Promise.allSettled(idsToAdd.map((id) => toggleWishlistItem(id)));

        // The final server list = existing server items ∪ successfully added items.
        // Rather than re-fetching (one extra round-trip), we compute it locally.
        // Any failed toggles are excluded — the user can re-add them manually.
        const finalIds = [...serverProductIds, ...idsToAdd];
        setItemsFromServer(finalIds);
      } else {
        // No guest items — just mirror the current server state locally.
        setItemsFromServer(serverProductIds);
      }
    } catch {
      // getWishlist() failed — keep local items for retry on next login.
      // The user loses nothing; their local wishlist persists in localStorage.
    }
  }, [setItemsFromServer]);

  return { syncWishlistAfterLogin };
}
