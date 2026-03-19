/**
 * @fileoverview Error handler — maps raw API errors to ErrorCode and pushes
 * them to the global error store.
 *
 * ## Responsibilities
 *
 * 1. **`resolveErrorCode()`** — converts a raw Axios/JS error + a normalized
 *    error descriptor into the correct `ErrorCode` (reads backend error codes).
 *
 * 2. **`handleApiError()`** — convenience function used in the Axios response
 *    interceptor and any component that wants to push an API error to the
 *    global store with a single call.
 *
 * 3. **`handleRouteError()`** — used by route guards (DeepLinkGuard,
 *    FeatureGuard, WhitelistGuard) to signal routing-level failures.
 *
 * ## Backend error code mapping
 *
 * The FreeAPI (and most REST APIs) embed a machine-readable code in the
 * response body:
 * ```json
 * { "success": false, "message": "Order not found", "errorCode": "ORDER_NOT_FOUND" }
 * ```
 * `resolveErrorCode()` reads `response.data.errorCode` first. This allows
 * precise mapping even when two endpoints return the same HTTP status but
 * mean different things (e.g. two 404s — product vs order).
 *
 * @module core/errors/error.handler
 */

import axios from 'axios';
import type { NormalizedApiError } from '@/utils/normalizeApiError';
import type { ErrorCode, PushErrorOptions } from './error.types';
import { useErrorStore } from './error.store';

// ---------------------------------------------------------------------------
// Backend error code → ErrorCode mapping
// ---------------------------------------------------------------------------

/**
 * Maps backend `errorCode` strings (from the response body) to our internal
 * `ErrorCode` type.
 *
 * Add entries here as new backend error codes are introduced.
 */
const BACKEND_CODE_MAP: Record<string, ErrorCode> = {
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  // Add more backend codes here as the API grows
};

// ---------------------------------------------------------------------------
// Resolve error code
// ---------------------------------------------------------------------------

/**
 * Converts a raw error + pre-normalized descriptor into an `ErrorCode`.
 *
 * Resolution order:
 * 1. Backend `errorCode` in response body (most specific)
 * 2. HTTP status → ErrorCode mapping
 * 3. Normalized error type → ErrorCode mapping
 * 4. Fallback: `'UNKNOWN_ERROR'`
 *
 * @param rawError   - The raw caught value from Axios (typed `unknown`).
 * @param normalized - Already-normalized error from `normalizeApiError()`.
 * @returns The most specific `ErrorCode` for this failure.
 */
export function resolveErrorCode(
  rawError: unknown,
  normalized: NormalizedApiError,
): ErrorCode {
  // ── 1. Backend errorCode from response body ───────────────────────────────
  if (
    axios.isAxiosError(rawError) &&
    rawError.response?.data &&
    typeof rawError.response.data === 'object'
  ) {
    const backendCode = (rawError.response.data as Record<string, unknown>)
      .errorCode;
    if (typeof backendCode === 'string' && backendCode in BACKEND_CODE_MAP) {
      return BACKEND_CODE_MAP[backendCode];
    }
  }

  // ── 2. HTTP status code ───────────────────────────────────────────────────
  if (axios.isAxiosError(rawError) && rawError.response?.status) {
    const status = rawError.response.status;
    if (status === 401) return 'SESSION_EXPIRED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'RESOURCE_NOT_FOUND';
    if (status >= 500) return 'SERVER_ERROR';
  }

  // ── 3. Normalized type ────────────────────────────────────────────────────
  switch (normalized.type) {
    case 'network':  return 'NETWORK_ERROR';
    case 'server':   return 'SERVER_ERROR';
    case 'auth':     return 'UNAUTHORIZED';
    case 'validation': return 'VALIDATION_ERROR';
    default:         return 'UNKNOWN_ERROR';
  }
}

// ---------------------------------------------------------------------------
// Handle API error (convenience function for interceptors + components)
// ---------------------------------------------------------------------------

/**
 * Resolves the error code from a raw API error and pushes it to the global
 * error store.
 *
 * This is the primary entry point called by the Axios response interceptor.
 * Components that want to push an API error manually can also call this.
 *
 * @param rawError   - The raw caught value from the Axios response interceptor.
 * @param normalized - Pre-normalized error from `normalizeApiError()`.
 * @param options    - Optional display overrides (e.g. `displayModeOverride`).
 */
export function handleApiError(
  rawError: unknown,
  normalized: NormalizedApiError,
  options?: PushErrorOptions,
): void {
  const code = resolveErrorCode(rawError, normalized);
  useErrorStore.getState().pushError(code, options);
}

// ---------------------------------------------------------------------------
// Handle route error (used by guards)
// ---------------------------------------------------------------------------

/**
 * Push a route-level error to the global store.
 *
 * Used by `DeepLinkGuard`, `FeatureGuard`, and `WhitelistGuard` when they
 * detect a condition that should surface a user-facing error.
 *
 * @param code    - The error code to push.
 * @param options - Optional display overrides.
 */
export function handleRouteError(
  code: ErrorCode,
  options?: PushErrorOptions,
): void {
  useErrorStore.getState().pushError(code, options);
}
