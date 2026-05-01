/**
 * @fileoverview Unit tests for slug utilities (slugify, toProductSlugId, extractProductId).
 *
 * ## What makes slug utilities a great target for unit testing?
 *
 * These are PURE FUNCTIONS — given the same input they always return the same
 * output with zero side effects. Pure functions have the best test-to-value
 * ratio: they need no mocking, no async setup, and run in microseconds.
 *
 * ## The extractProductId contract is the most critical
 *
 * If `extractProductId` is broken, every product detail page link in the app
 * will 404. The function must:
 * 1. Extract the 24-char ObjectId from the end of a combined slug.
 * 2. Handle legacy bare ObjectId URLs (no slug prefix) without breaking.
 * 3. Handle product names that contain hex-like substrings (e.g. "model-abc123...").
 *
 * ## Property-based thinking (without a library)
 *
 * A useful mental model: `extractProductId(toProductSlugId(name, id)) === id`
 * should hold for any valid name + id pair. The round-trip test below encodes
 * this invariant.
 */

import { describe, it, expect } from 'vitest';
import { slugify, toProductSlugId, extractProductId } from '@/utils/slug';

const VALID_ID = '64c8f1234567890123456789'; // 24 hex chars

describe('slugify', () => {
  it('lowercases the input', () => {
    // WHY: URLs are case-sensitive on most servers. All-lowercase prevents
    //      duplicate canonical URLs for the same product.
    expect(slugify('NIKE AIR MAX')).toBe('nike-air-max');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('replaces multiple consecutive non-alphanumeric chars with a single hyphen', () => {
    // WHY: "product -- name" should become "product-name", not "product---name".
    //      The regex `/[^a-z0-9]+/g` collapses consecutive separators.
    expect(slugify('product -- name')).toBe('product-name');
  });

  it('strips leading hyphens', () => {
    // WHY: Rule 3 — a name starting with "!" would produce "-name" without trimming.
    expect(slugify('!Special Product')).toBe('special-product');
  });

  it('strips trailing hyphens', () => {
    expect(slugify('Product!')).toBe('product');
  });

  it('handles special characters (ampersand, percent, brackets)', () => {
    expect(slugify('100% Organic & Natural')).toBe('100-organic-natural');
  });

  it('handles accented characters by replacing them with a hyphen', () => {
    // WHY: "Café" → the accented "é" is non-ASCII and matches [^a-z0-9].
    //      The slug must remain URL-safe ASCII.
    expect(slugify('Café Latte')).toBe('caf-latte');
  });

  it('returns an empty string for an all-special-char input', () => {
    // WHY: Edge case — after stripping non-alphanumeric chars + trimming hyphens,
    //      "!!!" should produce "".
    expect(slugify('!!!')).toBe('');
  });

  it('handles numeric-only strings', () => {
    expect(slugify('42')).toBe('42');
  });
});

describe('toProductSlugId', () => {
  it('combines the slugified name and id with a hyphen', () => {
    // WHY: The URL format must be consistent so links are predictable.
    expect(toProductSlugId('Nike Air Max 270', VALID_ID))
      .toBe(`nike-air-max-270-${VALID_ID}`);
  });

  it('ensures the id is always the last segment', () => {
    // WHY: extractProductId relies on the id being at the END of the string.
    const result = toProductSlugId('Product Name', VALID_ID);
    expect(result.endsWith(VALID_ID)).toBe(true);
  });
});

describe('extractProductId', () => {
  it('extracts the ObjectId from a combined slug-id string', () => {
    // WHY: This is the primary use case — parse the URL param.
    const slugId = `nike-air-max-270-${VALID_ID}`;
    expect(extractProductId(slugId)).toBe(VALID_ID);
  });

  it('handles a legacy bare ObjectId URL (no slug prefix)', () => {
    // WHY: Backwards compatibility — old /products/:id bookmarks must still work.
    //      A bare 24-char ObjectId must match the regex and be returned as-is.
    expect(extractProductId(VALID_ID)).toBe(VALID_ID);
  });

  it('returns the full string as a fallback when no ObjectId is found', () => {
    // WHY: Defensive behaviour — never crash. If the URL is malformed, the
    //      fallback is to pass the whole slug to the API and let it 404 cleanly.
    expect(extractProductId('some-invalid-slug')).toBe('some-invalid-slug');
  });

  it('handles a product name containing hex-like substrings', () => {
    // WHY: A product named "Model abc123def456789abc" would produce a slug
    //      containing hex chars. The regex must match the FINAL 24-char run,
    //      not any intermediate hex-looking segment.
    const tricky = `model-abc123def456-${VALID_ID}`;
    expect(extractProductId(tricky)).toBe(VALID_ID);
  });

  it('is case-insensitive (the i flag handles uppercase ObjectIds)', () => {
    // WHY: The `i` flag is documented as a defensive measure for APIs that
    //      return uppercase ObjectIds.
    const upperCaseId = VALID_ID.toUpperCase();
    expect(extractProductId(`product-${upperCaseId}`)).toBe(upperCaseId);
  });

  it('satisfies the round-trip invariant: extract(toSlugId(name, id)) === id', () => {
    // WHY: This is the most important property — the two functions are inverses.
    //      If this breaks, every product link in the app breaks.
    const id = VALID_ID;
    const name = 'Some Product Name';
    const combined = toProductSlugId(name, id);
    expect(extractProductId(combined)).toBe(id);
  });
});
