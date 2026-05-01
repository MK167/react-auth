/**
 * @fileoverview Unit tests for the global UI store.
 *
 * ## The semaphore counter pattern (most important concept here)
 *
 * The loading state uses a COUNTER (not a boolean). This is the pattern that
 * students most commonly ask about, so it's worth testing explicitly:
 *
 * ```
 * boolean isLoading                    counter activeApiRequestsCount
 * ────────────────────────────────     ──────────────────────────────────
 * startLoading() → isLoading = true    startLoading() → count = 1
 * startLoading() → isLoading = true    startLoading() → count = 2
 * stopLoading()  → isLoading = false ❌ stopLoading()  → count = 1  ✅ B still running!
 * stopLoading()  → (no-op?)           stopLoading()  → count = 0  ✅ all done
 * ```
 *
 * The boolean approach hides the spinner too early when requests overlap.
 * The counter approach only hides it when ALL requests have settled.
 *
 * ## Toast queue capacity
 *
 * The store caps the toast queue at 5 items via `slice(-4)` before pushing.
 * After 5 pushes, the oldest toast is dropped. Tests verify the cap without
 * relying on the crypto.randomUUID implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/store/ui.store';

// ---------------------------------------------------------------------------
// Reset helper
// ---------------------------------------------------------------------------

function resetUi() {
  useUiStore.setState({
    activeApiRequestsCount: 0,
    toastQueue: [],
    modal: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ui store', () => {
  beforeEach(resetUi);

  describe('initial state', () => {
    it('starts with activeApiRequestsCount = 0', () => {
      expect(useUiStore.getState().activeApiRequestsCount).toBe(0);
    });

    it('starts with an empty toastQueue', () => {
      expect(useUiStore.getState().toastQueue).toHaveLength(0);
    });

    it('starts with modal = null', () => {
      expect(useUiStore.getState().modal).toBeNull();
    });
  });

  /**
   * @group semaphore
   * The counter behaves like a semaphore: each startLoading increments,
   * each stopLoading decrements. Zero means no active requests.
   */
  describe('loading semaphore', () => {
    it('increments the counter on startLoading', () => {
      useUiStore.getState().startLoading();
      expect(useUiStore.getState().activeApiRequestsCount).toBe(1);
    });

    it('increments the counter independently for each call', () => {
      useUiStore.getState().startLoading();
      useUiStore.getState().startLoading();
      expect(useUiStore.getState().activeApiRequestsCount).toBe(2);
    });

    it('decrements the counter on stopLoading', () => {
      useUiStore.getState().startLoading();
      useUiStore.getState().startLoading();
      useUiStore.getState().stopLoading();
      // WHY: One of two requests completed — counter is 1, not 0.
      //      A boolean would have hidden the spinner too early here.
      expect(useUiStore.getState().activeApiRequestsCount).toBe(1);
    });

    it('reaches 0 only when all requests have stopped', () => {
      useUiStore.getState().startLoading();
      useUiStore.getState().startLoading();
      useUiStore.getState().stopLoading();
      useUiStore.getState().stopLoading();
      expect(useUiStore.getState().activeApiRequestsCount).toBe(0);
    });

    it('clamps the counter at 0 (a spurious stopLoading never goes negative)', () => {
      // WHY: Math.max(0, count - 1) prevents negative counts that would
      //      permanently show the spinner. This is a defensive guard against
      //      bugs where stopLoading() is called one extra time.
      useUiStore.getState().stopLoading(); // count was 0 → should stay 0
      expect(useUiStore.getState().activeApiRequestsCount).toBe(0);
    });
  });

  /**
   * @group toast-queue
   */
  describe('toasts', () => {
    it('adds a toast to the queue', () => {
      useUiStore.getState().pushToast('Saved successfully!', 'success');
      expect(useUiStore.getState().toastQueue).toHaveLength(1);
    });

    it('stores the message, variant, and duration on the toast', () => {
      useUiStore.getState().pushToast('Hello', 'info', 5000);
      const toast = useUiStore.getState().toastQueue[0];
      expect(toast.message).toBe('Hello');
      expect(toast.variant).toBe('info');
      expect(toast.duration).toBe(5000);
    });

    it('defaults variant to "info" and duration to 3000', () => {
      // WHY: Callers often omit optional args. Defaults must be the safe values.
      useUiStore.getState().pushToast('Default toast');
      const toast = useUiStore.getState().toastQueue[0];
      expect(toast.variant).toBe('info');
      expect(toast.duration).toBe(3000);
    });

    it('caps the queue at 5 — drops the oldest when full', () => {
      // WHY: slice(-4) before push means at most 4 existing + 1 new = 5 total.
      //      Without a cap, rapid errors would flood the screen.
      for (let i = 0; i < 7; i++) {
        useUiStore.getState().pushToast(`Toast ${i}`);
      }
      expect(useUiStore.getState().toastQueue).toHaveLength(5);
    });

    it('removes a toast by id', () => {
      useUiStore.getState().pushToast('First');
      useUiStore.getState().pushToast('Second');
      const firstId = useUiStore.getState().toastQueue[0].id;

      useUiStore.getState().removeToast(firstId);

      expect(useUiStore.getState().toastQueue).toHaveLength(1);
      expect(useUiStore.getState().toastQueue[0].message).toBe('Second');
    });

    it('is a no-op when removing a toast with an unknown id', () => {
      useUiStore.getState().pushToast('Only toast');
      useUiStore.getState().removeToast('nonexistent-id');
      expect(useUiStore.getState().toastQueue).toHaveLength(1);
    });
  });

  /**
   * @group modal
   */
  describe('modal', () => {
    it('opens a modal with the provided content', () => {
      useUiStore.getState().openModal({
        title: 'Confirm Delete',
        message: 'Are you sure?',
        confirmLabel: 'Delete',
      });
      const { modal } = useUiStore.getState();
      expect(modal).not.toBeNull();
      expect(modal?.title).toBe('Confirm Delete');
    });

    it('closes the modal by setting modal to null', () => {
      useUiStore.getState().openModal({ title: 'Test', message: 'body' });
      useUiStore.getState().closeModal();
      expect(useUiStore.getState().modal).toBeNull();
    });

    it('replaces an existing modal when openModal is called again', () => {
      // WHY: Only one generic modal can be shown at a time. The new modal
      //      is always more relevant than the old one.
      useUiStore.getState().openModal({ title: 'First', message: 'body' });
      useUiStore.getState().openModal({ title: 'Second', message: 'body' });
      expect(useUiStore.getState().modal?.title).toBe('Second');
    });
  });
});
