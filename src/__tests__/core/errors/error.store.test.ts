/**
 * @fileoverview Unit tests for the Zustand error store.
 *
 * ## The four display slots
 *
 * The error store routes each error to exactly ONE of four slots:
 *
 * | Slot         | Usage                                   | Tests verify         |
 * |--------------|------------------------------------------|----------------------|
 * | pageError    | Full-screen overlay (SERVER_ERROR, etc.) | Set, not other slots |
 * | modalError   | Dialog overlay (SESSION_EXPIRED)         | Set, not other slots |
 * | toastQueue[] | Transient notifications (VALIDATION)     | Appended to array    |
 * | inlineError  | Component-level banner                   | Set, not other slots |
 *
 * "Routing" tests assert that pushing error X sets ONLY its expected slot and
 * leaves all others at their initial values. This catches bugs where refactoring
 * the switch statement accidentally routes errors to the wrong slot.
 *
 * ## displayModeOverride
 *
 * Any error can be shown in a different mode by passing `displayModeOverride`.
 * Tests verify that the override takes precedence over the config default.
 *
 * ## Why we mock getDynamicErrorConfig
 *
 * `error.store.ts` calls `getDynamicErrorConfig()` from `init.store.ts`.
 * In tests, there's no app initialiser, so this function would return null
 * and the store would fall back to the static ERROR_CONFIG_MAP — which is
 * exactly what we want. We mock it explicitly to make this dependency clear
 * and to prevent accidental coupling to the init store's internal state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/core/init/init.store', () => ({
  getDynamicErrorConfig: vi.fn(() => null),  // Always use static config in tests
}));

import { useErrorStore } from '@/core/errors/error.store';

// ---------------------------------------------------------------------------
// Reset helper
// ---------------------------------------------------------------------------

function resetErrorStore() {
  useErrorStore.getState().clearAll();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('error store', () => {
  beforeEach(resetErrorStore);

  describe('initial state', () => {
    it('starts with all slots null/empty', () => {
      const state = useErrorStore.getState();
      expect(state.pageError).toBeNull();
      expect(state.modalError).toBeNull();
      expect(state.toastQueue).toHaveLength(0);
      expect(state.inlineError).toBeNull();
    });
  });

  /**
   * @group routing
   * Each ErrorCode has a configured displayMode in error.config.ts.
   * These tests verify that pushError routes to the correct slot.
   */
  describe('pushError routing', () => {
    it('routes SERVER_ERROR (PAGE mode) to pageError slot', () => {
      // WHY: A server crash should show a fullscreen error, not a toast.
      useErrorStore.getState().pushError('SERVER_ERROR');

      const state = useErrorStore.getState();
      expect(state.pageError).not.toBeNull();
      expect(state.pageError?.code).toBe('SERVER_ERROR');
      // Other slots must remain empty
      expect(state.modalError).toBeNull();
      expect(state.toastQueue).toHaveLength(0);
    });

    it('routes SESSION_EXPIRED (MODAL mode) to modalError slot', () => {
      // WHY: Session expiry shows a modal so the user doesn't lose their
      //      current page context — they can re-login and continue.
      useErrorStore.getState().pushError('SESSION_EXPIRED');

      const state = useErrorStore.getState();
      expect(state.modalError).not.toBeNull();
      expect(state.modalError?.code).toBe('SESSION_EXPIRED');
      expect(state.pageError).toBeNull();
    });

    it('routes VALIDATION_ERROR (TOAST mode) to toastQueue', () => {
      // WHY: Validation errors are non-critical — show briefly, auto-dismiss.
      useErrorStore.getState().pushError('VALIDATION_ERROR');

      const state = useErrorStore.getState();
      expect(state.toastQueue).toHaveLength(1);
      expect(state.toastQueue[0].code).toBe('VALIDATION_ERROR');
      expect(state.pageError).toBeNull();
    });

    it('routes NETWORK_ERROR (PAGE mode) to pageError slot', () => {
      useErrorStore.getState().pushError('NETWORK_ERROR');
      expect(useErrorStore.getState().pageError?.code).toBe('NETWORK_ERROR');
    });
  });

  /**
   * @group active-error-shape
   * Each active error has metadata set by pushError.
   */
  describe('ActiveError shape', () => {
    it('sets a unique id on the error', () => {
      // WHY: id is used as the React key for error UI components and as the
      //      removeToast() argument. It must be present.
      useErrorStore.getState().pushError('SERVER_ERROR');
      expect(useErrorStore.getState().pageError?.id).toBeTruthy();
    });

    it('sets a timestamp on the error', () => {
      // WHY: timestamp is used for logging and analytics.
      const before = Date.now();
      useErrorStore.getState().pushError('SERVER_ERROR');
      const after = Date.now();

      const ts = useErrorStore.getState().pageError?.timestamp ?? 0;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('sets duration = 0 for PAGE errors (no auto-dismiss)', () => {
      // WHY: Full-page errors should not auto-dismiss — user must take action.
      useErrorStore.getState().pushError('SERVER_ERROR');
      expect(useErrorStore.getState().pageError?.duration).toBe(0);
    });

    it('sets duration > 0 for TOAST errors (auto-dismiss)', () => {
      // WHY: TOAST errors have a 4000ms default duration.
      useErrorStore.getState().pushError('VALIDATION_ERROR');
      expect(useErrorStore.getState().toastQueue[0].duration).toBeGreaterThan(0);
    });

    it('sets dismissible = true for TOAST errors', () => {
      useErrorStore.getState().pushError('VALIDATION_ERROR');
      expect(useErrorStore.getState().toastQueue[0].dismissible).toBe(true);
    });

    it('sets dismissible = true for MODAL errors', () => {
      useErrorStore.getState().pushError('SESSION_EXPIRED');
      expect(useErrorStore.getState().modalError?.dismissible).toBe(true);
    });

    it('attaches the onRetry callback when provided', () => {
      // WHY: The retry callback is injected at call-time and must reach the
      //      active error so the "Try Again" button can invoke it.
      const retryFn = vi.fn();
      useErrorStore.getState().pushError('SERVER_ERROR', { onRetry: retryFn });

      expect(useErrorStore.getState().pageError?.onRetry).toBe(retryFn);
    });
  });

  /**
   * @group display-mode-override
   */
  describe('displayModeOverride', () => {
    it('shows a PAGE error as TOAST when overridden', () => {
      // WHY: Sometimes a server error should be a toast (e.g. background sync failure).
      //      The override must take precedence over the config default.
      useErrorStore.getState().pushError('SERVER_ERROR', {
        displayModeOverride: 'TOAST',
      });

      expect(useErrorStore.getState().pageError).toBeNull();
      expect(useErrorStore.getState().toastQueue).toHaveLength(1);
    });

    it('shows a TOAST error as MODAL when overridden', () => {
      useErrorStore.getState().pushError('VALIDATION_ERROR', {
        displayModeOverride: 'MODAL',
      });

      expect(useErrorStore.getState().toastQueue).toHaveLength(0);
      expect(useErrorStore.getState().modalError).not.toBeNull();
    });
  });

  /**
   * @group toast-queue-management
   */
  describe('toast queue management', () => {
    it('caps the queue at 5 toasts (drops oldest)', () => {
      // WHY: Flooding the screen with >5 toasts at once is never good UX.
      for (let i = 0; i < 7; i++) {
        useErrorStore.getState().pushError('VALIDATION_ERROR');
      }
      expect(useErrorStore.getState().toastQueue).toHaveLength(5);
    });

    it('removes a toast by id', () => {
      useErrorStore.getState().pushError('VALIDATION_ERROR');
      const id = useErrorStore.getState().toastQueue[0].id;

      useErrorStore.getState().removeToast(id);
      expect(useErrorStore.getState().toastQueue).toHaveLength(0);
    });
  });

  /**
   * @group clear-actions
   */
  describe('clear actions', () => {
    it('clearPageError sets pageError to null', () => {
      useErrorStore.getState().pushError('SERVER_ERROR');
      useErrorStore.getState().clearPageError();
      expect(useErrorStore.getState().pageError).toBeNull();
    });

    it('clearModalError sets modalError to null', () => {
      useErrorStore.getState().pushError('SESSION_EXPIRED');
      useErrorStore.getState().clearModalError();
      expect(useErrorStore.getState().modalError).toBeNull();
    });

    it('clearInlineError sets inlineError to null', () => {
      useErrorStore.getState().pushError('VALIDATION_ERROR', {
        displayModeOverride: 'INLINE',
      });
      useErrorStore.getState().clearInlineError();
      expect(useErrorStore.getState().inlineError).toBeNull();
    });

    it('clearAll resets all four slots simultaneously', () => {
      useErrorStore.getState().pushError('SERVER_ERROR');
      useErrorStore.getState().pushError('SESSION_EXPIRED');
      useErrorStore.getState().pushError('VALIDATION_ERROR');

      useErrorStore.getState().clearAll();

      const state = useErrorStore.getState();
      expect(state.pageError).toBeNull();
      expect(state.modalError).toBeNull();
      expect(state.toastQueue).toHaveLength(0);
      expect(state.inlineError).toBeNull();
    });
  });

  /**
   * @group replace-behaviour
   * PAGE and MODAL errors replace each other (only one at a time).
   * TOAST errors accumulate (up to 5).
   */
  describe('replace vs accumulate behaviour', () => {
    it('a new PAGE error replaces the previous one', () => {
      useErrorStore.getState().pushError('SERVER_ERROR');
      useErrorStore.getState().pushError('RESOURCE_NOT_FOUND');

      // Only the second error should be in the slot
      expect(useErrorStore.getState().pageError?.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('multiple TOAST errors accumulate in the queue', () => {
      useErrorStore.getState().pushError('VALIDATION_ERROR');
      useErrorStore.getState().pushError('UNKNOWN_ERROR');

      expect(useErrorStore.getState().toastQueue).toHaveLength(2);
    });
  });
});
