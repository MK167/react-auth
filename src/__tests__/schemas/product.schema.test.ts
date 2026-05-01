/**
 * @fileoverview Unit tests for `productSchema` (Zod).
 *
 * ## Why `z.number()` instead of `z.coerce.number()` matters here
 *
 * The schema uses `z.number()` for `price` and `stock`, which means the value
 * must ALREADY be a number before it reaches Zod. The comment in the source
 * mentions `z.coerce.number()` — this is worth testing because a mismatch
 * between the schema and react-hook-form's value type would cause confusing
 * "Expected number, received string" errors in the admin product form.
 *
 * ## Stock edge case: 0 is valid
 *
 * A product with `stock: 0` means "out of stock but still listed in the
 * catalogue". The schema explicitly allows 0 via `min(0)`. Tests cover this
 * because it's a non-obvious business rule: -1 stock is invalid, but 0 is fine.
 */

import { describe, it, expect } from 'vitest';
import { productSchema } from '@/schemas/product.schema';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const makeValid = (overrides?: Record<string, unknown>) => ({
  name: 'Nike Air Max',
  description: 'A comfortable running shoe for all terrains.',
  price: 99.99,
  stock: 10,
  category: 'cat-001',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('productSchema', () => {
  describe('valid data', () => {
    it('accepts a fully valid product payload', () => {
      expect(productSchema.safeParse(makeValid()).success).toBe(true);
    });

    it('accepts a stock of 0 (out-of-stock but still listed)', () => {
      // WHY: min(0) explicitly allows 0. A product can be listed with no stock
      //      so it appears in search results with an "Out of stock" badge.
      expect(productSchema.safeParse(makeValid({ stock: 0 })).success).toBe(true);
    });

    it('accepts a price with decimals (e.g. 9.99)', () => {
      // WHY: positive() only checks > 0, not integer-ness.
      //      Decimal prices like 9.99 are the most common case.
      expect(productSchema.safeParse(makeValid({ price: 9.99 })).success).toBe(true);
    });

    it('accepts a description at the minimum length (10 chars)', () => {
      // WHY: min(10) boundary — exactly 10 characters must pass.
      expect(productSchema.safeParse(makeValid({ description: '1234567890' })).success).toBe(true);
    });
  });

  describe('name field', () => {
    it('rejects a name shorter than 3 characters', () => {
      // WHY: min(3) prevents "AB" or single-letter test entries in the admin panel.
      expect(productSchema.safeParse(makeValid({ name: 'AB' })).success).toBe(false);
    });

    it('rejects a name longer than 255 characters', () => {
      expect(productSchema.safeParse(makeValid({ name: 'A'.repeat(256) })).success).toBe(false);
    });

    it('accepts a name of exactly 3 characters', () => {
      expect(productSchema.safeParse(makeValid({ name: 'Air' })).success).toBe(true);
    });

    it('accepts a name of exactly 255 characters', () => {
      expect(productSchema.safeParse(makeValid({ name: 'A'.repeat(255) })).success).toBe(true);
    });
  });

  describe('description field', () => {
    it('rejects a description shorter than 10 characters', () => {
      expect(productSchema.safeParse(makeValid({ description: 'Too short' })).success).toBe(false);
    });

    it('rejects a description longer than 1000 characters', () => {
      expect(productSchema.safeParse(makeValid({ description: 'A'.repeat(1001) })).success).toBe(false);
    });
  });

  describe('price field', () => {
    it('rejects a price of 0', () => {
      // WHY: positive() means strictly > 0. Free products aren't sold here.
      expect(productSchema.safeParse(makeValid({ price: 0 })).success).toBe(false);
    });

    it('rejects a negative price', () => {
      expect(productSchema.safeParse(makeValid({ price: -5 })).success).toBe(false);
    });

    it('rejects a non-number value for price', () => {
      // WHY: z.number() (not coerce) rejects strings. This catches a common
      //      react-hook-form pitfall where input values arrive as strings.
      expect(productSchema.safeParse(makeValid({ price: '99.99' })).success).toBe(false);
    });
  });

  describe('stock field', () => {
    it('rejects a negative stock', () => {
      // WHY: min(0) — negative inventory is physically impossible.
      expect(productSchema.safeParse(makeValid({ stock: -1 })).success).toBe(false);
    });

    it('rejects a non-integer stock (float)', () => {
      // WHY: int() — you cannot have 1.5 units of a physical product.
      expect(productSchema.safeParse(makeValid({ stock: 1.5 })).success).toBe(false);
    });

    it('rejects a string value for stock', () => {
      expect(productSchema.safeParse(makeValid({ stock: '10' })).success).toBe(false);
    });
  });

  describe('category field', () => {
    it('rejects an empty category string', () => {
      // WHY: min(1) — the admin must select a category from the dropdown.
      //      An empty category would create an uncategorised orphan product.
      expect(productSchema.safeParse(makeValid({ category: '' })).success).toBe(false);
    });
  });
});
