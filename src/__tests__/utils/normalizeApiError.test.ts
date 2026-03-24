/**
 * @fileoverview Unit tests for normalizeApiError.
 *
 * ## Testing the Anti-Corruption Layer
 *
 * `normalizeApiError` is the seam between raw Axios errors (messy, variable
 * shape) and the rest of the application (clean, stable types). If this
 * function has a bug, every error display in the app could be wrong.
 *
 * ## How to construct mock Axios errors without mocking the module
 *
 * `axios.isAxiosError(val)` returns `true` when `val.isAxiosError === true`.
 * This lets us create plain objects that pass the check:
 *
 * ```ts
 * const err = { isAxiosError: true, response: { status: 404, data: {} } };
 * axios.isAxiosError(err); // true
 * ```
 *
 * We avoid mocking the entire `axios` module because it would also disable
 * `axios.isCancel()` and other utilities used elsewhere.
 *
 * ## How to create a cancelled request mock
 *
 * Axios's `isCancel(val)` checks `val?.__CANCEL__ === true` (or truthy).
 * We exploit this to create a mock cancelled error:
 *
 * ```ts
 * const cancelled = { __CANCEL__: true, message: 'Cancelled' };
 * axios.isCancel(cancelled); // true
 * ```
 *
 * ## Decision tree tested
 *
 * The test suite mirrors the documented priority order:
 * 1. Cancelled request → 'unknown'
 * 2. Timeout (ECONNABORTED) → 'network'
 * 3. Request sent, no response → 'network'
 * 4. 5xx response → 'server'
 * 5. 401/403 → 'auth'
 * 6. 400/422 → 'validation'
 * 7. Other HTTP → 'unknown'
 * 8. Non-Axios Error → 'unknown'
 * 9. Unknown value → 'unknown'
 */

import { describe, it, expect } from 'vitest';
import { normalizeApiError } from '@/utils/normalizeApiError';

// ---------------------------------------------------------------------------
// Mock constructors
// ---------------------------------------------------------------------------

/**
 * Creates a mock Axios error object.
 * Sets `isAxiosError: true` so `axios.isAxiosError()` returns true.
 *
 * @param response - Simulated HTTP response (status + body data).
 * @param request  - Truthy value simulates "request was sent".
 * @param code     - Axios error code (e.g. 'ECONNABORTED' for timeout).
 */
function makeAxiosError(opts: {
  response?: { status: number; data?: unknown };
  request?: unknown;
  code?: string;
} = {}) {
  return {
    isAxiosError: true as const,
    message: 'axios error',
    response: opts.response,
    request: opts.request ?? (opts.response ? {} : undefined),
    code: opts.code,
  };
}

/**
 * Creates a mock cancelled request.
 * `axios.isCancel()` checks for the `__CANCEL__` property.
 */
function makeCancelledError() {
  return { __CANCEL__: true, message: 'Request cancelled by AbortController' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('normalizeApiError', () => {
  /**
   * @group cancelled
   * Cancelled requests are intentional — the user navigated away or a
   * component unmounted. They must never show an error page or toast.
   */
  describe('cancelled requests', () => {
    it('returns type "unknown" for a cancelled request', () => {
      // WHY: Showing "An error occurred" for a deliberate cancel is bad UX.
      //      The caller checks for type === 'unknown' and can suppress the error.
      const result = normalizeApiError(makeCancelledError());
      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Request cancelled.');
    });
  });

  /**
   * @group network-errors
   * These errors occur when no HTTP response is received from the server.
   */
  describe('network errors', () => {
    it('returns type "network" for a timeout (ECONNABORTED)', () => {
      // WHY: Timeout = the server is alive but slow. The message should
      //      tell the user to retry, not report a server crash.
      const err = makeAxiosError({ code: 'ECONNABORTED' });
      const result = normalizeApiError(err);
      expect(result.type).toBe('network');
      expect(result.message).toContain('timed out');
    });

    it('returns type "network" when request was sent but no response received', () => {
      // WHY: request set + response undefined = device is offline or DNS failed.
      const err = makeAxiosError({ request: {}, response: undefined });
      const result = normalizeApiError(err);
      expect(result.type).toBe('network');
      expect(result.message).toContain('Unable to reach');
    });
  });

  /**
   * @group server-errors
   * 5xx responses indicate a problem on the server side, not the client.
   */
  describe('server errors (5xx)', () => {
    it('returns type "server" for a 500 response', () => {
      const err = makeAxiosError({ response: { status: 500, data: {} } });
      expect(normalizeApiError(err).type).toBe('server');
    });

    it('returns type "server" for a 503 response', () => {
      // WHY: status >= 500 — we test 503 to confirm the ">=" boundary, not just 500.
      const err = makeAxiosError({ response: { status: 503, data: {} } });
      expect(normalizeApiError(err).type).toBe('server');
    });

    it('includes a user-friendly message for server errors', () => {
      const err = makeAxiosError({ response: { status: 500, data: {} } });
      const result = normalizeApiError(err);
      expect(result.status).toBe(500);
      expect(result.message).toContain('server');
    });
  });

  /**
   * @group auth-errors
   * 401 and 403 both indicate authentication/authorization failures.
   */
  describe('auth errors (401/403)', () => {
    it('returns type "auth" for a 401 response', () => {
      // WHY: 401 normally means the token expired. The silent refresh interceptor
      //      handles this first; if it reaches normalizeApiError, the session is gone.
      const err = makeAxiosError({ response: { status: 401, data: { message: 'Token expired' } } });
      const result = normalizeApiError(err);
      expect(result.type).toBe('auth');
      expect(result.status).toBe(401);
    });

    it('returns type "auth" for a 403 response', () => {
      // WHY: 403 = authenticated but not authorized (e.g. customer on admin route).
      const err = makeAxiosError({ response: { status: 403, data: {} } });
      expect(normalizeApiError(err).type).toBe('auth');
    });

    it('extracts the message from the response body for auth errors', () => {
      // WHY: The API sends a specific message like "Access denied" that is more
      //      helpful than the generic fallback.
      const err = makeAxiosError({
        response: { status: 401, data: { message: 'Token expired' } },
      });
      expect(normalizeApiError(err).message).toBe('Token expired');
    });

    it('falls back to a default message when the body has no message field', () => {
      const err = makeAxiosError({ response: { status: 403, data: {} } });
      expect(normalizeApiError(err).message).toContain('Authentication required');
    });
  });

  /**
   * @group validation-errors
   * 400 and 422 mean the client sent bad data — the server message is shown directly.
   */
  describe('validation errors (400/422)', () => {
    it('returns type "validation" for a 400 response', () => {
      const err = makeAxiosError({
        response: { status: 400, data: { message: 'Invalid input' } },
      });
      const result = normalizeApiError(err);
      expect(result.type).toBe('validation');
      expect(result.message).toBe('Invalid input');
    });

    it('returns type "validation" for a 422 response', () => {
      // WHY: 422 Unprocessable Entity is the semantic HTTP code for validation failures.
      const err = makeAxiosError({
        response: { status: 422, data: { message: 'Email already in use' } },
      });
      expect(normalizeApiError(err).type).toBe('validation');
    });

    it('uses a fallback message when the body does not contain a message', () => {
      const err = makeAxiosError({ response: { status: 400, data: null } });
      const result = normalizeApiError(err);
      expect(result.message).toContain('check your input');
    });
  });

  /**
   * @group other-http
   * Other HTTP status codes (404, 409, 429) fall through to 'unknown'.
   */
  describe('other HTTP errors', () => {
    it('returns type "unknown" for a 404 response', () => {
      const err = makeAxiosError({ response: { status: 404, data: {} } });
      expect(normalizeApiError(err).type).toBe('unknown');
      expect(normalizeApiError(err).status).toBe(404);
    });

    it('returns type "unknown" for a 429 (rate limit) response', () => {
      const err = makeAxiosError({
        response: { status: 429, data: { message: 'Too many requests' } },
      });
      expect(normalizeApiError(err).type).toBe('unknown');
    });
  });

  /**
   * @group non-axios-errors
   * Plain JavaScript errors and unknown thrown values.
   */
  describe('non-Axios errors', () => {
    it('returns type "unknown" for a plain Error instance', () => {
      // WHY: JSON.parse failures, undefined property access, etc. are
      //      plain Error objects — not Axios errors.
      const err = new Error('JSON parse failed');
      const result = normalizeApiError(err);
      expect(result.type).toBe('unknown');
      expect(result.message).toBe('JSON parse failed');
    });

    it('returns type "unknown" for a thrown string', () => {
      // WHY: Some libraries throw strings. normalizeApiError must never crash.
      const result = normalizeApiError('something went wrong');
      expect(result.type).toBe('unknown');
      expect(result.message).toBe('An unexpected error occurred.');
    });

    it('returns type "unknown" for null', () => {
      const result = normalizeApiError(null);
      expect(result.type).toBe('unknown');
    });

    it('returns type "unknown" for undefined', () => {
      const result = normalizeApiError(undefined);
      expect(result.type).toBe('unknown');
    });
  });
});
