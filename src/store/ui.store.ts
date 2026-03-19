/**
 * @fileoverview Global UI state store.
 *
 * ## Concerns managed here
 *
 * 1. **API loading semaphore** — tracks in-flight request count so the
 *    `GlobalLoader` spinner shows correctly even with parallel requests.
 *    Uses a counter instead of a boolean — see the counter explanation below.
 *
 * 2. **Generic modal state** — for non-error modals (confirmations, info
 *    dialogs). Error-specific modals are managed by `core/errors/error.store.ts`.
 *
 * 3. **Generic toast queue** — for non-error notifications (success messages,
 *    info banners). Error toasts are managed by `core/errors/error.store.ts`.
 *
 * ## Why a semaphore counter for loading state?
 *
 * A single boolean (`isLoading: boolean`) fails with parallel API requests:
 * any completion hides the spinner regardless of other in-flight calls.
 *
 * A counter fixes this:
 * ```
 * startLoading() → count = 1  ← call A starts (loader shows)
 * startLoading() → count = 2  ← call B starts (loader stays)
 * stopLoading()  → count = 1  ← call A done   (loader stays, B still running)
 * stopLoading()  → count = 0  ← call B done   (loader hides — ALL settled) ✅
 * ```
 *
 * The counter is clamped at 0 via `Math.max(0, count - 1)` so spurious
 * `stopLoading()` calls don't go negative and break future requests.
 *
 * ## Separation from error.store
 *
 * Error-specific state (page error, modal error, toasts) lives in
 * `core/errors/error.store.ts` to avoid bloating this store and to allow
 * the error system to be imported independently without dragging in all UI
 * state.
 *
 * @module store/ui.store
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Generic toast
// ---------------------------------------------------------------------------

/**
 * A simple non-error notification toast.
 * For error toasts use `useErrorStore().pushError(code, { displayModeOverride: 'TOAST' })`.
 */
export type GenericToast = {
  id: string;
  message: string;
  variant: 'success' | 'info' | 'warning';
  duration: number;
};

// ---------------------------------------------------------------------------
// Generic modal
// ---------------------------------------------------------------------------

/**
 * Generic modal content. For error modals use the error store.
 */
export type GenericModal = {
  title: string;
  message: string;
  /** Label for the primary confirm button */
  confirmLabel?: string;
  /** Label for the cancel/dismiss button */
  cancelLabel?: string;
  /** Callback when user confirms */
  onConfirm?: () => void;
  /** Callback when user dismisses (defaults to close) */
  onCancel?: () => void;
};

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

type UiState = {
  // ── Loading semaphore ────────────────────────────────────────────────────

  /**
   * Number of API requests currently in-flight.
   * - `0` — no pending requests; hide the global loader.
   * - `> 0` — at least one pending; show the global loader.
   */
  activeApiRequestsCount: number;

  /** Increment the request counter. Called by the Axios request interceptor. */
  startLoading: () => void;
  /** Decrement the request counter, clamped to ≥ 0. */
  stopLoading: () => void;

  // ── Generic toasts ───────────────────────────────────────────────────────

  /** Queue of non-error toast notifications. */
  toastQueue: GenericToast[];

  /**
   * Push a success/info/warning notification to the toast queue.
   * Auto-dismissed after `duration` ms (default 3000).
   */
  pushToast: (message: string, variant?: GenericToast['variant'], duration?: number) => void;

  /** Remove a toast by ID. */
  removeToast: (id: string) => void;

  // ── Generic modal ────────────────────────────────────────────────────────

  /**
   * Active generic modal. `null` when no modal is open.
   * For error modals, use `useErrorStore().pushError(code, { displayModeOverride: 'MODAL' })`.
   */
  modal: GenericModal | null;

  /** Open a generic modal. */
  openModal: (modal: GenericModal) => void;

  /** Close the current modal. */
  closeModal: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Global UI store. Subscribe in React components via `useUiStore()`, or
 * access imperatively outside React via `useUiStore.getState()`.
 *
 * The Axios interceptors use `getState()` since they run outside React.
 *
 * @example React component:
 * ```tsx
 * const isLoading = useUiStore((s) => s.activeApiRequestsCount > 0);
 * ```
 *
 * @example Axios interceptor:
 * ```ts
 * useUiStore.getState().startLoading();
 * useUiStore.getState().stopLoading();
 * ```
 *
 * @example Success toast after an action:
 * ```ts
 * useUiStore.getState().pushToast('Product saved!', 'success');
 * ```
 */
export const useUiStore = create<UiState>((set) => ({
  // ── Loading semaphore ─────────────────────────────────────────────────────

  activeApiRequestsCount: 0,

  startLoading: () =>
    set((s) => ({ activeApiRequestsCount: s.activeApiRequestsCount + 1 })),

  stopLoading: () =>
    set((s) => ({
      // Clamp: a spurious stopLoading() at 0 is a no-op, not -1
      activeApiRequestsCount: Math.max(0, s.activeApiRequestsCount - 1),
    })),

  // ── Generic toasts ─────────────────────────────────────────────────────────

  toastQueue: [],

  pushToast: (message, variant = 'info', duration = 3000) =>
    set((s) => ({
      toastQueue: [
        ...s.toastQueue.slice(-4), // cap at 5 entries
        { id: crypto.randomUUID(), message, variant, duration },
      ],
    })),

  removeToast: (id) =>
    set((s) => ({
      toastQueue: s.toastQueue.filter((t) => t.id !== id),
    })),

  // ── Generic modal ──────────────────────────────────────────────────────────

  modal: null,

  openModal: (modal) => set({ modal }),

  closeModal: () => set({ modal: null }),
}));
