/**
 * @fileoverview Unit tests for `checkoutSchema` and `isDeclinedCard`.
 *
 * ## Why payment field validation is critical to test
 *
 * Payment forms are high-stakes: a false negative (rejecting a valid card)
 * costs a sale; a false positive (accepting a malformed card number) wastes
 * a server round-trip and degrades UX.
 *
 * The regex patterns for card number, expiry, and CVV each have subtle edge
 * cases (spaces/dashes in card numbers, leading-zero months, 3-vs-4 digit CVV)
 * that are easy to break with a "minor" regex tweak.
 *
 * ## Card number format accepted
 *
 * The schema accepts cards in two formats:
 *   - `"1234567890123456"`        — 16 contiguous digits (no separator)
 *   - `"1234 5678 9012 3456"`     — groups separated by spaces
 *   - `"1234-5678-9012-3456"`     — groups separated by dashes
 *
 * Regex: `/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/`
 *
 * ## isDeclinedCard test-mode behaviour
 *
 * Cards starting with "0000" are declined. This mirrors Stripe's test card
 * convention where specific number prefixes trigger specific payment outcomes.
 */

import { describe, it, expect } from 'vitest';
import { checkoutSchema, isDeclinedCard } from '@/schemas/checkout.schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeValid = (overrides?: Record<string, unknown>) => ({
  firstName: 'Jane',
  lastName: 'Doe',
  address: '123 Main Street',
  city: 'New York',
  zip: '10001',
  cardNumber: '1234567890123456',
  expiry: '12/27',
  cvv: '123',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkoutSchema', () => {
  describe('valid data', () => {
    it('accepts a completely valid checkout form', () => {
      expect(checkoutSchema.safeParse(makeValid()).success).toBe(true);
    });

    it('accepts a card number with space separators', () => {
      // WHY: Many card number inputs auto-format as "XXXX XXXX XXXX XXXX".
      //      The regex must allow spaces so autofill still validates.
      expect(checkoutSchema.safeParse(makeValid({ cardNumber: '1234 5678 9012 3456' })).success).toBe(true);
    });

    it('accepts a card number with dash separators', () => {
      // WHY: Some card masks use dashes. Both formats must be valid.
      expect(checkoutSchema.safeParse(makeValid({ cardNumber: '1234-5678-9012-3456' })).success).toBe(true);
    });

    it('accepts a 3-digit CVV', () => {
      // WHY: Most Visa/Mastercard CVVs are 3 digits.
      expect(checkoutSchema.safeParse(makeValid({ cvv: '123' })).success).toBe(true);
    });

    it('accepts a 4-digit CVV (American Express)', () => {
      // WHY: Amex CIDs are 4 digits. The regex /^\d{3,4}$/ must allow both.
      expect(checkoutSchema.safeParse(makeValid({ cvv: '1234' })).success).toBe(true);
    });

    it('accepts a 4-digit ZIP code', () => {
      // WHY: Some countries use 4-digit postal codes (e.g. Australia).
      expect(checkoutSchema.safeParse(makeValid({ zip: '1234' })).success).toBe(true);
    });

    it('accepts a 10-digit ZIP code', () => {
      // WHY: Some countries use long postal codes. max is 10 digits.
      expect(checkoutSchema.safeParse(makeValid({ zip: '1234567890' })).success).toBe(true);
    });
  });

  describe('address fields', () => {
    it('rejects an empty first name', () => {
      expect(checkoutSchema.safeParse(makeValid({ firstName: '' })).success).toBe(false);
    });

    it('rejects an empty last name', () => {
      expect(checkoutSchema.safeParse(makeValid({ lastName: '' })).success).toBe(false);
    });

    it('rejects an address shorter than 5 characters', () => {
      // WHY: min(5) means "1 St" is too short — we want a real street address.
      expect(checkoutSchema.safeParse(makeValid({ address: '1 St' })).success).toBe(false);
    });

    it('rejects a city shorter than 2 characters', () => {
      expect(checkoutSchema.safeParse(makeValid({ city: 'A' })).success).toBe(false);
    });
  });

  describe('zip code', () => {
    it('rejects a zip with letters', () => {
      // WHY: /^\d{4,10}$/ — only digits allowed.
      expect(checkoutSchema.safeParse(makeValid({ zip: 'ABC12' })).success).toBe(false);
    });

    it('rejects a zip shorter than 4 digits', () => {
      expect(checkoutSchema.safeParse(makeValid({ zip: '123' })).success).toBe(false);
    });

    it('rejects a zip longer than 10 digits', () => {
      expect(checkoutSchema.safeParse(makeValid({ zip: '12345678901' })).success).toBe(false);
    });
  });

  describe('card number', () => {
    it('rejects a card with only 15 digits', () => {
      // WHY: The regex requires exactly 4 groups of 4 digits = 16 total.
      expect(checkoutSchema.safeParse(makeValid({ cardNumber: '123456789012345' })).success).toBe(false);
    });

    it('rejects a card with 17 digits', () => {
      expect(checkoutSchema.safeParse(makeValid({ cardNumber: '12345678901234567' })).success).toBe(false);
    });

    it('rejects a card with letters', () => {
      expect(checkoutSchema.safeParse(makeValid({ cardNumber: '1234abcd12341234' })).success).toBe(false);
    });
  });

  describe('expiry', () => {
    it('rejects an invalid format (no slash)', () => {
      expect(checkoutSchema.safeParse(makeValid({ expiry: '1227' })).success).toBe(false);
    });

    it('rejects month 00', () => {
      // WHY: Regex uses (0[1-9]|1[0-2]) — month 00 is not a real month.
      expect(checkoutSchema.safeParse(makeValid({ expiry: '00/27' })).success).toBe(false);
    });

    it('rejects month 13', () => {
      // WHY: 1[0-2] only matches 10, 11, 12 — not 13.
      expect(checkoutSchema.safeParse(makeValid({ expiry: '13/27' })).success).toBe(false);
    });

    it('accepts month 01 (January)', () => {
      expect(checkoutSchema.safeParse(makeValid({ expiry: '01/30' })).success).toBe(true);
    });

    it('accepts month 12 (December)', () => {
      expect(checkoutSchema.safeParse(makeValid({ expiry: '12/30' })).success).toBe(true);
    });
  });

  describe('CVV', () => {
    it('rejects a 2-digit CVV', () => {
      expect(checkoutSchema.safeParse(makeValid({ cvv: '12' })).success).toBe(false);
    });

    it('rejects a 5-digit CVV', () => {
      expect(checkoutSchema.safeParse(makeValid({ cvv: '12345' })).success).toBe(false);
    });

    it('rejects a CVV with letters', () => {
      expect(checkoutSchema.safeParse(makeValid({ cvv: '12a' })).success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isDeclinedCard
// ---------------------------------------------------------------------------

describe('isDeclinedCard', () => {
  it('returns true for a card starting with 0000 (no separators)', () => {
    // WHY: The payment simulation rejects cards prefixed with "0000",
    //      matching Stripe's test card convention.
    expect(isDeclinedCard('0000111122223333')).toBe(true);
  });

  it('returns true for a card starting with 0000 (space separators)', () => {
    // WHY: The function strips spaces/dashes before checking, so formatting
    //      must not affect decline detection.
    expect(isDeclinedCard('0000 1111 2222 3333')).toBe(true);
  });

  it('returns true for a card starting with 0000 (dash separators)', () => {
    expect(isDeclinedCard('0000-1111-2222-3333')).toBe(true);
  });

  it('returns false for a regular card not starting with 0000', () => {
    expect(isDeclinedCard('4111111111111111')).toBe(false);
  });

  it('returns false for a card starting with 1000 (not 0000)', () => {
    // WHY: Only the exact prefix "0000" triggers decline — not "1000" or "0001".
    expect(isDeclinedCard('1000111122223333')).toBe(false);
  });
});
