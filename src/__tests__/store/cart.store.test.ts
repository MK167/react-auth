/**
 * @fileoverview Unit tests for the Zustand cart store.
 *
 * ## How to test a Zustand store
 *
 * Zustand stores are singletons — they persist between tests in the same file
 * unless explicitly reset. Three techniques for resetting:
 *
 * 1. **`store.setState(partial)`** — Merges partial state into the store.
 *    Use `store.setState({ items: [] })` to wipe items without touching methods.
 *
 * 2. **`store.setState(initial, true)`** — The second arg `true` replaces
 *    the ENTIRE state (replace mode), useful for a full reset.
 *
 * 3. **Calling the store's own reset action** — if the store exposes one.
 *    Our cart doesn't have a dedicated reset, so we use approach 1.
 *
 * ## Why test computed methods (getTotalItems, getTotalPrice)?
 *
 * Computed methods derive from `items`. They're exposed as methods (not stored
 * state) to avoid redundancy. If someone changes the price calculation formula
 * (e.g. adds a discount) these tests catch regressions immediately.
 *
 * ## Stock cap invariant
 *
 * The cart enforces `quantity ≤ product.stock` at every write operation.
 * This invariant prevents the checkout from trying to purchase more than
 * what the server has available.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cart.store';
import type { Product } from '@/types/product.types';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid Product for testing.
 * Only the fields the cart store uses are required.
 */
function makeProduct(overrides?: Partial<Product>): Product {
  return {
    _id: 'prod-001',
    name: 'Test Product',
    description: 'A product for testing',
    price: 10.00,
    stock: 5,
    category: { _id: 'cat-1', name: 'Cat', slug: 'cat', owner: 'u', createdAt: '', updatedAt: '' },
    mainImage: { _id: 'img-1', url: 'http://img.jpg', localPath: '/img.jpg' },
    subImages: [],
    owner: 'owner-1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset helper
// ---------------------------------------------------------------------------

/**
 * Resets cart to its empty initial state before each test.
 *
 * @remarks
 * We call the store's own `clearCart()` action instead of `setState` so that
 * the persist middleware's internal subscriptions are also notified.
 * Either approach works; using the action is slightly more realistic.
 */
function resetCart() {
  useCartStore.getState().clearCart();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cart store', () => {
  beforeEach(resetCart);

  describe('initial state', () => {
    it('starts with an empty items array', () => {
      // WHY: A new store instance (or after clearCart) must have zero items.
      expect(useCartStore.getState().items).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('adds a new product to the cart', () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product);

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product._id).toBe('prod-001');
      expect(items[0].quantity).toBe(1);
    });

    it('increments quantity when the same product is added again', () => {
      // WHY: Adding the same product twice should NOT create two entries.
      //      Cart deduplication by product._id is a fundamental UX contract.
      const product = makeProduct();
      useCartStore.getState().addItem(product);
      useCartStore.getState().addItem(product);

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('caps quantity at product.stock when adding', () => {
      // WHY: Over-ordering is impossible — the stock constraint must fire
      //      at add-to-cart time, not just at checkout.
      const product = makeProduct({ stock: 3 });
      useCartStore.getState().addItem(product, 10); // request 10, stock is 3

      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('caps accumulated quantity at product.stock when adding incrementally', () => {
      // WHY: Adding 3 + 3 to a product with stock 4 should result in 4, not 6.
      const product = makeProduct({ stock: 4 });
      useCartStore.getState().addItem(product, 3);
      useCartStore.getState().addItem(product, 3);

      expect(useCartStore.getState().items[0].quantity).toBe(4);
    });

    it('defaults to quantity 1 when no quantity is specified', () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product);
      expect(useCartStore.getState().items[0].quantity).toBe(1);
    });

    it('supports adding multiple different products', () => {
      const p1 = makeProduct({ _id: 'p1' });
      const p2 = makeProduct({ _id: 'p2' });
      useCartStore.getState().addItem(p1);
      useCartStore.getState().addItem(p2);

      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes the correct product from the cart', () => {
      const p1 = makeProduct({ _id: 'p1' });
      const p2 = makeProduct({ _id: 'p2' });
      useCartStore.getState().addItem(p1);
      useCartStore.getState().addItem(p2);
      useCartStore.getState().removeItem('p1');

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product._id).toBe('p2');
    });

    it('is a no-op for a productId that is not in the cart', () => {
      // WHY: removeItem must not throw or crash when called for a missing id.
      const product = makeProduct({ _id: 'p1' });
      useCartStore.getState().addItem(product);
      useCartStore.getState().removeItem('nonexistent');

      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('sets the quantity to the specified value', () => {
      const product = makeProduct({ stock: 10 });
      useCartStore.getState().addItem(product);
      useCartStore.getState().updateQuantity('prod-001', 4);

      expect(useCartStore.getState().items[0].quantity).toBe(4);
    });

    it('clamps the quantity at product.stock', () => {
      // WHY: updateQuantity respects the same stock cap as addItem.
      const product = makeProduct({ stock: 3 });
      useCartStore.getState().addItem(product);
      useCartStore.getState().updateQuantity('prod-001', 99);

      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('removes the item when quantity is set to 0', () => {
      // WHY: quantity ≤ 0 means "remove from cart". This avoids a "0 of X" line item.
      const product = makeProduct();
      useCartStore.getState().addItem(product);
      useCartStore.getState().updateQuantity('prod-001', 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes the item when quantity is negative', () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product);
      useCartStore.getState().updateQuantity('prod-001', -1);

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('removes all items', () => {
      useCartStore.getState().addItem(makeProduct({ _id: 'p1' }));
      useCartStore.getState().addItem(makeProduct({ _id: 'p2' }));
      useCartStore.getState().clearCart();

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('loadServerCart', () => {
    it('replaces the current items with the provided server items', () => {
      // WHY: After login, we hydrate the cart from the server. Any items
      //      added as a guest are replaced by the authoritative server state.
      const product = makeProduct({ _id: 'server-p1', price: 50 });
      useCartStore.getState().addItem(makeProduct({ _id: 'guest-p' })); // guest item

      useCartStore.getState().loadServerCart([{ product, quantity: 2 }]);

      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product._id).toBe('server-p1');
      expect(items[0].quantity).toBe(2);
    });
  });

  describe('getTotalItems', () => {
    it('returns 0 for an empty cart', () => {
      expect(useCartStore.getState().getTotalItems()).toBe(0);
    });

    it('returns the sum of quantities across all items', () => {
      // WHY: Cart badge shows total units, not number of distinct products.
      //      2 of product A + 3 of product B = 5, not 2.
      useCartStore.getState().addItem(makeProduct({ _id: 'p1' }), 2);
      useCartStore.getState().addItem(makeProduct({ _id: 'p2' }), 3);
      expect(useCartStore.getState().getTotalItems()).toBe(5);
    });
  });

  describe('getTotalPrice', () => {
    it('returns 0 for an empty cart', () => {
      expect(useCartStore.getState().getTotalPrice()).toBe(0);
    });

    it('calculates price × quantity for each item and sums them', () => {
      // WHY: $10 × 2 + $5 × 3 = $35
      useCartStore.getState().addItem(makeProduct({ _id: 'p1', price: 10 }), 2);
      useCartStore.getState().addItem(makeProduct({ _id: 'p2', price: 5 }),  3);
      expect(useCartStore.getState().getTotalPrice()).toBe(35);
    });

    it('rounds the total to 2 decimal places', () => {
      // WHY: Floating-point math (0.1 + 0.2 = 0.30000000000000004) must be
      //      rounded before displaying currency values to users.
      useCartStore.getState().addItem(makeProduct({ _id: 'p1', price: 0.1 }), 3);
      // 0.1 × 3 = 0.30000000000000004 in raw float → should round to 0.30
      expect(useCartStore.getState().getTotalPrice()).toBe(0.3);
    });
  });
});
