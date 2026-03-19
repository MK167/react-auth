/**
 * @fileoverview Axios instance factory with three cross-cutting concerns:
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
 *    Silent refresh calls (`POST /users/refresh-token`) always use plain
 *    `axios`, not `api`, so they never increment the counter.
 *
 * 3. **Silent token refresh** (response interceptor)
 *    Intercepts `401 Unauthorized` responses, fires a refresh-token call,
 *    queues concurrent 401s so only one refresh runs at a time, and retries
 *    all queued requests with the new token. On refresh failure, clears the
 *    session and hard-navigates to `/login`.
 *
 * 4. **Global error redirect** (response interceptor)
 *    Intercepts network failures and server crashes (5xx), normalizes the
 *    error, and redirects to `/error?type=network` or `/error?type=server`.
 *    Does NOT redirect for:
 *    - 401 (handled by silent refresh above)
 *    - 400 / 422 (validation — let components handle with field messages)
 *    - Cancelled requests (intentional abort, no user-visible error)
 *    - Requests marked with `skipGlobalErrorHandler: true`
 *
 *    Per-request override:
 *    ```ts
 *    authUrl.get('/endpoint', { skipGlobalErrorHandler: true })
 *    ```
 *
 * ---
 *
 * ## Circular dependency note
 *
 * Do NOT import the `authUrl` / `api` instance from `src/config/Define.ts`
 * back into this file. The Axios instance here reads from `useAuthStore` via
 * `getState()` — importing it into `auth.store` would create a circular
 * module dependency that breaks Vite HMR and the production bundle.
 *
 * @module api/axios
 */

import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { normalizeApiError } from '@/utils/normalizeApiError';
import { cookieService } from '@/utils/cookie.service';
import axios from 'axios';

// ---------------------------------------------------------------------------
// TypeScript module augmentation
// ---------------------------------------------------------------------------

/**
 * Extend Axios's `InternalAxiosRequestConfig` with our custom per-request
 * options. This provides full type-safety when setting these flags on
 * individual requests:
 *
 * ```ts
 * authUrl.get('/admin/data', { skipGlobalErrorHandler: true });
 * authUrl.post('/bg-sync', data, { showGlobalLoader: false });
 * ```
 *
 * ### Why augment instead of casting?
 * Casting (`config as unknown as MyConfig`) silences TypeScript but loses
 * all other property type-checking on the config object. Module augmentation
 * extends the official type, so callers get both our custom fields AND the
 * full Axios config type-safety.
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /**
     * When `true` (default), the request increments `activeApiRequestsCount`
     * in `useUiStore` and the GlobalLoader component shows a spinner.
     *
     * Set to `false` for background sync calls (e.g. wishlist sync on login,
     * silent prefetch requests, cart merge) where showing a fullscreen
     * spinner would be disruptive to the user.
     *
     * @default true (undefined is treated as true)
     */
    showGlobalLoader?: boolean;

    /**
     * When `true`, network failures and server crashes (5xx) are NOT
     * redirected to the `/error` page. The calling component is responsible
     * for handling the error (e.g. showing an inline error banner).
     *
     * Use this for pages that already have their own error state (like the
     * admin products list which shows a retry banner), so the user isn't
     * yanked away from their context.
     *
     * @default false (undefined is treated as false — global redirect active)
     */
    skipGlobalErrorHandler?: boolean;

    /**
     * Internal flag stamped onto the config by the request interceptor when
     * `startLoading()` was called for this request. The response interceptor
     * reads this flag to decide whether to call `stopLoading()`.
     *
     * This prevents a desync where a request with `showGlobalLoader: false`
     * (which skipped `startLoading`) still triggers `stopLoading()`, sending
     * the counter negative.
     *
     * @internal Not part of the public API — set automatically by interceptor.
     */
    _loaderStarted?: boolean;

    /**
     * Internal flag set to `true` on the config of the retried request after
     * a successful token refresh. Prevents an infinite refresh loop if the
     * retried request also returns 401.
     *
     * @internal Not part of the public API — set automatically by interceptor.
     */
    _retry?: boolean;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new Axios instance with the specified `baseURL` and all four
 * cross-cutting concerns wired into its interceptors.
 *
 * @param baseURL - Base URL prepended to every request path.
 *                  Typically `import.meta.env.VITE_LOGIN_AUTH_URL`.
 * @returns A fully-configured Axios instance ready for use in API modules.
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
    // withCredentials: true — kept off for local dev; enable when the
    // backend sets HttpOnly refresh-token cookies in production.
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Refresh-queue state (scoped to this instance — no module-level globals)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * `true` while a refresh-token call is in-flight.
   *
   * Prevents N parallel 401 responses from firing N separate refresh calls.
   * Only the first 401 starts the refresh; subsequent 401s queue instead.
   */
  let isRefreshing = false;

  /**
   * Queue of `{resolve, reject}` pairs from requests that received 401
   * while `isRefreshing` was already `true`.
   *
   * {@link processQueue} drains this after the refresh completes or fails.
   */
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (reason: unknown) => void;
  }> = [];

  /**
   * Drains {@link failedQueue} after a refresh attempt completes.
   *
   * @param error - Refresh error (non-null on failure), or `null` on success.
   * @param token - New access token on success, or `null` on failure.
   */
  const processQueue = (error: unknown, token: string | null = null): void => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!); // safe: only called when error is null
      }
    });
    failedQueue = [];
  };

  // ──────────────────────────────────────────────────────────────────────────
  // REQUEST interceptor
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Runs before every outgoing request. Two responsibilities:
   *
   * 1. **Auth header** — read the access token from the cookie and inject it
   *    as `Authorization: Bearer <token>`. If no token exists, the request
   *    goes out unauthenticated (server responds with 401 for protected routes).
   *
   * 2. **Loading counter** — increment `activeApiRequestsCount` in the UI
   *    store so the GlobalLoader shows a spinner. Skipped when the caller
   *    sets `showGlobalLoader: false` on the request config (e.g. background
   *    sync, silent prefetch, or the refresh call itself which uses plain
   *    `axios` and bypasses this interceptor entirely).
   *
   *    We stamp `config._loaderStarted = true` so the response interceptor
   *    knows whether to call `stopLoading()` for this specific request —
   *    preventing spurious decrements for requests that never incremented.
   */
  api.interceptors.request.use(
    (config) => {
      // ── 1. Bearer token injection ────────────────────────────────────────
      const token = cookieService.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      // ── 2. Global loading counter ────────────────────────────────────────
      // Only increment if the caller has not explicitly opted out.
      // `showGlobalLoader !== false` means: undefined (default) → increment.
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

  /**
   * ## Success path
   * Decrement the loading counter if this request incremented it, then pass
   * the response through unchanged.
   *
   * ## Error path — execution order:
   *
   * ```
   * Error arrives
   *   │
   *   ├─ axios.isCancel? → stopLoading (if started) → re-reject (no redirect)
   *   │
   *   ├─ 401 and not _retry?
   *   │   ├─ stopLoading (if started)  ← done BEFORE refresh so UI unlocks
   *   │   ├─ isRefreshing = true → queue this request
   *   │   │   └─ [on flush] → retry via api() → startLoading again → balanced
   *   │   └─ isRefreshing = false → start refresh
   *   │       ├─ success → retry via api() → startLoading again → balanced
   *   │       └─ failure → logout → redirect to /login
   *   │
   *   └─ All other errors
   *       ├─ stopLoading (if started)
   *       └─ skipGlobalErrorHandler?
   *           ├─ false (default) → normalizeApiError → redirect if network/server
   *           └─ true → re-reject (component handles it)
   * ```
   *
   * ### Why `stopLoading()` is called before the refresh attempt
   *
   * A naive implementation calls `stopLoading()` only in the final
   * `return Promise.reject(error)`. This means the loader stays visible
   * during the entire refresh + retry cycle (~200–800ms on slow networks).
   * Users see a stuck spinner while nothing visible is happening.
   *
   * Instead, we decrement the counter the moment a 401 is detected — the
   * spinner disappears, the auth machinery runs silently in the background,
   * and the counter increments again when the retry fires, showing the
   * spinner again only if the user would expect to see it.
   *
   * ### Refresh retry does NOT double-count
   *
   * When `api(originalRequest)` is called after a successful refresh, the
   * request config goes through the **request** interceptor again. The
   * interceptor calls `startLoading()` and sets `_loaderStarted = true`.
   * When the retry settles, the response interceptor calls `stopLoading()`.
   * The counts are perfectly balanced — each request has exactly one start
   * and one stop, regardless of how many times it retries.
   */
  api.interceptors.response.use(
    // ── 2xx success ─────────────────────────────────────────────────────────
    (response) => {
      if (response.config._loaderStarted) {
        useUiStore.getState().stopLoading();
      }
      return response;
    },

    // ── Error ────────────────────────────────────────────────────────────────
    async (error) => {
      const originalRequest = error.config;

      // ── Cancelled requests ─────────────────────────────────────────────────
      // AbortController or CancelToken aborts are intentional. Do not show
      // an error page; just clean up the loading counter and exit.
      if (axios.isCancel(error)) {
        if (originalRequest?._loaderStarted) {
          useUiStore.getState().stopLoading();
        }
        return Promise.reject(error);
      }

      // ── 401 Unauthorized — silent token refresh ───────────────────────────
      if (error.response?.status === 401 && !originalRequest?._retry) {
        // Stop the loader NOW (before the async refresh) so the spinner
        // doesn't freeze on screen during the silent background refresh.
        if (originalRequest?._loaderStarted) {
          useUiStore.getState().stopLoading();
        }

        // Another refresh is already running — queue this request.
        // The queueing Promise stays pending until processQueue() fires.
        // When it resolves, api(originalRequest) is called which goes
        // through the request interceptor → startLoading() is called again.
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        // Mark so a second 401 on the retry doesn't re-trigger refresh.
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Fire the refresh using plain `axios` (not `api`) to bypass
          // this interceptor and avoid an infinite recursion loop.
          // `withCredentials: true` sends the HttpOnly refreshToken cookie.
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/users/refresh-token`,
            {},
            { withCredentials: true },
          );

          const newAccessToken: string = data.data.accessToken;

          // Propagate the new token to the auth store and cookie.
          useAuthStore.getState().setAccessToken(newAccessToken);
          // Unblock all queued requests — each will call api(originalRequest)
          // which goes through the request interceptor → startLoading() again.
          processQueue(null, newAccessToken);

          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          // Retry the original request. Goes through request interceptor →
          // startLoading() is called → balanced when response arrives.
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed: session is genuinely over.
          processQueue(refreshError, null);
          useAuthStore.getState().logout();
          // Hard navigation resets all in-memory state.
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // ── All other errors (or a retried 401 that failed again) ─────────────

      // Stop the loader for this request.
      if (originalRequest?._loaderStarted) {
        useUiStore.getState().stopLoading();
      }

      // Global error page redirect (skipped for validation, auth, and
      // requests that explicitly opted out with skipGlobalErrorHandler).
      if (!originalRequest?.skipGlobalErrorHandler) {
        const normalized = normalizeApiError(error);

        if (normalized.type === 'network' || normalized.type === 'server') {
          // Use window.location.assign() because interceptors run outside
          // the React tree — useNavigate() is not available here.
          // assign() adds an entry to the browser history (user can go back)
          // whereas href = '...' replaces the current entry.
          window.location.assign(`/error?type=${normalized.type}`);
          // Reject after the navigation to prevent downstream .catch handlers
          // from triggering toasts or error banners on top of the error page.
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    },
  );

  return api;
};
