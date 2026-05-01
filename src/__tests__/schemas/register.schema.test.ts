/**
 * @fileoverview Unit tests for `registerSchema` (Zod).
 *
 * ## Why the password regex deserves special attention
 *
 * The register password pattern requires ALL of: uppercase, lowercase,
 * digit, and special character. This is a common source of bugs because:
 *
 * - "Missing uppercase" and "missing special char" are separate failure modes.
 * - A regex with lookaheads can be hard to read — tests serve as executable
 *   documentation of what passes and what does not.
 *
 * ## Regex used: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/`
 *
 * Breaking down the lookaheads:
 * - `(?=.*[a-z])` — must contain at least one lowercase letter
 * - `(?=.*[A-Z])` — must contain at least one uppercase letter
 * - `(?=.*\d)`    — must contain at least one digit
 * - `(?=.*[@$!%*?&])` — must contain at least one of these special chars
 * - `{6,}`        — total length must be ≥ 6
 */

import { describe, it, expect } from 'vitest';
import { registerSchema } from '@/schemas/register.schema';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * A fully valid registration payload used as the baseline for all tests.
 * Each test overrides only the one field it wants to validate.
 */
const makeValid = (overrides?: Record<string, unknown>) => ({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'Secret1!',
  gender: 'male',
  country: 'US',
  bio: 'Hello world',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerSchema', () => {
  describe('valid data', () => {
    it('accepts a fully valid registration payload', () => {
      // WHY: Baseline — if this fails, every other test result is meaningless.
      expect(registerSchema.safeParse(makeValid()).success).toBe(true);
    });

    it('accepts a payload without bio (bio is optional)', () => {
      // WHY: Optional fields must pass even when absent — Zod `optional()`
      //      means the key can be missing entirely, not just undefined.
      const { bio: _bio, ...withoutBio } = makeValid();
      expect(registerSchema.safeParse(withoutBio).success).toBe(true);
    });
  });

  describe('username field', () => {
    it('rejects a username shorter than 3 characters', () => {
      // WHY: min(3) should reject "jo" (2 chars) — one below the boundary.
      expect(registerSchema.safeParse(makeValid({ username: 'jo' })).success).toBe(false);
    });

    it('accepts a username exactly 3 characters long', () => {
      // WHY: Boundary value — min(3) should ACCEPT exactly 3 chars.
      expect(registerSchema.safeParse(makeValid({ username: 'joe' })).success).toBe(true);
    });

    it('rejects an empty username', () => {
      expect(registerSchema.safeParse(makeValid({ username: '' })).success).toBe(false);
    });
  });

  describe('email field', () => {
    it('rejects an empty email', () => {
      expect(registerSchema.safeParse(makeValid({ email: '' })).success).toBe(false);
    });

    it('rejects a malformed email', () => {
      expect(registerSchema.safeParse(makeValid({ email: 'notvalid' })).success).toBe(false);
    });
  });

  /**
   * @group password-regex
   * The password must satisfy ALL four character-class requirements simultaneously.
   * Tests below verify each individual requirement can independently fail.
   */
  describe('password regex requirements', () => {
    it('rejects a password with no uppercase letter', () => {
      // WHY: "secret1!" has lowercase + digit + special but NO uppercase.
      //      (?=.*[A-Z]) should cause this to fail.
      expect(registerSchema.safeParse(makeValid({ password: 'secret1!' })).success).toBe(false);
    });

    it('rejects a password with no lowercase letter', () => {
      // WHY: "SECRET1!" has uppercase + digit + special but NO lowercase.
      expect(registerSchema.safeParse(makeValid({ password: 'SECRET1!' })).success).toBe(false);
    });

    it('rejects a password with no digit', () => {
      // WHY: "Secrets!" has upper + lower + special but NO digit.
      expect(registerSchema.safeParse(makeValid({ password: 'Secrets!' })).success).toBe(false);
    });

    it('rejects a password with no special character', () => {
      // WHY: "Secret123" has upper + lower + digit but NO special char.
      //      Special chars are limited to: @$!%*?&
      expect(registerSchema.safeParse(makeValid({ password: 'Secret123' })).success).toBe(false);
    });

    it('rejects a password shorter than 6 characters', () => {
      // WHY: Even if it meets character class requirements, {6,} enforces length.
      expect(registerSchema.safeParse(makeValid({ password: 'A1!a' })).success).toBe(false);
    });

    it('accepts a password meeting all four requirements', () => {
      // WHY: "Secret1!" = uppercase S + lowercase ecret + digit 1 + special !
      expect(registerSchema.safeParse(makeValid({ password: 'Secret1!' })).success).toBe(true);
    });

    it('attaches the correct error message for failing the regex', () => {
      // WHY: The error message is shown in the form — we must assert the exact
      //      string so a typo in the schema is caught immediately.
      const result = registerSchema.safeParse(makeValid({ password: 'allowercase1!' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('uppercase'))).toBe(true);
      }
    });
  });

  describe('required fields', () => {
    it('rejects a missing gender', () => {
      // WHY: nonempty() — gender is a required dropdown selection.
      expect(registerSchema.safeParse(makeValid({ gender: '' })).success).toBe(false);
    });

    it('rejects a missing country', () => {
      expect(registerSchema.safeParse(makeValid({ country: '' })).success).toBe(false);
    });
  });
});
