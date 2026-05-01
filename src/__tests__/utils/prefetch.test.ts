/**
 * @fileoverview Unit tests for the route prefetch utilities.
 *
 * ## What we test and why
 *
 * The prefetch functions do one thing: call `void import('@/pages/...')`.
 * Dynamic `import()` is special syntax — it cannot be directly spied on or
 * intercepted. What we CAN test is the branching logic around it:
 *
 * 1. **saveData guard** — When `navigator.connection.saveData === true`,
 *    the function returns early WITHOUT triggering the import. We test this
 *    by verifying the function does not throw and has no observable error.
 *
 * 2. **Non-throwing contract** — Each function must never throw regardless of
 *    whether the page chunk exists. The `void` keyword suppresses the Promise
 *    rejection — these are fire-and-forget calls.
 *
 * ## Why we mock the page modules
 *
 * Dynamic imports in Vitest try to actually resolve the module. Without mocks,
 * `import('@/pages/user/ProductDetailPage')` would load React, Tailwind, and
 * all of the page's dependencies — making this test 10× slower. Mocking with
 * a stub component keeps the test instantaneous.
 *
 * ## Testing navigator.connection
 *
 * `navigator.connection` is part of the Network Information API, which is NOT
 * defined in the jsdom environment. We use `vi.stubGlobal` + `Object.defineProperty`
 * to inject a mock connection object for tests.
 *
 * `vi.stubGlobal(name, value)` — sets `globalThis[name] = value` and registers
 * a cleanup so `restoreMocks: true` (vitest.config.ts) resets it automatically.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// WHY: Mock ALL page modules so dynamic imports resolve instantly.
// Vitest hoists these mocks before the prefetch module loads.
vi.mock('@/pages/user/ProductDetailPage', () => ({ default: vi.fn() }));
vi.mock('@/pages/user/CheckoutPage',       () => ({ default: vi.fn() }));
vi.mock('@/pages/admin/ProductsListPage',  () => ({ default: vi.fn() }));
vi.mock('@/pages/user/OrdersPage',         () => ({ default: vi.fn() }));

import {
  prefetchProductDetail,
  prefetchCheckout,
  prefetchAdminDashboard,
  prefetchOrders,
} from '@/utils/prefetch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulates the Network Information API's saveData flag.
 *
 * @param value - true = user has data-saver on; false = normal connection.
 *
 * @remarks
 * We define navigator.connection using Object.defineProperty because
 * navigator is read-only in jsdom and cannot be assigned directly.
 */
function stubSaveData(value: boolean): void {
  Object.defineProperty(navigator, 'connection', {
    value: { saveData: value },
    configurable: true, // configurable: true allows us to redefine it in other tests
    writable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('prefetch utilities', () => {
  beforeEach(() => {
    // Reset navigator.connection so each test starts without saveData.
    Object.defineProperty(navigator, 'connection', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  /**
   * @group non-throwing-contract
   * Each function uses `void import(...)` which swallows Promise rejections.
   * The tests below confirm no synchronous exception is thrown.
   */
  describe('prefetchProductDetail', () => {
    it('does not throw when saveData is false', () => {
      // WHY: The most common case — prefetch should run silently without errors.
      stubSaveData(false);
      expect(() => prefetchProductDetail()).not.toThrow();
    });

    it('does not throw when saveData is true (guard exits early)', () => {
      // WHY: When data-saver is on, the function returns without calling import().
      //      We verify no exception is thrown as a proxy for "exited early".
      stubSaveData(true);
      expect(() => prefetchProductDetail()).not.toThrow();
    });

    it('does not throw when navigator.connection is undefined (unsupported browser)', () => {
      // WHY: Safari and Firefox don't support the Network Information API.
      //      `(navigator as any)?.connection?.saveData` uses optional chaining
      //      to safely return undefined without throwing.
      expect(() => prefetchProductDetail()).not.toThrow();
    });
  });

  describe('prefetchCheckout', () => {
    it('does not throw when saveData is false', () => {
      stubSaveData(false);
      expect(() => prefetchCheckout()).not.toThrow();
    });

    it('does not throw when saveData is true', () => {
      stubSaveData(true);
      expect(() => prefetchCheckout()).not.toThrow();
    });
  });

  describe('prefetchAdminDashboard', () => {
    it('does not throw when saveData is false', () => {
      stubSaveData(false);
      expect(() => prefetchAdminDashboard()).not.toThrow();
    });

    it('does not throw when saveData is true', () => {
      stubSaveData(true);
      expect(() => prefetchAdminDashboard()).not.toThrow();
    });
  });

  describe('prefetchOrders', () => {
    it('does not throw when saveData is false', () => {
      stubSaveData(false);
      expect(() => prefetchOrders()).not.toThrow();
    });

    it('does not throw when saveData is true', () => {
      stubSaveData(true);
      expect(() => prefetchOrders()).not.toThrow();
    });
  });

  describe('all functions return undefined', () => {
    it('prefetchProductDetail returns undefined', () => {
      // WHY: All functions use `void import()` which evaluates to undefined.
      //      A function returning something unexpected would indicate a refactor
      //      accidentally changed the return type.
      expect(prefetchProductDetail()).toBeUndefined();
    });

    it('prefetchCheckout returns undefined', () => {
      expect(prefetchCheckout()).toBeUndefined();
    });

    it('prefetchAdminDashboard returns undefined', () => {
      expect(prefetchAdminDashboard()).toBeUndefined();
    });

    it('prefetchOrders returns undefined', () => {
      expect(prefetchOrders()).toBeUndefined();
    });
  });
});
