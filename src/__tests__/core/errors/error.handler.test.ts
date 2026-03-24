/**
 * @fileoverview Unit tests for resolveErrorCode and handleApiError.
 *
 * ## What resolveErrorCode does
 *
 * It walks a priority chain to find the most specific ErrorCode:
 *
 * ```
 * Priority 1: Backend errorCode in response.data.errorCode  ← most specific
 * Priority 2: HTTP status code mapping (401→SESSION_EXPIRED, etc.)
 * Priority 3: Normalized error type ('network'→NETWORK_ERROR, etc.)
 * Priority 4: 'UNKNOWN_ERROR' fallback
 * ```
 *
 * Testing this chain verifies that the priority order is correct — e.g.
 * a 404 with `errorCode: 'ORDER_NOT_FOUND'` should map to 'ORDER_NOT_FOUND',
 * not 'RESOURCE_NOT_FOUND' (which the status-only path would produce).
 *
 * ## Mocking useErrorStore
 *
 * `handleApiError` calls `useErrorStore.getState().pushError(...)`.
 * We mock the store to capture calls without actually routing errors to
 * the Zustand state — the store's own behaviour is tested separately in
 * `error.store.test.ts`.
 *
 * ## vi.hoisted for mock functions inside vi.mock
 *
 * Variables declared inside `vi.mock()` factories are re-evaluated every
 * time the mock is imported. To share a reference between the factory and
 * the test body, declare with `vi.hoisted`.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Hoist the mock pushError so we can assert on it ───────────────────────
const mockPushError = vi.hoisted(() => vi.fn());

vi.mock('@/core/errors/error.store', () => ({
  useErrorStore: {
    getState: () => ({ pushError: mockPushError }),
  },
}));

import { resolveErrorCode, handleApiError } from '@/core/errors/error.handler';
import type { NormalizedApiError } from '@/utils/normalizeApiError';

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

/**
 * Builds a minimal Axios-like error.
 * `isAxiosError: true` makes `axios.isAxiosError(err)` return true.
 */
function makeAxiosError(opts: {
  status?: number;
  backendCode?: string;
  data?: Record<string, unknown>;
} = {}) {
  return {
    isAxiosError: true,
    response: opts.status
      ? {
          status: opts.status,
          data: { errorCode: opts.backendCode, ...opts.data },
        }
      : undefined,
  };
}

function makeNormalized(type: NormalizedApiError['type']): NormalizedApiError {
  return { type, message: 'test error message', status: 400 };
}

// ---------------------------------------------------------------------------
// resolveErrorCode
// ---------------------------------------------------------------------------

describe('resolveErrorCode', () => {
  /**
   * @group priority-1-backend-code
   * Backend errorCode in the response body takes the highest priority.
   */
  describe('Priority 1: backend errorCode in response body', () => {
    it('maps ORDER_NOT_FOUND backend code to ORDER_NOT_FOUND', () => {
      const err = makeAxiosError({ status: 404, backendCode: 'ORDER_NOT_FOUND' });
      // WHY: Without Priority 1, a 404 would resolve to 'RESOURCE_NOT_FOUND'.
      //      But the specific backend code gives us a more accurate ErrorCode.
      const code = resolveErrorCode(err, makeNormalized('unknown'));
      expect(code).toBe('ORDER_NOT_FOUND');
    });

    it('maps PRODUCT_NOT_FOUND backend code correctly', () => {
      const err = makeAxiosError({ status: 404, backendCode: 'PRODUCT_NOT_FOUND' });
      expect(resolveErrorCode(err, makeNormalized('unknown'))).toBe('PRODUCT_NOT_FOUND');
    });

    it('maps SESSION_EXPIRED backend code correctly', () => {
      const err = makeAxiosError({ status: 401, backendCode: 'SESSION_EXPIRED' });
      expect(resolveErrorCode(err, makeNormalized('auth'))).toBe('SESSION_EXPIRED');
    });

    it('ignores unknown backend codes and falls through to Priority 2', () => {
      // WHY: If the backend sends an unrecognized errorCode string, we must
      //      fall through to the HTTP status check rather than crashing.
      const err = makeAxiosError({ status: 403, backendCode: 'SOME_FUTURE_CODE' });
      expect(resolveErrorCode(err, makeNormalized('auth'))).toBe('FORBIDDEN');
    });
  });

  /**
   * @group priority-2-http-status
   * HTTP status code mapping when no backend errorCode is present.
   */
  describe('Priority 2: HTTP status code', () => {
    it('maps 401 → SESSION_EXPIRED', () => {
      const err = makeAxiosError({ status: 401 });
      expect(resolveErrorCode(err, makeNormalized('auth'))).toBe('SESSION_EXPIRED');
    });

    it('maps 403 → FORBIDDEN', () => {
      const err = makeAxiosError({ status: 403 });
      expect(resolveErrorCode(err, makeNormalized('auth'))).toBe('FORBIDDEN');
    });

    it('maps 404 → RESOURCE_NOT_FOUND', () => {
      const err = makeAxiosError({ status: 404 });
      expect(resolveErrorCode(err, makeNormalized('unknown'))).toBe('RESOURCE_NOT_FOUND');
    });

    it('maps 500 → SERVER_ERROR', () => {
      const err = makeAxiosError({ status: 500 });
      expect(resolveErrorCode(err, makeNormalized('server'))).toBe('SERVER_ERROR');
    });

    it('maps 503 → SERVER_ERROR (any 5xx)', () => {
      const err = makeAxiosError({ status: 503 });
      expect(resolveErrorCode(err, makeNormalized('server'))).toBe('SERVER_ERROR');
    });
  });

  /**
   * @group priority-3-normalized-type
   * Normalized error type mapping when no Axios error or no response status.
   */
  describe('Priority 3: normalized error type', () => {
    it('maps type "network" → NETWORK_ERROR for non-Axios errors', () => {
      // WHY: A plain Error has no isAxiosError property — fall through to Priority 3.
      const plainError = new Error('network failure');
      expect(resolveErrorCode(plainError, makeNormalized('network'))).toBe('NETWORK_ERROR');
    });

    it('maps type "server" → SERVER_ERROR', () => {
      const plainError = new Error('server crash');
      expect(resolveErrorCode(plainError, makeNormalized('server'))).toBe('SERVER_ERROR');
    });

    it('maps type "auth" → UNAUTHORIZED', () => {
      const plainError = new Error('forbidden');
      expect(resolveErrorCode(plainError, makeNormalized('auth'))).toBe('UNAUTHORIZED');
    });

    it('maps type "validation" → VALIDATION_ERROR', () => {
      const plainError = new Error('bad input');
      expect(resolveErrorCode(plainError, makeNormalized('validation'))).toBe('VALIDATION_ERROR');
    });
  });

  /**
   * @group priority-4-fallback
   */
  describe('Priority 4: UNKNOWN_ERROR fallback', () => {
    it('returns UNKNOWN_ERROR for an unknown normalized type', () => {
      const plainError = new Error('mystery');
      expect(resolveErrorCode(plainError, makeNormalized('unknown'))).toBe('UNKNOWN_ERROR');
    });
  });
});

// ---------------------------------------------------------------------------
// handleApiError
// ---------------------------------------------------------------------------

describe('handleApiError', () => {
  it('calls pushError on the error store with the resolved code', () => {
    // WHY: handleApiError is the bridge between the Axios interceptor and
    //      the error store. If this call is missing or uses the wrong code,
    //      no error UI is shown to the user.
    const err = makeAxiosError({ status: 500 });
    handleApiError(err, makeNormalized('server'));

    expect(mockPushError).toHaveBeenCalledWith('SERVER_ERROR', undefined);
  });

  it('forwards optional PushErrorOptions to pushError', () => {
    // WHY: Callers can pass a retry callback — it must reach the store unchanged.
    const retryFn = vi.fn();
    const err = makeAxiosError({ status: 503 });
    handleApiError(err, makeNormalized('server'), { onRetry: retryFn });

    expect(mockPushError).toHaveBeenCalledWith('SERVER_ERROR', { onRetry: retryFn });
  });
});
