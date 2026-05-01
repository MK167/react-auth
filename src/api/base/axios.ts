/**
 * @fileoverview Axios instance factory with five cross-cutting concerns:
 *
 * 1. **Bearer token injection** (request interceptor)
 *    Reads the access token from the cookie and attaches it to every outgoing
 *    request as `Authorization: Bearer <token>`.
 *
 * 2. **Global loading counter** (request + response interceptors)
 *    Increments/decrements `useUiStore.activeApiRequestsCount` so the
 *    `GlobalLoader` component can show/hide a fullscreen spinner correctly for
 *    parallel requests without race conditions. Uses a counter instead of a
 *    boolean — see `src/store/ui.store.ts` for the full explanation.
 *
 *    Per-request override:
 *    ```ts
 *    authUrl.get('/endpoint', { showGlobalLoader: false })
 *    ```
 *
 * 3. **Silent token refresh** (response interceptor)
 *    Intercepts `401 Unauthorized` responses, fires a refresh-token call,
 *    queues concurrent 401s so only one refresh runs at a time, and retries
 *    all queued requests with the new token. On refresh failure, clears the
 *    session and hard-navigates to `/login`.
 *
 * 4. **Global error system integration** (response interceptor)
 *    Intercepts network failures and server errors (5xx), resolves the
 *    `ErrorCode` using `error.handler.ts`, and pushes it to the global
 *    error store. `GlobalErrorRenderer` then handles the display without a
 *    hard page navigation.
 *
 *    Does NOT push to the error store for:
 *    - 401 (handled by silent refresh above)
 *    - 400 / 422 (validation — components handle with field messages)
 *    - Cancelled requests (intentional abort)
 *    - Requests marked with `skipGlobalErrorHandler: true`
 *
 *    Per-request override:
 *    ```ts
 *    authUrl.get('/endpoint', { skipGlobalErrorHandler: true })
 *    ```
 *
 * 5. **Backend error code mapping**
 *    When a 4xx/5xx response contains `{ errorCode: "ORDER_NOT_FOUND" }`
 *    in the body, `resolveErrorCode()` maps it to the correct `ErrorCode`
 *    for granular error display.
 *
 * ---
 *
 * ## Circular dependency note
 *
 * Do NOT import `authUrl` / `api` from `src/config/Define.ts` back into this
 * file. The Axios instance here reads from `useAuthStore` via `getState()` —
 * importing it into `auth.store` would create a circular module dependency
 * that breaks Vite HMR and the production bundle.
 *
 * @module api/axios
 */

import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { normalizeApiError } from '@/utils/normalizeApiError';
import { handleApiError } from '@/core/errors/error.handler';
import { cookieService } from '@/utils/cookie.service';
import axios from 'axios';

// ---------------------------------------------------------------------------
// TypeScript module augmentation
// ---------------------------------------------------------------------------

/**
 * Extend Axios's `InternalAxiosRequestConfig` with our custom per-request
 * options. This provides full type-safety when setting these flags on
 * individual requests.
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /**
     * When `true` (default), the request increments `activeApiRequestsCount`
     * in `useUiStore` and the GlobalLoader component shows a spinner.
     *
     * Set to `false` for background sync calls (wishlist sync, prefetch,
     * cart merge) where a fullscreen spinner would be disruptive.
     *
     * @default true (undefined is treated as true)
     */
    showGlobalLoader?: boolean;

    /**
     * When `true`, errors are NOT pushed to the global error store or
     * redirected to the error page. The calling component handles errors.
     *
     * Use for pages that have their own inline error state (retry banners,
     * field-level messages) so the user isn't redirected away from context.
     *
     * @default false (undefined → global error handler active)
     */
    skipGlobalErrorHandler?: boolean;

    /**
     * Internal flag stamped by the request interceptor when `startLoading()`
     * was called. The response interceptor uses this to decide whether to
     * call `stopLoading()`.
     *
     * Prevents spurious decrements for requests that never incremented.
     *
     * @internal Set automatically by the request interceptor.
     */
    _loaderStarted?: boolean;

    /**
     * Internal flag set to `true` on the retried request config after a
     * successful token refresh. Prevents an infinite refresh loop if the
     * retried request also returns 401.
     *
     * @internal Set automatically by the response interceptor.
     */
    _retry?: boolean;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new Axios instance with the specified `baseURL` and all five
 * cross-cutting concerns wired into its interceptors.
 *
 * @param baseURL - Base URL prepended to every request path.
 * @returns A fully-configured Axios instance.
 *
 * @example
 * ```ts
 * // src/config/Define.ts
 * export const authUrl = createApiInstance(import.meta.env.VITE_LOGIN_AUTH_URL);
 * ```
 */
export const createApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Refresh-queue state (scoped to this instance — no module-level globals)
  // ──────────────────────────────────────────────────────────────────────────

  /** `true` while a refresh-token call is in-flight. */
  let isRefreshing = false;

  /** Queue of pending requests that received 401 while refresh was running. */
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (reason: unknown) => void;
  }> = [];

  /** Drains the queue after a refresh attempt completes. */
  const processQueue = (error: unknown, token: string | null = null): void => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    failedQueue = [];
  };

  // ──────────────────────────────────────────────────────────────────────────
  // REQUEST interceptor
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * 1. Inject `Authorization: Bearer <token>` from the cookie.
   * 2. Increment the loading counter (unless `showGlobalLoader: false`).
   */
  api.interceptors.request.use(
    (config) => {
      // ── 1. Bearer token injection ─────────────────────────────────────────
      const token = cookieService.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      // ── 2. Global loading counter ─────────────────────────────────────────
      if (config.showGlobalLoader !== false) {
        useUiStore.getState().startLoading();
        config._loaderStarted = true;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RESPONSE interceptor
  // ──────────────────────────────────────────────────────────────────────────

  api.interceptors.response.use(
    // ── 2xx success ───────────────────────────────────────────────────────────
    (response) => {
      if (response.config._loaderStarted) {
        useUiStore.getState().stopLoading();
      }
      return response;
    },

    // ── Error ─────────────────────────────────────────────────────────────────
    async (error) => {
      const originalRequest = error.config;

      // ── Cancelled requests ────────────────────────────────────────────────
      // AbortController / CancelToken aborts are intentional. Clean up the
      // counter but do NOT show an error to the user.
      if (axios.isCancel(error)) {
        if (originalRequest?._loaderStarted) {
          useUiStore.getState().stopLoading();
        }
        return Promise.reject(error);
      }

      // ── 401 Unauthorized — silent token refresh ───────────────────────────
      if (error.response?.status === 401 && !originalRequest?._retry) {
        // Stop the spinner NOW so it doesn't freeze during the async refresh.
        if (originalRequest?._loaderStarted) {
          useUiStore.getState().stopLoading();
        }

        // Another refresh is already in-flight — queue this request.
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Use the same base URL as this instance so mock mode (relative /api/v1)
          // and real mode (absolute VITE_LOGIN_AUTH_URL) both work correctly.
          const { data } = await axios.post(
            `${baseURL}/users/refresh-token`,
            {},
            { withCredentials: true },
          );

          const newAccessToken: string = data.data.accessToken;
          useAuthStore.getState().setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);

          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);

          // Race-condition guard: a fresh login (e.g. social auth) may have
          // completed while this refresh was in-flight. If the cookie token
          // is now different from the one on the original failing request, a
          // new valid session exists — destroying it would kick the user back
          // to /login immediately after they just signed in successfully.
          //
          // Compare the current cookie token to the Authorization header of
          // the original 401 request. If they differ, a new setAuth() was
          // called → skip logout and redirect.
          const currentCookieToken = cookieService.getToken() ?? null;
          const originalAuthHeader = originalRequest?.headers?.['Authorization'];
          const originalToken =
            typeof originalAuthHeader === 'string'
              ? originalAuthHeader.replace(/^Bearer\s+/i, '')
              : null;
          const freshLoginOccurred =
            currentCookieToken !== null && currentCookieToken !== originalToken;

          if (!freshLoginOccurred) {
            useAuthStore.getState().logout();
            // Defer the hard navigation to the next macrotask so React can
            // finish its current render/commit cycle before the page unloads.
            // Navigating synchronously while React is mid-render tears down
            // the React dispatcher, causing useContext to throw.
            setTimeout(() => { window.location.href = '/login'; }, 0);
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // ── All other errors ──────────────────────────────────────────────────

      if (originalRequest?._loaderStarted) {
        useUiStore.getState().stopLoading();
      }

      // Push to global error store unless the caller opted out.
      if (!originalRequest?.skipGlobalErrorHandler) {
        const normalized = normalizeApiError(error);
        const status = error.response?.status;

        // Push to the global error store for network errors, server errors,
        // and unhandled 4xx codes. Excluded:
        //   400 / 422 → validation (components handle with field messages)
        //   401       → already handled by the silent-refresh block above
        // All other 4xx (403, 404, 405, 409, 429 …) go to the global handler.
        if (
          normalized.type === 'network' ||
          normalized.type === 'server'  ||
          (status !== undefined && status >= 400 && status < 500 && status !== 400 && status !== 401 && status !== 422)
        ) {
          handleApiError(error, normalized, {
            onRetry: () => {
              // Reload the current page so the user can retry the last action.
              window.location.reload();
            },
          });
          // Do NOT hard-navigate — GlobalErrorRenderer shows the PAGE overlay.
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    },
  );

  return api;
};
