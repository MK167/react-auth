/**
 * @fileoverview Unit tests for the app initialization store.
 *
 * ## What the init store controls
 *
 * The init store is a gate: `AppInitializer` sets `isReady = true` once all
 * startup tasks complete. Until then, the router is not mounted.
 *
 * It also holds two optional bundles fetched from the backend at startup:
 * - `dynamicLocales` — server-side locale strings that override static files
 * - `dynamicErrorConfig` — server-side error config that overrides the static map
 *
 * ## getDynamicErrorConfig — the imperative helper
 *
 * `error.store.ts` calls `getDynamicErrorConfig()` outside React (in a Zustand
 * action). Because it runs outside React, it cannot use `useInitStore()` hook.
 * Instead it calls `useInitStore.getState().dynamicErrorConfig` directly.
 *
 * The exported `getDynamicErrorConfig()` helper wraps this pattern. Tests
 * verify that it reflects the current store state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInitStore, getDynamicErrorConfig } from '@/core/init/init.store';

// ---------------------------------------------------------------------------
// Reset helper
// ---------------------------------------------------------------------------

function resetInitStore() {
  useInitStore.setState({
    isReady: false,
    dynamicLocales: {},
    dynamicErrorConfig: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('init store', () => {
  beforeEach(resetInitStore);

  describe('initial state', () => {
    it('starts with isReady = false', () => {
      // WHY: The router MUST NOT render until initialization is complete.
      //      Starting with false ensures the skeleton shows first.
      expect(useInitStore.getState().isReady).toBe(false);
    });

    it('starts with empty dynamicLocales', () => {
      expect(useInitStore.getState().dynamicLocales).toEqual({});
    });

    it('starts with dynamicErrorConfig = null', () => {
      expect(useInitStore.getState().dynamicErrorConfig).toBeNull();
    });
  });

  describe('setReady', () => {
    it('sets isReady to true', () => {
      // WHY: Once AppInitializer calls setReady(), the router mounts.
      //      If this doesn't work, the app stays on the skeleton screen forever.
      useInitStore.getState().setReady();
      expect(useInitStore.getState().isReady).toBe(true);
    });

    it('is idempotent — calling setReady twice keeps isReady = true', () => {
      useInitStore.getState().setReady();
      useInitStore.getState().setReady();
      expect(useInitStore.getState().isReady).toBe(true);
    });
  });

  describe('setLocaleBundle', () => {
    it('stores a locale bundle for the given language code', () => {
      // WHY: After fetching EN strings from the server, they must be
      //      accessible under the 'en' key for the i18n context to use them.
      const bundle = { greeting: 'Hello' } as never;
      useInitStore.getState().setLocaleBundle('en', bundle);

      expect(useInitStore.getState().dynamicLocales.en).toBe(bundle);
    });

    it('merges bundles for different languages without overwriting each other', () => {
      // WHY: Setting 'ar' after 'en' must NOT remove the 'en' bundle.
      const enBundle = { greeting: 'Hello' } as never;
      const arBundle = { greeting: 'مرحبا' } as never;

      useInitStore.getState().setLocaleBundle('en', enBundle);
      useInitStore.getState().setLocaleBundle('ar', arBundle);

      expect(useInitStore.getState().dynamicLocales.en).toBe(enBundle);
      expect(useInitStore.getState().dynamicLocales.ar).toBe(arBundle);
    });

    it('overwrites an existing bundle for the same language', () => {
      // WHY: If a re-fetch returns a newer locale bundle, it must replace the old one.
      const oldBundle = { greeting: 'Hi' } as never;
      const newBundle = { greeting: 'Hello' } as never;

      useInitStore.getState().setLocaleBundle('en', oldBundle);
      useInitStore.getState().setLocaleBundle('en', newBundle);

      expect(useInitStore.getState().dynamicLocales.en).toBe(newBundle);
    });
  });

  describe('setErrorConfig', () => {
    it('stores the error config bundle', () => {
      const bundle = { SERVER_ERROR: { displayMode: 'PAGE' } } as never;
      useInitStore.getState().setErrorConfig(bundle);

      expect(useInitStore.getState().dynamicErrorConfig).toBe(bundle);
    });

    it('replaces an existing bundle', () => {
      const first  = { SERVER_ERROR: {} } as never;
      const second = { NETWORK_ERROR: {} } as never;

      useInitStore.getState().setErrorConfig(first);
      useInitStore.getState().setErrorConfig(second);

      expect(useInitStore.getState().dynamicErrorConfig).toBe(second);
    });
  });

  describe('getDynamicErrorConfig (imperative helper)', () => {
    it('returns null when no dynamic config has been loaded', () => {
      // WHY: error.store.ts falls back to the static ERROR_CONFIG_MAP when
      //      getDynamicErrorConfig() returns null. This test ensures the
      //      fallback path is taken correctly on a fresh start.
      expect(getDynamicErrorConfig()).toBeNull();
    });

    it('returns the loaded config bundle after setErrorConfig', () => {
      const bundle = { SERVER_ERROR: {} } as never;
      useInitStore.getState().setErrorConfig(bundle);

      // WHY: getDynamicErrorConfig() reads directly from the store state.
      //      It must reflect the latest setErrorConfig call immediately.
      expect(getDynamicErrorConfig()).toBe(bundle);
    });

    it('reflects the store reset (returns null after reset)', () => {
      const bundle = { SERVER_ERROR: {} } as never;
      useInitStore.getState().setErrorConfig(bundle);
      resetInitStore();

      expect(getDynamicErrorConfig()).toBeNull();
    });
  });
});
