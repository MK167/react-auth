/**
 * @fileoverview Client-side shopping cart store (Zustand).
 *
 * ## State flow
 *
 * ```
 * User clicks "Add to cart" on ProductDetailPage / ProductCard
 *       │
 *       ▼
 * useCartStore().addItem(product, quantity)
 *       │
 *       ▼
 * Zustand updates in-memory state → re-renders cart badge in UserLayout
 *       │
 *       ▼
 * persist middleware serialises to localStorage["cart-storage"]
 *       │
 *       └─ On next page load, localStorage is hydrated back into the store
 *          so the cart survives refreshes without a server round-trip.
 * ```
 *
 * ## Why client-side cart?
 *
 * The FreeAPI does expose server-side cart endpoints, but relying on them
 * requires an authenticated session for every add/remove action. A local
 * cart is simpler, works for guest users, and matches the "mock checkout
 * allowed" requirement in the product spec. At checkout the cart could be
 * reconciled with the server in a future iteration.
 *
 * ## Computed selectors vs. derived state
 *
 * `getTotalItems` and `getTotalPrice` are exposed as methods rather than
 * stored state to avoid redundancy. Storing them would mean keeping three
 * pieces of state in sync (items, totalItems, totalPrice), which violates
 * the single-source-of-truth principle. Consumers that need the totals
 * call the methods; React's render batching ensures this is not expensive.
 *
 * @module store/cart.store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/cart.types';
import type { Product } from '@/types/product.types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type CartState = {
  /** Ordered list of cart line items */
  items: CartItem[];

  /**
   * Adds a product to the cart. If the product is already in the cart its
   * quantity is incremented by `quantity` (default 1), capped at
   * `product.stock` to prevent over-ordering.
   *
   * @param product  - The full product object to add.
   * @param quantity - Units to add (defaults to 1).
   */
  addItem: (product: Product, quantity?: number) => void;

  /**
   * Removes the cart line for `productId` entirely, regardless of quantity.
   *
   * @param productId - The `_id` of the product to remove.
   */
  removeItem: (productId: string) => void;

  /**
   * Sets the quantity of an existing cart line to an exact value. If
   * `quantity` is ≤ 0 the item is removed. Values above `stock` are clamped.
   *
   * @param productId - The `_id` of the product to update.
   * @param quantity  - The new desired quantity.
   */
  updateQuantity: (productId: string, quantity: number) => void;

  /** Removes all items from the cart (called after a successful checkout). */
  clearCart: () => void;

  /**
   * Replaces the entire cart with items loaded from the server.
   * Called after login to hydrate the Zustand store from the authenticated
   * user's server-side cart, so the cart badge and CartPage reflect the
   * persisted server state without requiring a page refresh.
   *
   * @param serverItems - The CartItem array returned by `getServerCart()`.
   */
  loadServerCart: (serverItems: CartItem[]) => void;

  /**
   * Returns the total number of individual units across all cart lines
   * (sum of `item.quantity` for each line).
   */
  getTotalItems: () => number;

  /**
   * Returns the total monetary value of all cart lines rounded to two
   * decimal places: `Σ (item.product.price × item.quantity)`.
   */
  getTotalPrice: () => number;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * The cart store. Import and destructure inside components:
 *
 * ```ts
 * const { items, addItem, getTotalItems } = useCartStore();
 * ```
 *
 * The store is persisted to `localStorage` via the `persist` middleware so
 * the cart survives page refreshes. On hydration, Zustand merges the stored
 * JSON back into the initial state automatically.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.product._id === product._id,
          );

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product._id === product._id
                  ? {
                      ...item,
                      quantity: Math.min(
                        item.quantity + quantity,
                        product.stock,
                      ),
                    }
                  : item,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              { product, quantity: Math.min(quantity, product.stock) },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product._id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product._id === productId
              ? {
                  ...item,
                  quantity: Math.min(quantity, item.product.stock),
                }
              : item,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      loadServerCart: (serverItems) => set({ items: serverItems }),

      getTotalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getTotalPrice: () =>
        Math.round(
          get().items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0,
          ) * 100,
        ) / 100,
    }),
    {
      name: 'cart-storage',
      // Persist only `items`; methods are re-created from the store factory.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
