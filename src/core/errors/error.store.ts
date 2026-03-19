/**
 * @fileoverview Zustand error store — the runtime hub for all application errors.
 *
 * ## Routing rules
 *
 * `pushError()` resolves the effective display mode then routes the error to
 * exactly one slot:
 *
 * | Display mode | Store slot      | Rendered by              |
 * |--------------|-----------------|--------------------------|
 * | PAGE         | `pageError`     | GlobalErrorRenderer      |
 * | MODAL        | `modalError`    | GlobalErrorRenderer      |
 * | TOAST        | `toastQueue[]`  | GlobalErrorRenderer      |
 * | INLINE       | `inlineError`   | Subscribing component    |
 *
 * ## INLINE errors
 *
 * INLINE errors are NOT handled by `GlobalErrorRenderer`. The component that
 * triggered the error must subscribe to `inlineError` and render its own
 * error UI (e.g. a red alert banner inside a form section).
 *
 * ```tsx
 * const inlineError = useErrorStore((s) => s.inlineError);
 * if (inlineError) return <AlertBanner message={inlineError.config.titleKey} />;
 * ```
 *
 * ## Why separate slots instead of a single queue?
 *
 * Toasts can co-exist (queue). Only one page-level or modal-level error should
 * be active at a time — new PAGE/MODAL errors replace the existing one rather
 * than stacking (the new error is always more relevant).
 *
 * @module core/errors/error.store
 */

import { create } from 'zustand';
import { ERROR_CONFIG_MAP } from './error.config';
import { getDynamicErrorConfig } from '@/core/init/init.store';
import type {
  ActiveError,
  ErrorCode,
  ErrorDisplayMode,
  PushErrorOptions,
} from './error.types';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

type ErrorStoreState = {
  /**
   * Active PAGE-level error. Rendered as a fullscreen overlay by
   * `GlobalErrorRenderer`. New PAGE errors replace the previous one.
   */
  pageError: ActiveError | null;

  /**
   * Active MODAL error. Rendered as a dialog overlay. New MODAL errors
   * replace the previous one.
   */
  modalError: ActiveError | null;

  /**
   * Queue of TOAST errors. Multiple toasts can coexist; each is shown in
   * order and auto-dismissed after its `duration` ms.
   */
  toastQueue: ActiveError[];

  /**
   * Active INLINE error. Consumed by individual components. New INLINE
   * errors replace the previous one.
   */
  inlineError: ActiveError | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * The primary action — create and route an error to the correct display slot.
   *
   * @param code    - Which error to show (looked up in ERROR_CONFIG_MAP).
   * @param options - Optional overrides for display mode, dismissibility, retry.
   */
  pushError: (code: ErrorCode, options?: PushErrorOptions) => void;

  /** Clear the current page-level error overlay. */
  clearPageError: () => void;

  /** Clear the current modal error. */
  clearModalError: () => void;

  /** Remove one toast from the queue by its unique ID. */
  removeToast: (id: string) => void;

  /** Clear the inline error. */
  clearInlineError: () => void;

  /** Clear all active errors across all slots. */
  clearAll: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const DEFAULT_TOAST_DURATION = 4000;

/**
 * Global error store. Access imperatively (outside React) via
 * `useErrorStore.getState().pushError(...)`.
 *
 * @example React component:
 * ```tsx
 * const pageError = useErrorStore((s) => s.pageError);
 * ```
 *
 * @example Axios interceptor (outside React):
 * ```ts
 * useErrorStore.getState().pushError('SERVER_ERROR', {
 *   onRetry: () => window.location.reload(),
 * });
 * ```
 */
export const useErrorStore = create<ErrorStoreState>((set) => ({
  pageError: null,
  modalError: null,
  toastQueue: [],
  inlineError: null,

  pushError: (code, options = {}) => {
    // Prefer dynamically loaded config (from backend/CMS) over static map
    const dynamicMap = getDynamicErrorConfig();
    const config = (dynamicMap?.[code as keyof typeof dynamicMap] ?? ERROR_CONFIG_MAP[code]) as typeof ERROR_CONFIG_MAP[typeof code];

    // Fall through to UNKNOWN_ERROR config if the code is somehow missing.
    const resolvedConfig = config ?? ERROR_CONFIG_MAP['UNKNOWN_ERROR'];

    // Determine effective display mode (override > config default).
    const displayMode: ErrorDisplayMode =
      options.displayModeOverride ?? resolvedConfig.displayMode;

    const activeError: ActiveError = {
      id: crypto.randomUUID(),
      code,
      config: resolvedConfig,
      displayMode,
      dismissible:
        options.dismissible ??
        (displayMode === 'TOAST' || displayMode === 'MODAL'),
      onRetry: options.onRetry,
      timestamp: Date.now(),
      duration:
        displayMode === 'TOAST'
          ? (options.duration ?? DEFAULT_TOAST_DURATION)
          : 0,
    };

    set((state) => {
      switch (displayMode) {
        case 'PAGE':
          return { pageError: activeError };
        case 'MODAL':
          return { modalError: activeError };
        case 'TOAST':
          // Cap queue at 5 to prevent overflow; drop oldest if full.
          return {
            toastQueue: [
              ...state.toastQueue.slice(-4),
              activeError,
            ],
          };
        case 'INLINE':
          return { inlineError: activeError };
        default:
          return {};
      }
    });
  },

  clearPageError: () => set({ pageError: null }),

  clearModalError: () => set({ modalError: null }),

  removeToast: (id) =>
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    })),

  clearInlineError: () => set({ inlineError: null }),

  clearAll: () =>
    set({
      pageError: null,
      modalError: null,
      toastQueue: [],
      inlineError: null,
    }),
}));
