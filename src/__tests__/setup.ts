/**
 * @fileoverview Global test setup — runs once before every test file.
 *
 * ## What belongs here?
 *
 * Only setup that is genuinely needed by ALL test files. Per-file setup
 * (mocking a specific module, seeding data) belongs in the test file itself
 * via `beforeEach` / `vi.mock`, not here.
 *
 * ## Why clear localStorage before each test?
 *
 * Zustand's `persist` middleware serialises store state to `localStorage`.
 * Without clearing it, a test that calls `addItem(product)` will leave
 * `cart-storage` in localStorage — and the NEXT test's store will hydrate
 * from that stale data, producing false positives or false negatives.
 *
 * `clearMocks: true` (in vitest.config.ts) handles mock reset automatically,
 * so we only need the storage wipe here.
 */

import { beforeEach } from 'vitest';

/**
 * Wipe browser storage before every test so Zustand persist middleware
 * always starts from a known empty state.
 *
 * @remarks
 * jsdom provides in-memory implementations of both storage APIs — this is
 * NOT clearing your real browser storage.
 */
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
