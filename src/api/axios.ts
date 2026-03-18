import { useAuthStore } from "@/store/auth.store";
import { cookieService } from "@/utils/cookie.service";
import axios from "axios";

/**
 * The main Axios instance used for all API requests in the application.
 *
 * **Configuration:**
 * - `baseURL` — read from `VITE_API_URL` env variable so the base path never has to be repeated in individual API calls.
 * - `Content-Type: application/json` — tells the server we are always sending JSON bodies (overridable per-request when needed).
 * - `withCredentials: true` — instructs the browser to include **cookies** in every cross-origin request. This is essential for the silent refresh flow:
 *   the server stores the refresh token in an `HttpOnly` cookie, and this flag
 *   makes the browser attach it automatically so we never have to read or manage the refresh token in JavaScript.
 */

/**
 * **Important:** Do NOT import this `api` instance inside the `auth.store` module
 * or you will create a circular dependency (because the refresh logic in this
 * file calls `useAuthStore.getState().setAccessToken(...)`).
 * If you need to make API calls from the auth store, import and use the plain
 * `axios` instance instead.
 */

/**
 * Creates a new Axios instance with the specified `baseURL`.
 *
 * @param baseURL - The base URL for all API requests made with this instance.
 * @returns A configured Axios instance. 
 * **Note:** This function allows for multiple instances with different base URLs if needed, but in most cases you can just create one instance with the main API URL and reuse it across the app.
 */

export const createApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL: baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    // withCredentials: true, --- IGNORE --- 
  });

  /**
   * Tracks whether a token-refresh request is currently in-flight.
   *
   * **Why this flag exists:**
   * If multiple API requests fail with `401` at the same time (e.g. the access
   * token expired while three parallel requests were pending), we must NOT fire
   * three separate refresh calls — that would be redundant and could invalidate
   * the refresh token on the first successful call, causing the other two to
   * fail.
   *
   * The flag is set to `true` the moment a refresh starts and back to `false`
   * in the `finally` block once it finishes (success or failure).
   */
  let isRefreshing = false;

  /**
   * A queue that holds the `resolve` / `reject` callbacks of every request that
   * received a `401` while a refresh was already in-flight.
   *
   * **How the queue works:**
   * 1. Request A fails with 401 → starts the refresh, sets `isRefreshing = true`.
   * 2. Request B and C also fail with 401 before the refresh completes.
   *    Because `isRefreshing` is already `true`, B and C are NOT retried
   *    immediately. Instead their callbacks are pushed into this array and they
   *    wait (their promises stay pending).
   * 3. Once the refresh succeeds, `processQueue(null, newToken)` iterates the
   *    array and calls `resolve(newToken)` for every entry — each waiting
   *    request then retries with the fresh token.
   * 4. If the refresh fails, `processQueue(error)` calls `reject(error)` for
   *    every entry — all waiting requests are rejected together.
   */
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (reason: unknown) => void;
  }> = [];

  /**
   * Drains the {@link failedQueue} after a refresh attempt has completed.
   *
   * @param error - The error from the refresh call, or `null` if it succeeded.
   * @param token - The new access token when the refresh succeeded, or `null`
   *                when it failed. The non-null assertion (`token!`) is safe
   *                here because `resolve` is only called when `error` is `null`,
   *                meaning a valid token was returned.
   *
   * **Side-effect:** Clears the queue after processing so stale callbacks do
   * not accumulate across multiple refresh cycles.
   */
  const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    failedQueue = [];
  };

  /**
   * **Request interceptor** — attaches the Bearer access token to every outgoing
   * request before it leaves the browser.
   *
   * **Flow:**
   * 1. Read the access token from the cookie via `cookieService.getToken()`.
   * 2. If a token exists, inject it as `Authorization: Bearer <token>`.
   * 3. If no token exists (user is not logged in), the request goes out without
   *    the header — the server will respond with `401` if the endpoint requires
   *    authentication.
   *
   * The second callback forwards request-configuration errors unchanged; these
   * are rare (malformed config) and there is nothing meaningful to do with them
   * at this layer.
   */
  api.interceptors.request.use(
    (config) => {
      const token = cookieService.getToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  /**
   * **Response interceptor** — implements the **silent token refresh** strategy.
   *
   * The happy path (2xx responses) passes straight through. All logic below
   * applies only to error responses.
   *
   * ---
   * ### Silent refresh algorithm
   *
   * **Step 1 — Detect an expired access token**
   * A `401 Unauthorized` response means the access token is missing or expired.
   * The flag `_retry` is a custom property we stamp onto the original request
   * config to prevent an infinite retry loop: if the retried request *also*
   * returns 401 (e.g. the new token is already invalid), we stop and reject
   * instead of refreshing again forever.
   *
   * **Step 2 — Handle concurrent 401s (queue)**
   * If `isRefreshing` is already `true`, another request beat us to starting the
   * refresh. Rather than firing a second refresh call, we return a new Promise
   * whose callbacks are pushed onto {@link failedQueue}. The request will stay
   * pending until {@link processQueue} resolves or rejects it once the in-flight
   * refresh completes.
   *
   * **Step 3 — Perform the refresh**
   * We call `POST /users/refresh-token` directly with plain `axios` (not `api`)
   * to avoid triggering this very interceptor again on the refresh call itself.
   * `withCredentials: true` ensures the browser sends the HttpOnly `refreshToken`
   * cookie that was set by the server at login time — we never touch that cookie
   * in JS.
   *
   * **Step 4 — Apply the new token**
   * - `cookieService` stores the new access token in a browser cookie.
   * - `useAuthStore.getState().setAccessToken(...)` updates the Zustand store
   *   **outside of React** (Zustand allows this via `getState()`). The user
   *   object in the store is left untouched — only the token changes.
   * - {@link processQueue} is called to unblock any requests that were waiting.
   * - The original request is cloned with the new `Authorization` header and
   *   retried via `api(originalRequest)`.
   *
   * **Step 5 — Handle refresh failure**
   * If the refresh endpoint returns an error (e.g. the refresh token has also
   * expired or been revoked), the user's session is genuinely over:
   * - {@link processQueue} rejects all waiting requests.
   * - `useAuthStore.getState().logout()` clears the store and removes the access
   *   token cookie.
   * - The user is redirected to `/login` with a hard navigation so all in-memory
   *   state is reset.
   *
   * **`finally` block**
   * `isRefreshing` is always reset to `false` regardless of success or failure
   * so the next expiry cycle can start a fresh refresh.
   *
   * @param response - Passed through unchanged for successful responses.
   * @param error    - The Axios error containing `error.config` (original request)
   *                   and `error.response.status`.
   */
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        // Step 2 — another refresh is already running: queue this request
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        // Step 1 — mark so the retried request won't trigger another refresh
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Step 3 — call the refresh endpoint (plain axios, not `api`)
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/users/refresh-token`,
            {},
            { withCredentials: true },
          );

          const newAccessToken: string = data.data.accessToken;

          // Step 4 — silently propagate the new token
          useAuthStore.getState().setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);

          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Step 5 — refresh failed, end the session
          processQueue(refreshError, null);
          useAuthStore.getState().logout();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          // Always unlock for the next refresh cycle
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return api;
};
