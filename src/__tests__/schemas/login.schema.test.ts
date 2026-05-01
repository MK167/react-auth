/**
 * @fileoverview Unit tests for `loginSchema` (Zod).
 *
 * ## What is Zod and why do we test schemas?
 *
 * Zod is a TypeScript-first schema validation library. A schema is a
 * declarative description of what valid data looks like. We test schemas
 * separately from components because:
 *
 * 1. **Schemas are pure functions** — `schema.safeParse(data)` always returns
 *    `{ success: true, data }` or `{ success: false, error }`. No side effects,
 *    no DOM, no async — ideal for fast unit tests.
 *
 * 2. **They guard the API boundary** — A form can be bypassed (e.g. Postman,
 *    browser devtools). Schema tests prove the contract is enforced regardless
 *    of how the form is submitted.
 *
 * 3. **Regression protection** — If someone changes a validation rule
 *    (e.g. raises min password length) the test immediately catches whether
 *    edge-case data still passes or fails.
 *
 * ## How to read Zod test assertions
 *
 * ```ts
 * const result = loginSchema.safeParse(data);
 * // result.success === true  → data is valid, result.data contains parsed value
 * // result.success === false → data is invalid, result.error contains ZodError
 * ```
 *
 * We use `safeParse` (not `parse`) because it never throws — it returns a
 * discriminated union we can assert on cleanly.
 */

import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/schemas/login.schema';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Builds a valid login payload. Individual tests override only the field
 * under test — this keeps each test focused on ONE failure condition.
 *
 * @param overrides - Partial fields to override from the valid base.
 */
const makeValid = (overrides?: Record<string, unknown>) => ({
  email: 'user@example.com',
  password: 'secret123',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('loginSchema', () => {
  /**
   * @group happy-path
   * The "golden path" — verifies that completely valid data passes without
   * errors. If this test fails, every other test in this file is suspect
   * (the baseline itself is broken).
   */
  describe('valid data', () => {
    it('accepts a valid email and password', () => {
      // WHY: We need a baseline that confirms the schema accepts correct data.
      // HOW: safeParse returns { success: true } when all rules pass.
      const result = loginSchema.safeParse(makeValid());
      expect(result.success).toBe(true);
    });

    it('accepts a password exactly at the minimum length (6 chars)', () => {
      // WHY: Boundary values are where off-by-one bugs hide.
      //      min(6) should accept exactly 6 characters.
      const result = loginSchema.safeParse(makeValid({ password: 'abc123' }));
      expect(result.success).toBe(true);
    });

    it('accepts an email at the maximum length boundary (255 chars)', () => {
      // WHY: max(255) should accept exactly 255 characters without failing.
      const localPart = 'a'.repeat(243); // 243 + '@x.com' = 249 chars (under 255)
      const result = loginSchema.safeParse(makeValid({ email: `${localPart}@x.com` }));
      expect(result.success).toBe(true);
    });
  });

  /**
   * @group email-validation
   * Email field rules: non-empty, valid format, max 255 chars.
   */
  describe('email field', () => {
    it('rejects an empty string', () => {
      // WHY: nonempty() fires before email() — empty strings must be caught.
      // HOW: success === false confirms at least one Zod rule rejected the value.
      const result = loginSchema.safeParse(makeValid({ email: '' }));
      expect(result.success).toBe(false);
    });

    it('rejects a string without @ symbol', () => {
      // WHY: "notanemail" passes the string type check but fails the email format.
      const result = loginSchema.safeParse(makeValid({ email: 'notanemail' }));
      expect(result.success).toBe(false);
    });

    it('rejects a string with @ but no domain', () => {
      // WHY: "user@" satisfies presence of @ but is not a valid email.
      const result = loginSchema.safeParse(makeValid({ email: 'user@' }));
      expect(result.success).toBe(false);
    });

    it('rejects an email exceeding 255 characters', () => {
      // WHY: max(255) should reject values that are too long.
      const tooLong = `${'a'.repeat(250)}@x.com`; // 256 chars
      const result = loginSchema.safeParse(makeValid({ email: tooLong }));
      expect(result.success).toBe(false);
    });

    it('includes a descriptive error message for invalid email format', () => {
      // WHY: Error messages are shown to users — we must assert the right
      //      message is attached so the form renders the correct hint.
      // HOW: result.error.issues is an array of ZodIssue objects.
      const result = loginSchema.safeParse(makeValid({ email: 'bad-email' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Invalid email address');
      }
    });
  });

  /**
   * @group password-validation
   * Password field rules: non-empty, min 6 chars.
   */
  describe('password field', () => {
    it('rejects an empty string', () => {
      const result = loginSchema.safeParse(makeValid({ password: '' }));
      expect(result.success).toBe(false);
    });

    it('rejects a password shorter than 6 characters', () => {
      // WHY: min(6) should reject 5 characters — one below the boundary.
      const result = loginSchema.safeParse(makeValid({ password: 'ab12' }));
      expect(result.success).toBe(false);
    });

    it('includes a descriptive error message for short passwords', () => {
      const result = loginSchema.safeParse(makeValid({ password: '123' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Password must be at least 6 characters');
      }
    });
  });

  /**
   * @group type-safety
   * Zod validates TypeScript types at runtime — useful when data arrives from
   * untrusted sources (API responses, user input, URL params).
   */
  describe('type coercion / non-string inputs', () => {
    it('rejects a number where a string is expected', () => {
      // WHY: Forms can receive data from untrusted sources. Zod must reject
      //      non-string values even if TypeScript would otherwise allow `any`.
      const result = loginSchema.safeParse({ email: 123, password: 'pass123' });
      expect(result.success).toBe(false);
    });

    it('rejects null values', () => {
      const result = loginSchema.safeParse({ email: null, password: null });
      expect(result.success).toBe(false);
    });
  });
});
