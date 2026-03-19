/**
 * @fileoverview API error normalization utility.
 *
 * ## Why centralize error normalization?
 *
 * Raw Axios errors are structurally inconsistent across failure modes:
 *
 * | Failure mode     | What exists on the error object                      |
 * |------------------|------------------------------------------------------|
 * | Network offline  | `error.request` set, `error.response` is undefined  |
 * | Timeout          | `error.code === 'ECONNABORTED'`, no response        |
 * | Server crash     | `error.response.status` >= 500                       |
 * | Validation       | `error.response.status` 400 / 422 with body message |
 * | Auth expired     | `error.response.status` === 401                      |
 * | Cancelled        | `axios.isCancel(error) === true`                     |
 *
 * Without normalization, every component and interceptor must re-implement
 * this branching logic, introducing subtle inconsistencies (e.g. one page
 * checks `status >= 500` while another checks `status === 500`).
 *
 * Centralizing it here creates a single "Anti-Corruption Layer" — the messy
 * external contract (Axios) is translated into a clean internal type that
 * the rest of the codebase can exhaustively switch on.
 *
 * @module utils/normalizeApiError
 */

import axios from 'axios';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all API error categories.
 *
 * - `network`    — no response received (offline, DNS, CORS, timeout).
 * - `server`     — status ≥ 500, unrecoverable on the client side.
 * - `validation` — 400 / 422, user-fixable input error with a message.
 * - `auth`       — 401 / 403, session expired or forbidden.
 * - `unknown`    — any other status, programming errors, or cancelled requests.
 */
export type ApiErrorType = 'network' | 'server' | 'validation' | 'auth' | 'unknown';

/**
 * Normalized API error — stable shape for UI consumption regardless of
 * which Axios failure mode triggered the error.
 *
 * @example
 * ```ts
 * const err = normalizeApiError(caughtError);
 * if (err.type === 'validation') showFieldErrors(err.message);
 * if (err.type === 'server')     navigate('/error?type=server');
 * if (err.type === 'network')    navigate('/error?type=network');
 * ```
 */
export type NormalizedApiError = {
  /** Discriminator — allows exhaustive switch/if chains without casting */
  type: ApiErrorType;
  /** Human-readable message safe to display directly in the UI */
  message: string;
  /** HTTP status code if a response was received; `undefined` for network errors */
  status?: number;
};

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Safely extracts the `message` string from an Axios response body.
 * Falls back to `fallback` if the body is missing, malformed, or non-string.
 *
 * @param data     - Raw response body (unknown shape — typed as unknown).
 * @param fallback - Default message when extraction fails.
 */
function extractApiMessage(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as Record<string, unknown>).message === 'string'
  ) {
    return (data as { message: string }).message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Converts any thrown value into a {@link NormalizedApiError}.
 *
 * ### Decision tree
 *
 * 1. **Cancelled** — `axios.isCancel()` → `unknown` (no redirect, no toast).
 * 2. **Timeout** — `error.code === 'ECONNABORTED'` → `network`.
 * 3. **No response** — request was sent but no response came back → `network`.
 * 4. **5xx** — server-side failure → `server`.
 * 5. **401 / 403** — authentication / authorization → `auth`.
 * 6. **400 / 422** — client validation → `validation` with API message.
 * 7. **Other HTTP** — any other status → `unknown` with API message.
 * 8. **Non-Axios** — plain JS Error or unknown value → `unknown`.
 *
 * @param error - The raw caught value (typed `unknown` — never assume Axios).
 * @returns A {@link NormalizedApiError} safe to consume in any UI layer.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  // ── Cancelled requests ────────────────────────────────────────────────────
  // AbortController cancels or CancelToken cancels. These are intentional —
  // do NOT show an error page or toast. Return early with a benign message.
  if (axios.isCancel(error)) {
    return { type: 'unknown', message: 'Request cancelled.' };
  }

  if (axios.isAxiosError(error)) {
    // ── Timeout ──────────────────────────────────────────────────────────────
    // Axios sets error.code = 'ECONNABORTED' when a request exceeds the
    // configured `timeout` value. Treat as a network problem — the server
    // may be overloaded or the connection may be poor.
    if (error.code === 'ECONNABORTED') {
      return {
        type: 'network',
        message: 'Request timed out. Please check your connection and try again.',
      };
    }

    // ── No response received ──────────────────────────────────────────────
    // `error.request` is set (the browser sent the request) but
    // `error.response` is undefined (no bytes came back). This happens when:
    //   - The device is offline.
    //   - The server is completely unreachable (DNS failure, firewall).
    //   - CORS pre-flight was blocked.
    if (error.request && !error.response) {
      return {
        type: 'network',
        message: 'Unable to reach the server. Please check your internet connection.',
      };
    }

    if (error.response) {
      const { status, data } = error.response;

      // ── Server errors (5xx) ───────────────────────────────────────────────
      // Anything ≥ 500 is a non-recoverable server-side failure. The client
      // cannot fix it — show the error page and tell the user to retry later.
      if (status >= 500) {
        return {
          type: 'server',
          message:
            'The server encountered an unexpected error. Our team has been notified — please try again shortly.',
          status,
        };
      }

      // ── Auth errors ───────────────────────────────────────────────────────
      // 401 is normally handled by the silent refresh interceptor before this
      // function is called. If it reaches here, the session is truly expired.
      // 403 means the user is authenticated but lacks permission.
      if (status === 401 || status === 403) {
        return {
          type: 'auth',
          message: extractApiMessage(data, 'Authentication required. Please sign in.'),
          status,
        };
      }

      // ── Validation / bad request ──────────────────────────────────────────
      // 400 and 422 carry a user-fixable message from the server. Return it
      // so form components can display field-level feedback.
      if (status === 400 || status === 422) {
        return {
          type: 'validation',
          message: extractApiMessage(data, 'Please check your input and try again.'),
          status,
        };
      }

      // ── Any other HTTP error (404 from API, 409 conflict, 429 rate-limit) ─
      return {
        type: 'unknown',
        message: extractApiMessage(data, `Unexpected error (HTTP ${status}).`),
        status,
      };
    }
  }

  // Non-Axios errors: programming bugs, JSON.parse failures, etc.
  if (error instanceof Error) {
    return { type: 'unknown', message: error.message };
  }

  return { type: 'unknown', message: 'An unexpected error occurred.' };
}
