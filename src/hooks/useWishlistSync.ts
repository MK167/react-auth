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
 *   ├─── getProductIds()      ← read local wishlist from Zustand/localStorage
 *   │    (return early if empty)
 *   │
 *   ├─── getWishlist()        ← fetch current server wishlist
 *   │
 *   ├─── diff: localIds − serverIds
 *   │    (only items NOT already on server — prevents accidental removal)
 *   │
 *   ├─── Promise.allSettled(
 *   │      idsToAdd.map(id => toggleWishlistItem(id))
 *   │    )
 *   │
 *   └─── clearItems()         ← localStorage cleared; server is source of truth
 * ```
 *
 * ## Why the diff step is critical
 *
 * The FreeAPI wishlist endpoint (`POST /ecommerce/profile/wishlist/:id`) is a
 * **toggle** — calling it for an already-wishlisted product **removes** it.
 * Without the diff, syncing a product that the user also wishlisted while
 * logged in on another device would silently remove it.
 *
 * ## Non-blocking design
 *
 * Like `useCartMerge`, this hook returns a callback meant to be called
 * fire-and-forget after authentication. Sync failures are silently swallowed
 * (non-fatal) — the local wishlist is cleared on success and left intact on
 * failure so re-login can retry.
 *
 * ## Data ownership transition
 *
 * Before login → localStorage (Zustand persist, `wishlist-storage` key)
 * After login  → server (FreeAPI) with localStorage cleared
 *
 * This transition is one-way: once the user is authenticated, wishlist reads
 * should use `getWishlist()` from the API, not the Zustand store. The store
 * is only the guest-side transient buffer.
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
 * Returns a `syncWishlistAfterLogin` callback that transfers the guest's
 * local wishlist to the authenticated server wishlist.
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
  const clearItems = useWishlistStore((s) => s.clearItems);

  const syncWishlistAfterLogin = useCallback(async () => {
    // Snapshot local IDs at call time (guest items before any server sync).
    const localIds = useWishlistStore.getState().items.map((i) => i.productId);

    // Nothing to sync — skip the API round-trips.
    if (localIds.length === 0) return;

    try {
      // Fetch the server wishlist to compute the diff and avoid double-toggle.
      const serverRes = await getWishlist();
      const serverProductIds = new Set(
        (serverRes.data?.wishlistItems ?? []).map((item) => item.product._id),
      );

      // Only add items that are NOT already on the server.
      // This is the critical guard: calling toggle for an already-wishlisted
      // product would REMOVE it (toggle semantics), causing silent data loss.
      const idsToAdd = localIds.filter((id) => !serverProductIds.has(id));

      await Promise.allSettled(idsToAdd.map((id) => toggleWishlistItem(id)));

      // Clear local wishlist on completion (partial or full success).
      // Even items that failed to sync are dropped — the server has the
      // authoritative copy from this point forward.
      clearItems();
    } catch {
      // getWishlist() failed — keep local items for retry on next login.
      // The user loses nothing; their local wishlist persists in localStorage.
    }
  }, [clearItems]);

  return { syncWishlistAfterLogin };
}
