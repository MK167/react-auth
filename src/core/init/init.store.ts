/**
 * @fileoverview App initialization Zustand store.
 *
 * Holds the runtime locale and error-config bundles fetched during startup by
 * `AppInitializer`. Once `isReady` is true, all consumers can safely read
 * `dynamicLocales` and `dynamicErrorConfig`.
 *
 * @module core/init/init.store
 */

import { create } from 'zustand';
import type { Locale } from '@/i18n/locales/default-en';
import type { ErrorBundle } from '@/core/errors/default-error';

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------

type InitState = {
  /**
   * True once AppInitializer has finished fetching both the locale and error
   * config bundles (or exhausted all retries with graceful fallback).
   * The AppRouter is not mounted until this is true.
   */
  isReady: boolean;

  /**
   * Locale bundles keyed by language code. Populated during init and on
   * language switches. Falls back to static TypeScript imports if null.
   */
  dynamicLocales: Partial<Record<'en' | 'ar', Locale>>;

  /**
   * Error config bundle loaded from the backend. When non-null, overrides
   * the static ERROR_CONFIG_MAP for all pushError() calls.
   */
  dynamicErrorConfig: ErrorBundle | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Called by AppInitializer once all bundles have been fetched. */
  setReady: () => void;

  /** Store a fetched locale bundle for a given language. */
  setLocaleBundle: (lang: 'en' | 'ar', bundle: Locale) => void;

  /** Store the fetched error config bundle. */
  setErrorConfig: (bundle: ErrorBundle) => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useInitStore = create<InitState>((set) => ({
  isReady: false,
  dynamicLocales: {},
  dynamicErrorConfig: null,

  setReady: () => set({ isReady: true }),

  setLocaleBundle: (lang, bundle) =>
    set((state) => ({
      dynamicLocales: { ...state.dynamicLocales, [lang]: bundle },
    })),

  setErrorConfig: (bundle) => set({ dynamicErrorConfig: bundle }),
}));

// ---------------------------------------------------------------------------
// Imperative helper (used outside React, e.g. in error.store.ts)
// ---------------------------------------------------------------------------

/**
 * Returns the active error config bundle — dynamic (from server) if loaded,
 * otherwise null so callers fall back to the static ERROR_CONFIG_MAP.
 */
export function getDynamicErrorConfig(): ErrorBundle | null {
  return useInitStore.getState().dynamicErrorConfig;
}
