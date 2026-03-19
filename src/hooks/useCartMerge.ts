/**
 * @fileoverview Guest-to-server cart merge hook.
 *
 * ## Cart merge algorithm
 *
 * When a guest user logs in, this hook reconciles their localStorage cart
 * with the server-side cart using the following algorithm:
 *
 * ```
 * Input:
 *   guestItems = useCartStore.getState().items   (localStorage)
 *   serverItems = await getServerCart()           (API)
 *
 * Algorithm (for each guestItem):
 *   serverItem = serverItems.find(i => i.product._id === guestItem.product._id)
 *
 *   if (serverItem exists):
 *     mergedQty = min(serverItem.quantity + guestItem.quantity, product.stock)
 *     await updateServerCartItem(productId, mergedQty)
 *   else:
 *     await addToServerCart(productId, guestItem.quantity)
 *
 * On completion:
 *   clearCart()  ← wipes localStorage; server is now the single source of truth
 * ```
 *
 * ## Conflict resolution
 *
 * | Scenario                          | Resolution                              |
 * |-----------------------------------|-----------------------------------------|
 * | Same product in both carts        | Sum quantities, cap at `product.stock`  |
 * | Product only in guest cart        | Add to server with guest quantity       |
 * | Product only in server cart       | Leave untouched (no client involvement) |
 * | Product deleted from server       | `addToServerCart` fails → `allSettled`  |
 * |                                   | skips it silently, cart still cleared   |
 *
 * ## Why `Promise.allSettled` instead of `Promise.all`
 *
 * Merge failures for individual items (product deleted, stock exhausted on
 * server) must not abort the entire merge. `allSettled` lets each item
 * attempt independently. The local cart is cleared regardless — retaining a
 * stale guest cart across sessions creates more UX confusion than the data
 * loss from a single failed item sync.
 *
 * ## Non-blocking integration
 *
 * The merge is called with `void` in login handlers so it does not delay
 * navigation. The user arrives at their destination while the sync completes
 * in the background. The cart badge updates reactively as items are synced
 * to the Zustand store (which `CartPage` reads from localStorage, now empty).
 *
 * In a production system you would also refresh the Zustand cart from the
 * server after merge so the local copy reflects the authoritative server state.
 *
 * @module hooks/useCartMerge
 */

import { useCallback } from 'react';
import { useCartStore } from '@/store/cart.store';
import { getServerCart, addToServerCart, updateServerCartItem } from '@/api/cart.api';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `mergeGuestCartWithServer` callback that reconciles the guest
 * localStorage cart with the authenticated user's server cart.
 *
 * The callback is stable (wrapped in `useCallback`) and safe to call in a
 * fire-and-forget pattern from login handlers:
 *
 * ```ts
 * const { mergeGuestCartWithServer } = useCartMerge();
 *
 * // After setAuth(user, token):
 * void mergeGuestCartWithServer();
 * ```
 *
 * @returns Object containing the `mergeGuestCartWithServer` async function.
 */
export function useCartMerge() {
  // Subscribe only to clearCart (stable reference, never changes).
  // Guest items are read at call time via getState() to avoid stale closures.
  const clearCart = useCartStore((s) => s.clearCart);

  const mergeGuestCartWithServer = useCallback(async () => {
    // Read the snapshot at call time — at this point the user just logged in
    // so the cart still contains the pre-auth guest items.
    const guestItems = useCartStore.getState().items;

    // Nothing to merge — skip the API round-trip entirely.
    if (guestItems.length === 0) return;

    try {
      // Fetch the server cart to determine which products are already there.
      // If the server cart is empty (new user / never checked out), the diff
      // will add all guest items without any merging.
      const serverCartRes = await getServerCart();
      const serverItems = serverCartRes.data?.items ?? [];

      // Build a lookup map: productId → serverItem for O(1) access during diff
      const serverItemMap = new Map(
        serverItems.map((item) => [item.product._id, item]),
      );

      // Process each guest item: update or add to server
      await Promise.allSettled(
        guestItems.map(({ product, quantity }) => {
          const serverItem = serverItemMap.get(product._id);

          if (serverItem) {
            // Product is in both carts → sum quantities, cap at stock.
            // server is authoritative on existing quantity; guest only adds.
            const mergedQty = Math.min(
              serverItem.quantity + quantity,
              product.stock,
            );
            return updateServerCartItem(product._id, mergedQty);
          } else {
            // New item — add to server with guest quantity.
            return addToServerCart(product._id, quantity);
          }
        }),
      );

      // Clear the localStorage guest cart.
      // Even if some individual item syncs failed (allSettled), we clear:
      // retaining a stale local cart that partially overlaps with the server
      // creates more confusion than silently dropping unsynced items.
      clearCart();
    } catch {
      // getServerCart() failed (network, 401 refresh loop, etc.).
      // Leave the local cart intact so the user does not lose their items.
      // The merge will be attempted again on the next login.
    }
  }, [clearCart]);

  return { mergeGuestCartWithServer };
}
