/**
 * @fileoverview Wishlist domain types.
 *
 * ## UX benefits of progressive personalisation
 *
 * A wishlist is the canonical "intent signal" in ecommerce — it tells the
 * platform (and the user) which products are desired but not yet purchased.
 * Its UX value is maximised only when it works **before authentication**:
 *
 * - A guest browsing a product at 2 AM should be able to save it without
 *   creating an account right then.
 * - Friction at the wishlist-add moment causes immediate abandonment for ~60%
 *   of impulse-browser sessions (Nielsen Norman Group, 2022).
 * - Allowing anonymous saves then showing "You have 3 saved items — log in
 *   to keep them!" is a highly effective, non-coercive login motivator.
 *
 * ## Guest wishlist: local storage strategy
 *
 * Before login, wishlist items are persisted in `localStorage` via Zustand's
 * `persist` middleware (key: `'wishlist-storage'`). Only the `productId` is
 * stored locally — NOT the full product object — to avoid stale data (price
 * changes, image updates, stock changes between sessions).
 *
 * ## Data ownership transition after login
 *
 * On successful authentication, `useWishlistSync` performs the migration:
 *
 * ```
 * 1. Fetch server wishlist  (GET /ecommerce/profile/wishlist)
 * 2. Compute diff: localIds − serverIds  (avoid double-toggling)
 * 3. POST /ecommerce/profile/wishlist/:productId  for each diff item
 * 4. clearItems()  — wipe localStorage; server is now the source of truth
 * ```
 *
 * After sync, all wishlist reads go through the server API. The Zustand
 * store reverts to an empty local state (until the next guest session).
 *
 * ## Conflict resolution
 *
 * The FreeAPI wishlist toggle endpoint is **idempotent in intent** — calling
 * it for an item that is already wishlisted would *remove* it (toggle). To
 * prevent accidental removals we fetch the server state first and only call
 * toggle for items that are NOT yet on the server.
 *
 * @module types/wishlist.types
 */

import type { Product } from './product.types';

// ---------------------------------------------------------------------------
// Local (guest) wishlist types
// ---------------------------------------------------------------------------

/**
 * A single entry in the local (pre-authentication) wishlist.
 *
 * Intentionally minimal: we store only the `productId` and a timestamp.
 * Full product objects are not stored locally to avoid serving stale prices
 * or images when the user returns to the wishlist after days or weeks.
 */
export type LocalWishlistItem = {
  /** MongoDB ObjectId of the wishlisted product. */
  productId: string;
  /**
   * ISO 8601 timestamp of when the item was locally added.
   * Useful for ordering or analytics after sync.
   */
  addedAt: string;
};

// ---------------------------------------------------------------------------
// Server wishlist types
// ---------------------------------------------------------------------------

/**
 * A single item in the server-side wishlist response.
 * The `product` field is fully populated by the API.
 */
export type ServerWishlistItem = {
  /** The wishlist entry's own server-side document ID. */
  _id: string;
  /** Fully populated product snapshot. */
  product: Product;
};

/**
 * Top-level data payload returned by `GET /api/v1/ecommerce/profile/wishlist`.
 */
export type ServerWishlist = {
  wishlistItems: ServerWishlistItem[];
  wishlistItemsCount: number;
};

/**
 * Response data from the wishlist toggle endpoint
 * (`POST /api/v1/ecommerce/profile/wishlist/:productId`).
 *
 * The FreeAPI toggle returns a plain message describing the action taken;
 * we infer add/remove state from the message content or re-fetch the list.
 */
export type WishlistToggleResponse = {
  /** Human-readable action description (e.g. "Item wishlisted successfully"). */
  message: string;
};
