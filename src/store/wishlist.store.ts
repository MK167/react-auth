/**
 * @fileoverview Client-side wishlist store (Zustand).
 *
 * ## Guest wishlist lifecycle
 *
 * ```
 * Guest clicks ♡ on a product card
 *       │
 *       ▼
 * useWishlistStore().toggleItem(productId)
 *       │
 *       ▼
 * Zustand updates in-memory state → heart icon re-renders as filled/empty
 *       │
 *       ▼
 * persist middleware serialises { items } to localStorage['wishlist-storage']
 *       │
 *       └─ On next page load, localStorage is hydrated back into the store
 *          so wishlist selections survive refreshes without a session.
 * ```
 *
 * ## Why store productIds, not full products?
 *
 * Storing full `Product` objects would mean capturing the price, stock, and
 * images at the moment of wishlist add. If the user returns a week later:
 * - Price may have changed (sale, price increase).
 * - Images may have been updated.
 * - Stock may be 0 now.
 *
 * Storing only `productId` + `addedAt` avoids this stale-data problem. The
 * full product is fetched from the server when the wishlist page is viewed.
 *
 * ## Authentication boundary
 *
 * This store is the **guest-side only** store. After login, `useWishlistSync`
 * transfers its contents to the server and then calls `clearItems()`. From
 * that point, wishlist reads use the server API directly — this store reverts
 * to an empty local state until the next unauthenticated session.
 *
 * ## Why UX benefits of progressive personalisation apply here
 *
 * Allowing guests to build a wishlist before authentication creates an
 * "investment" in the platform. When the login prompt appears ("Log in to
 * save your wishlist permanently"), the user has already committed intent
 * — conversion to registration is measurably higher than cold login prompts.
 *
 * @module store/wishlist.store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalWishlistItem } from '@/types/wishlist.types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type WishlistState = {
  /** Ordered list of locally-saved wishlist entries (productId + timestamp). */
  items: LocalWishlistItem[];

  /**
   * Adds a product to the local wishlist if not already present.
   * No-op if the product is already saved (idempotent).
   *
   * @param productId - MongoDB ObjectId of the product to save.
   */
  addItem: (productId: string) => void;

  /**
   * Removes a product from the local wishlist.
   * No-op if the product is not in the list.
   *
   * @param productId - MongoDB ObjectId of the product to remove.
   */
  removeItem: (productId: string) => void;

  /**
   * Toggles a product's wishlist status — adds if absent, removes if present.
   * This is the primary action called from product card UI.
   *
   * @param productId - MongoDB ObjectId of the product to toggle.
   */
  toggleItem: (productId: string) => void;

  /**
   * Returns `true` if the given product is in the local wishlist.
   * Used to render filled vs. empty heart icons on product cards.
   *
   * @param productId - MongoDB ObjectId to check.
   */
  hasItem: (productId: string) => boolean;

  /**
   * Clears all items from the local wishlist.
   * Called by `useWishlistSync` after a successful server sync so the
   * localStorage copy is not retained alongside the server copy.
   */
  clearItems: () => void;

  /**
   * Returns an array of just the productId strings from all stored items.
   * Used by `useWishlistSync` to compute the diff against the server list.
   */
  getProductIds: () => string[];
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Guest wishlist store. Import and use inside components:
 *
 * ```ts
 * const { hasItem, toggleItem } = useWishlistStore();
 * const isWishlisted = hasItem(product._id);
 * ```
 *
 * Persisted to `localStorage` under `'wishlist-storage'` (items array only).
 * After login, `useWishlistSync` syncs these items to the server and calls
 * `clearItems()`.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId) => {
        set((state) => {
          // Idempotent: do not add a duplicate entry
          if (state.items.some((item) => item.productId === productId)) {
            return state;
          }
          return {
            items: [
              ...state.items,
              { productId, addedAt: new Date().toISOString() },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      toggleItem: (productId) => {
        // Read current state and decide direction
        const isPresent = get().hasItem(productId);
        if (isPresent) {
          get().removeItem(productId);
        } else {
          get().addItem(productId);
        }
      },

      hasItem: (productId) =>
        get().items.some((item) => item.productId === productId),

      clearItems: () => set({ items: [] }),

      getProductIds: () => get().items.map((item) => item.productId),
    }),
    {
      name: 'wishlist-storage',
      // Persist only the items array; methods are re-created by the factory.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
