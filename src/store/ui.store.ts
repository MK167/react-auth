/**
 * @fileoverview Global UI state store.
 *
 * ## Why a semaphore counter instead of a boolean for loading state?
 *
 * A single boolean (`isLoading: boolean`) fails catastrophically with parallel
 * API requests because any completion event hides the loader, regardless of
 * how many calls are still in flight:
 *
 * ```
 * setLoading(true)   ← call A starts  → loader shows ✅
 * setLoading(true)   ← call B starts  → loader stays ✅
 * setLoading(false)  ← call A finishes → loader HIDES ❌  (B is still running!)
 * setLoading(false)  ← call B finishes → no-op
 * ```
 *
 * The user sees the page as "ready" while data is still loading — a silent UX
 * bug that is extremely hard to notice during development where requests are
 * fast, but manifests clearly on slow networks or when backend calls are slow.
 *
 * A **semaphore counter** solves this with trivial arithmetic:
 *
 * ```
 * count = 0
 * startLoading() → count = 1  ← call A  (loader shows, count > 0)
 * startLoading() → count = 2  ← call B  (loader stays)
 * startLoading() → count = 3  ← call C  (loader stays)
 * stopLoading()  → count = 2  ← B done  (loader stays, C and A still pending)
 * stopLoading()  → count = 1  ← A done  (loader stays, C still pending)
 * stopLoading()  → count = 0  ← C done  (loader hides — ALL settled) ✅
 * ```
 *
 * The loader only hides when every pending call has settled.
 *
 * ## Counter clamp (never below zero)
 *
 * `stopLoading()` uses `Math.max(0, count - 1)` to prevent the counter from
 * going negative. Without this guard, edge cases can cause a desync:
 *
 * - A request marked `showGlobalLoader: false` skips `startLoading()` but
 *   the response interceptor still fires. If `stopLoading()` is called
 *   unconditionally, the counter goes to -1.
 * - The next real request calls `startLoading()` → count reaches 0, but the
 *   loader's `count > 0` guard evaluates `false` — loader never shows!
 *
 * The clamp makes the system self-healing. A spurious `stopLoading()` at 0
 * is a no-op rather than a permanent desync.
 *
 * ## Retry and cancel safety
 *
 * - **Retry after 401 refresh**: The original request decrements on its 401
 *   error, then the retry increments when it fires. Counter stays balanced.
 * - **AbortController cancel**: Axios fires the error interceptor for
 *   cancelled requests too, so `stopLoading()` is always called.
 * - **Queued requests** (multiple 401s while refresh is in-flight): Each
 *   request decrements when it gets its 401, then increments again when the
 *   queue flushes and retries it. Perfectly balanced.
 *
 * ## Separation of concerns
 *
 * This store is intentionally separate from `auth.store`. Auth owns session
 * data (user, token). UI owns transient display state (loader, toasts, modals).
 * Keeping them separate prevents components from subscribing to auth changes
 * just to read a loader flag, which would cause unnecessary re-renders.
 *
 * @module store/ui.store
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

/**
 * Global UI state managed by this Zustand store.
 *
 * Currently tracks only the API request counter, but can be extended with
 * toast queue, modal state, or other cross-cutting UI concerns without
 * touching component code.
 */
type UiState = {
  /**
   * Number of API requests currently in-flight.
   *
   * - `0` — no pending requests; hide the global loader.
   * - `> 0` — at least one pending request; show the global loader.
   *
   * This is a **count**, not a boolean. See the module docstring for the
   * full explanation of why a counter is necessary for parallel requests.
   */
  activeApiRequestsCount: number;

  /**
   * Increments {@link activeApiRequestsCount} by 1.
   *
   * Called by the Axios **request** interceptor the moment a request leaves
   * the browser. Safe to call concurrently — each call is an independent
   * state update.
   *
   * @example Axios request interceptor usage:
   * ```ts
   * api.interceptors.request.use((config) => {
   *   if (config.showGlobalLoader !== false) {
   *     useUiStore.getState().startLoading();
   *     config._loaderStarted = true;
   *   }
   *   return config;
   * });
   * ```
   */
  startLoading: () => void;

  /**
   * Decrements {@link activeApiRequestsCount} by 1, clamped to ≥ 0.
   *
   * Called by the Axios **response** interceptor on every request settlement
   * (success, error, cancel, or retry). The clamp prevents the counter from
   * going negative in edge cases — see the module docstring for details.
   *
   * @example Axios response interceptor usage:
   * ```ts
   * api.interceptors.response.use(
   *   (response) => {
   *     if (response.config._loaderStarted) useUiStore.getState().stopLoading();
   *     return response;
   *   },
   *   (error) => {
   *     if (error.config?._loaderStarted) useUiStore.getState().stopLoading();
   *     return Promise.reject(error);
   *   },
   * );
   * ```
   */
  stopLoading: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Global UI store — subscribe in React components via `useUiStore()`, or
 * access imperatively outside React via `useUiStore.getState()`.
 *
 * The Axios interceptors in `src/api/axios.ts` use `getState()` since they
 * run outside the React lifecycle.
 *
 * @example React component:
 * ```tsx
 * const isLoading = useUiStore((s) => s.activeApiRequestsCount > 0);
 * ```
 *
 * @example Axios interceptor (outside React):
 * ```ts
 * useUiStore.getState().startLoading();
 * useUiStore.getState().stopLoading();
 * ```
 */
export const useUiStore = create<UiState>((set) => ({
  activeApiRequestsCount: 0,

  startLoading: () =>
    set((s) => ({ activeApiRequestsCount: s.activeApiRequestsCount + 1 })),

  stopLoading: () =>
    set((s) => ({
      // Math.max clamp: a spurious stopLoading() at 0 is a no-op, not -1
      activeApiRequestsCount: Math.max(0, s.activeApiRequestsCount - 1),
    })),
}));
