/**
 * @fileoverview FreeAPI ecommerce server-side cart API service.
 *
 * ## Guest Cart Lifecycle
 *
 * ```
 * GUEST USER                          AUTHENTICATED USER
 * ─────────────────────────────────   ──────────────────────────────────────
 * Adds items to cart                  Cart is stored server-side (this file)
 *   → Zustand cart.store.ts           AND reflected in Zustand store
 *   → persisted to localStorage
 *
 *           ↓ user logs in ↓
 *
 *      useCartMerge hook runs
 *      ────────────────────────────────────────────────────────
 *      1. getServerCart()          — fetch what the server has
 *      2. For each guest item:
 *         a) already on server?   → updateServerCartItem(id, guestQty + serverQty)
 *         b) new item?            → addToServerCart(id, guestQty)
 *      3. clearCart()              — wipe localStorage guest cart
 *      ────────────────────────────────────────────────────────
 * ```
 *
 * ## Cart Merge Algorithm
 *
 * The merge uses a **sum-and-cap** strategy:
 *
 * ```
 * mergedQty = min(serverQty + guestQty, product.stock)
 * ```
 *
 * Rationale:
 * - **Sum**: The user added items across two sessions; both intentions are valid.
 * - **Cap at stock**: Prevents over-ordering — the server would reject quantities
 *   exceeding available stock anyway.
 * - **Server wins on conflicts**: The server cart is treated as authoritative;
 *   the guest cart only adds to it, never replaces existing server quantities
 *   with lower guest values.
 *
 * ## Why this improves conversion rate
 *
 * Baymard Institute (2023) reports that 34% of users abandon checkout flows
 * when forced to create an account before seeing prices or adding items.
 * Allowing guest cart interactions removes that friction point entirely.
 * The merge-on-login pattern means the user's session "just works" — they
 * pick up exactly where they left off, which reinforces the sunk-cost
 * commitment of already-selected items and increases checkout completion.
 *
 * ## Cart persistence strategy
 *
 * | Phase          | Storage            | Mechanism                        |
 * |----------------|--------------------|----------------------------------|
 * | Guest          | localStorage       | Zustand `persist` middleware     |
 * | Authenticated  | Server + Zustand   | API sync + Zustand as local copy |
 * | Post-checkout  | Cleared            | `clearCart()` + `clearServerCart()`|
 *
 * @module api/cart.api
 */

import { authUrl } from '@/config/Define';
import type { ApiResponse } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/**
 * A single item within the FreeAPI server-side cart response payload.
 * The `product` field is partially populated (name, price, stock, image)
 * but NOT the full Product shape — use `CartItem` from the Zustand store for
 * the full object.
 */
export type ServerCartProduct = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  mainImage?: { url: string; localPath: string } | null;
};

/** A line item within the server cart. */
export type ServerCartItem = {
  /** Line item's own server-side ID */
  _id: string;
  product: ServerCartProduct;
  quantity: number;
  /** Reserved for future coupon system — null for now */
  coupon: null | unknown;
};

/**
 * The complete server cart object returned by most cart API responses.
 * `cartTotal` and `discountedTotal` are pre-computed by the server.
 */
export type ServerCart = {
  _id: string;
  items: ServerCartItem[];
  /** Raw total before any discounts (Σ price × quantity). */
  cartTotal: number;
  /** Total after applying any coupon codes. Equals `cartTotal` when no coupon. */
  discountedTotal: number;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetches the authenticated user's current server-side cart.
 *
 * Maps to `GET /api/v1/ecommerce/cart`.
 *
 * Called at the start of cart merge to determine which items are already
 * on the server before syncing the guest localStorage cart.
 *
 * @returns The full server cart including all items and totals.
 * @throws  Axios error — typically 401 (handled by the interceptor refresh
 *          flow) or 404 if the user has no cart yet.
 */
export async function getServerCart(): Promise<ApiResponse<ServerCart>> {
  const res = await authUrl.get<ApiResponse<ServerCart>>('/ecommerce/cart');
  return res.data;
}

/**
 * Adds a product to the server cart, or sets its quantity if already present.
 *
 * Maps to `POST /api/v1/ecommerce/cart/item/:productId`.
 *
 * **Note**: The FreeAPI cart endpoint sets the quantity to the provided
 * value rather than incrementing. To merge (sum) quantities, fetch the
 * current quantity first via `getServerCart()` and compute the total before
 * calling this function — the `useCartMerge` hook does this automatically.
 *
 * @param productId - The MongoDB ObjectId of the product to add.
 * @param quantity  - The quantity to set on the server (not a delta).
 * @returns The updated server cart.
 */
export async function addToServerCart(
  productId: string,
  quantity: number,
): Promise<ApiResponse<ServerCart>> {
  const res = await authUrl.post<ApiResponse<ServerCart>>(
    `/ecommerce/cart/item/${productId}`,
    { quantity },
  );
  return res.data;
}

/**
 * Updates the quantity of an existing cart line item.
 *
 * Maps to `PATCH /api/v1/ecommerce/cart/item/:productId`.
 *
 * Used during merge when the product is already in the server cart and
 * we need to update to the sum of server + guest quantities.
 *
 * @param productId - The MongoDB ObjectId of the product to update.
 * @param quantity  - The new desired quantity (replaces, does not increment).
 * @returns The updated server cart.
 */
export async function updateServerCartItem(
  productId: string,
  quantity: number,
): Promise<ApiResponse<ServerCart>> {
  const res = await authUrl.patch<ApiResponse<ServerCart>>(
    `/ecommerce/cart/item/${productId}`,
    { quantity },
  );
  return res.data;
}

/**
 * Removes a single item from the server cart.
 *
 * Maps to `DELETE /api/v1/ecommerce/cart/item/:productId`.
 *
 * @param productId - The MongoDB ObjectId of the product to remove.
 * @returns The updated server cart (with the item removed).
 */
export async function deleteFromServerCart(
  productId: string,
): Promise<ApiResponse<ServerCart>> {
  const res = await authUrl.delete<ApiResponse<ServerCart>>(
    `/ecommerce/cart/item/${productId}`,
  );
  return res.data;
}

/**
 * Clears all items from the server cart.
 *
 * Maps to `DELETE /api/v1/ecommerce/cart`.
 *
 * Called after a successful checkout to reset the server cart. The local
 * Zustand cart is cleared separately via `useCartStore().clearCart()`.
 *
 * @returns The empty server cart response.
 */
export async function clearServerCart(): Promise<ApiResponse<null>> {
  const res = await authUrl.delete<ApiResponse<null>>('/ecommerce/cart');
  return res.data;
}
