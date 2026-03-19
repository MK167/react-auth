/**
 * @fileoverview Shopping cart domain types.
 *
 * The cart is managed entirely client-side via the Zustand cart store
 * (`src/store/cart.store.ts`) with `localStorage` persistence. These types
 * define the shape of that in-memory state so every component that reads or
 * writes cart data has a shared contract.
 *
 * @module types/cart.types
 */

import type { Product } from './product.types';

/**
 * A single line item in the shopping cart.
 *
 * We store the full `Product` object (not just its ID) so that the cart and
 * checkout pages can render names, prices, and images without requiring an
 * additional API round-trip after navigation.
 *
 * **Trade-off:** Storing the full object means the cart could become stale if
 * a product's price or stock changes between when it was added and when the
 * user checks out. In a real production system you would validate the cart
 * server-side at checkout time — this is acceptable for the current scope.
 */
export type CartItem = {
  /** The complete product record captured at the moment of add-to-cart */
  product: Product;
  /**
   * Number of units the user wants to purchase.
   * Constrained to [1, product.stock] by the cart store actions.
   */
  quantity: number;
};
