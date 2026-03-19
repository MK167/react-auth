/**
 * @fileoverview Guest-to-server cart merge hook.
 *
 * ## Cart merge + server load algorithm
 *
 * This hook runs once after every successful login. It has two responsibilities:
 *
 * 1. **Merge**: push any guest (localStorage) cart items into the user's
 *    server-side cart, using a sum-and-cap strategy for duplicate products.
 * 2. **Load**: fetch the final server cart and populate the Zustand store so
 *    the cart badge and CartPage immediately reflect the persisted server state.
 *
 * ```
 * Input:
 *   guestItems  = useCartStore.getState().items     (localStorage, pre-login)
 *   serverItems = await getServerCart()              (server, post-auth)
 *
 * Merge step (for each guestItem, only if guestItems.length > 0):
 *   serverItem = serverItems.find(i => i.product._id === guestItem.product._id)
 *
 *   if (serverItem exists):
 *     mergedQty = min(serverItem.quantity + guestItem.quantity, product.stock)
 *     await updateServerCartItem(productId, mergedQty)
 *   else:
 *     await addToServerCart(productId, guestItem.quantity)
 *
 * Load step (always):
 *   refreshedCart = await getServerCart()
 *   loadServerCart(refreshedCart.items mapped to CartItem[])
 * ```
 *
 * ## Why the early return was removed
 *
 * The original implementation returned early when `guestItems.length === 0`,
 * which meant a returning authenticated user (no guest items) never had their
 * server cart loaded into Zustand. Their CartPage showed an empty cart even
 * though the server had persisted items from a previous session.
 *
 * The fix: always proceed to the load step regardless of guest item count.
 *
 * ## Conflict resolution
 *
 * | Scenario                          | Resolution                              |
 * |-----------------------------------|-----------------------------------------|
 * | Same product in both carts        | Sum quantities, cap at `product.stock`  |
 * | Product only in guest cart        | Add to server with guest quantity       |
 * | Product only in server cart       | Untouched (returned in load step)       |
 * | Product deleted from server       | `addToServerCart` fails → `allSettled`  |
 * |                                   | skips it silently; server cart reloaded |
 *
 * ## Server cart → Zustand CartItem mapping
 *
 * `ServerCart.items` contains `{ _id, product: ServerCartProduct, quantity }`.
 * `ServerCartProduct` is a partial Product (no description, category, slug,
 * etc.). We cast it to `Product` via `as unknown as Product` because CartPage
 * and CartBadge only read `_id`, `name`, `price`, `stock`, and `mainImage`.
 * Missing fields render as empty/undefined, which is safe for the UI.
 *
 * @module hooks/useCartMerge
 */

import { useCallback } from 'react';
import { useCartStore } from '@/store/cart.store';
import type { CartItem } from '@/types/cart.types';
import type { Product } from '@/types/product.types';
import { getServerCart, addToServerCart, updateServerCartItem } from '@/api/cart.api';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Maps server cart items to the Zustand CartItem shape.
 * Uses a type cast because ServerCartProduct is a partial Product —
 * only fields rendered by CartPage/CartBadge are guaranteed present.
 */
function mapServerItemsToCartItems(
  serverItems: Awaited<ReturnType<typeof getServerCart>>['data']['items'],
): CartItem[] {
  if (!Array.isArray(serverItems)) return [];
  return serverItems.map((si) => ({
    product: si.product as unknown as Product,
    quantity: si.quantity,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns `mergeGuestCartWithServer`, a stable callback that:
 * 1. Merges the current guest localStorage cart into the server cart.
 * 2. Reloads the authoritative server cart into the Zustand store.
 *
 * Call it fire-and-forget immediately after `setAuth(user, token)`:
 *
 * ```ts
 * const { mergeGuestCartWithServer } = useCartMerge();
 * void mergeGuestCartWithServer();
 * ```
 *
 * @returns Object containing `mergeGuestCartWithServer`.
 */
export function useCartMerge() {
  const clearCart      = useCartStore((s) => s.clearCart);
  const loadServerCart = useCartStore((s) => s.loadServerCart);

  const mergeGuestCartWithServer = useCallback(async () => {
    // Snapshot guest items at call time (before any state mutations).
    const guestItems = useCartStore.getState().items;

    try {
      // ── Step 1: fetch server cart ────────────────────────────────────────
      // Always fetch regardless of whether there are guest items. This is the
      // primary fix for the "returning user sees empty cart" bug.
      const serverCartRes = await getServerCart();
      const serverItems   = serverCartRes.data?.items ?? [];

      // ── Step 2: merge guest items into server cart (if any) ──────────────
      if (guestItems.length > 0) {
        // Build a lookup for O(1) per-product access during the merge diff.
        const serverItemMap = new Map(
          serverItems.map((item) => [item.product._id, item]),
        );

        await Promise.allSettled(
          guestItems.map(({ product, quantity }) => {
            const serverItem = serverItemMap.get(product._id);

            if (serverItem) {
              // Product exists in both → sum quantities, cap at stock.
              const mergedQty = Math.min(
                serverItem.quantity + quantity,
                product.stock,
              );
              return updateServerCartItem(product._id, mergedQty);
            } else {
              // New item from guest session → add to server.
              return addToServerCart(product._id, quantity);
            }
          }),
        );

        // Clear the localStorage guest cart now that items are on the server.
        // We clear here (before the reload) so there is no duplication window.
        clearCart();

        // ── Step 3: reload server cart after merge ──────────────────────
        // Re-fetch to get the authoritative merged state (some adds may have
        // failed via allSettled, so we trust the server's current truth).
        const refreshedRes  = await getServerCart();
        const refreshedItems = refreshedRes.data?.items ?? [];
        loadServerCart(mapServerItemsToCartItems(refreshedItems));
      } else {
        // No guest items — simply load the server cart directly.
        loadServerCart(mapServerItemsToCartItems(serverItems));
      }
    } catch {
      // getServerCart() failed (network, 401 refresh loop, etc.).
      // Leave the local guest cart intact — the merge will retry on next login.
    }
  }, [clearCart, loadServerCart]);

  return { mergeGuestCartWithServer };
}
