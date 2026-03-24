/**
 * @fileoverview Unit tests for the Zustand wishlist store.
 *
 * ## What makes the wishlist store interesting to test?
 *
 * 1. **Idempotency** — `addItem` must NOT add a duplicate if the product is
 *    already in the list. This is a subtle invariant that's easy to miss.
 *
 * 2. **toggleItem** — The core UX action. It calls `addItem` or `removeItem`
 *    based on current state. Tests must verify both toggle directions.
 *
 * 3. **setItemsFromServer** — After login, the local wishlist is replaced by
 *    the server's authoritative list. This is a destructive operation that
 *    must completely replace, not merge, the local state.
 *
 * ## Why store productId, not full product?
 *
 * Storing only the ID ensures the UI always shows current price/stock when
 * the wishlist page loads — stale data (week-old prices) is avoided.
 * Tests verify that `addedAt` is an ISO 8601 timestamp (not empty or null)
 * to ensure the timestamp field is populated correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from '@/store/wishlist.store';

// ---------------------------------------------------------------------------
// Reset helper
// ---------------------------------------------------------------------------

function resetWishlist() {
  useWishlistStore.getState().clearItems();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('wishlist store', () => {
  beforeEach(resetWishlist);

  describe('initial state', () => {
    it('starts with an empty items array', () => {
      expect(useWishlistStore.getState().items).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('adds a productId to the wishlist', () => {
      useWishlistStore.getState().addItem('product-abc');
      expect(useWishlistStore.getState().items).toHaveLength(1);
      expect(useWishlistStore.getState().items[0].productId).toBe('product-abc');
    });

    it('stores an ISO 8601 addedAt timestamp', () => {
      // WHY: addedAt is used for ordering and post-login sync analytics.
      //      An empty or null timestamp would make the data useless.
      useWishlistStore.getState().addItem('product-abc');
      const addedAt = useWishlistStore.getState().items[0].addedAt;
      // ISO 8601 format: "2025-01-01T00:00:00.000Z"
      expect(new Date(addedAt).toString()).not.toBe('Invalid Date');
    });

    it('is idempotent — does NOT add a duplicate entry', () => {
      // WHY: Calling addItem twice for the same product must NOT result in
      //      two list entries. The heart icon counts depend on hasItem(),
      //      not item count.
      useWishlistStore.getState().addItem('product-abc');
      useWishlistStore.getState().addItem('product-abc');
      expect(useWishlistStore.getState().items).toHaveLength(1);
    });

    it('adds multiple different products correctly', () => {
      useWishlistStore.getState().addItem('product-aaa');
      useWishlistStore.getState().addItem('product-bbb');
      expect(useWishlistStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes the specified productId from the wishlist', () => {
      useWishlistStore.getState().addItem('product-aaa');
      useWishlistStore.getState().addItem('product-bbb');
      useWishlistStore.getState().removeItem('product-aaa');

      const ids = useWishlistStore.getState().items.map((i) => i.productId);
      expect(ids).toEqual(['product-bbb']);
    });

    it('is a no-op when the product is not in the list', () => {
      // WHY: removeItem must not crash or throw when called on a missing id.
      useWishlistStore.getState().addItem('product-aaa');
      useWishlistStore.getState().removeItem('product-nonexistent');
      expect(useWishlistStore.getState().items).toHaveLength(1);
    });
  });

  describe('toggleItem', () => {
    it('adds an item when it is NOT in the wishlist', () => {
      // WHY: Toggle direction 1 — empty → filled heart.
      useWishlistStore.getState().toggleItem('product-abc');
      expect(useWishlistStore.getState().hasItem('product-abc')).toBe(true);
    });

    it('removes an item when it IS already in the wishlist', () => {
      // WHY: Toggle direction 2 — filled → empty heart.
      useWishlistStore.getState().addItem('product-abc');
      useWishlistStore.getState().toggleItem('product-abc');
      expect(useWishlistStore.getState().hasItem('product-abc')).toBe(false);
    });

    it('returns to the added state after a second toggle', () => {
      // WHY: Toggle must be truly reversible — add → remove → add works.
      useWishlistStore.getState().toggleItem('product-abc');
      useWishlistStore.getState().toggleItem('product-abc');
      useWishlistStore.getState().toggleItem('product-abc');
      expect(useWishlistStore.getState().hasItem('product-abc')).toBe(true);
    });
  });

  describe('hasItem', () => {
    it('returns false for a product not in the wishlist', () => {
      // WHY: hasItem drives the heart icon render (filled vs empty).
      //      False negatives show an empty heart on a wishlisted product.
      expect(useWishlistStore.getState().hasItem('product-xyz')).toBe(false);
    });

    it('returns true for a product that was added', () => {
      useWishlistStore.getState().addItem('product-xyz');
      expect(useWishlistStore.getState().hasItem('product-xyz')).toBe(true);
    });

    it('returns false after the product is removed', () => {
      useWishlistStore.getState().addItem('product-xyz');
      useWishlistStore.getState().removeItem('product-xyz');
      expect(useWishlistStore.getState().hasItem('product-xyz')).toBe(false);
    });
  });

  describe('clearItems', () => {
    it('removes all items from the wishlist', () => {
      useWishlistStore.getState().addItem('p1');
      useWishlistStore.getState().addItem('p2');
      useWishlistStore.getState().clearItems();
      expect(useWishlistStore.getState().items).toHaveLength(0);
    });
  });

  describe('getProductIds', () => {
    it('returns an empty array for an empty wishlist', () => {
      expect(useWishlistStore.getState().getProductIds()).toEqual([]);
    });

    it('returns an array of all productId strings', () => {
      // WHY: useWishlistSync uses getProductIds() to compute the diff
      //      against the server list. The IDs must match exactly.
      useWishlistStore.getState().addItem('p1');
      useWishlistStore.getState().addItem('p2');
      expect(useWishlistStore.getState().getProductIds()).toEqual(['p1', 'p2']);
    });
  });

  describe('setItemsFromServer', () => {
    it('replaces local items with the server-provided list', () => {
      // WHY: After login sync, the server is the source of truth.
      //      Local guest items must be completely overwritten.
      useWishlistStore.getState().addItem('local-p1');
      useWishlistStore.getState().setItemsFromServer(['server-p1', 'server-p2']);

      const ids = useWishlistStore.getState().getProductIds();
      expect(ids).toEqual(['server-p1', 'server-p2']);
    });

    it('sets addedAt to an empty string for server items', () => {
      // WHY: The server does not return addedAt timestamps in the sync response.
      //      The store sets it to '' as a sentinel value. Tests ensure this
      //      contract is maintained so sync code behaves predictably.
      useWishlistStore.getState().setItemsFromServer(['server-p1']);
      expect(useWishlistStore.getState().items[0].addedAt).toBe('');
    });

    it('clears the list when called with an empty array', () => {
      useWishlistStore.getState().addItem('p1');
      useWishlistStore.getState().setItemsFromServer([]);
      expect(useWishlistStore.getState().items).toHaveLength(0);
    });
  });
});
