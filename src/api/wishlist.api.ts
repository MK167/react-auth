/**
 * @fileoverview FreeAPI ecommerce wishlist API service.
 *
 * ## Wishlist sync flow
 *
 * This module exposes two endpoints consumed by `useWishlistSync`:
 *
 * ```
 * Login event
 *   │
 *   ▼
 * getWishlist()                 ← fetch server state
 *   │
 *   ├─ extract server productIds
 *   │
 *   ▼
 * diff(localIds, serverIds)     ← items to add = local − server
 *   │
 *   ▼
 * Promise.allSettled(
 *   newIds.map(id =>            ← toggle only items NOT already on server
 *     toggleWishlistItem(id)    ← POST /ecommerce/profile/wishlist/:id
 *   )
 * )
 *   │
 *   ▼
 * useWishlistStore.clearItems() ← localStorage cleared after successful sync
 * ```
 *
 * ## Why allSettled instead of all?
 *
 * `Promise.allSettled` is used instead of `Promise.all` so that a single
 * toggle failure (e.g. product deleted server-side) does not abort the
 * entire sync. Each item is independently attempted; failures are silently
 * ignored (non-fatal). The local list is cleared regardless — if a product
 * truly no longer exists on the server there is no value in retaining it
 * in localStorage.
 *
 * @module api/wishlist.api
 */

import { authUrl } from '@/config/Define';
import type { ApiResponse } from '@/types/product.types';
import type { ServerWishlist, WishlistToggleResponse } from '@/types/wishlist.types';

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetches the authenticated user's full wishlist.
 *
 * Maps to `GET /api/v1/ecommerce/profile/wishlist`.
 *
 * Returns fully populated product objects. Called once at login-sync time to
 * determine which items are already on the server before applying the diff.
 *
 * @returns The server wishlist with populated product data and item count.
 */
export async function getWishlist(): Promise<ApiResponse<ServerWishlist>> {
  const res = await authUrl.get<ApiResponse<ServerWishlist>>(
    '/ecommerce/profile/wishlist',
  );
  return res.data;
}

/**
 * Toggles a product's wishlist status for the authenticated user.
 *
 * Maps to `POST /api/v1/ecommerce/profile/wishlist/:productId`.
 *
 * **IMPORTANT — toggle semantics**: This endpoint adds the item if it is not
 * in the wishlist, or removes it if it is. Always call `getWishlist()` first
 * and diff the result before calling this — calling it for an already-
 * wishlisted product will *remove* it, causing data loss.
 *
 * Used for:
 * 1. Authenticated user clicking the wishlist heart icon on a product card.
 * 2. During login sync, to add guest-wishlist items to the server (after
 *    confirming they are not already there).
 *
 * @param productId - The MongoDB ObjectId of the product to toggle.
 * @returns A response containing the action message.
 */
export async function toggleWishlistItem(
  productId: string,
): Promise<ApiResponse<WishlistToggleResponse>> {
  const res = await authUrl.post<ApiResponse<WishlistToggleResponse>>(
    `/ecommerce/profile/wishlist/${productId}`,
  );
  return res.data;
}
