/**
 * @fileoverview AppInitializer — blocks the router until bundles are ready.
 *
 * ## Initialization flow
 *
 * ```
 * 1. Read stored language from localStorage (no context needed)
 * 2. Fetch locale bundle  ─┐
 *                           ├─ parallel
 * 3. Fetch error config  ──┘
 * 4. Store both in useInitStore
 * 5. setReady() → children render (AppRouter mounts)
 * ```
 *
 * ## Guarantees
 *
 * - The router does NOT mount until `isReady` is true.
 * - All page-level API calls are naturally prevented because no page component
 *   exists in the tree until the router mounts.
 * - Fetch failures fall back to static bundles — the app always starts.
 *
 * ## Language switching after init
 *
 * When the user switches languages via `I18nProvider.setLang()`, `i18n.context`
 * calls `fetchLocaleBundle(newLang)` and updates the store. This is transparent
 * to the user — no reload needed.
 *
 * @module core/init/AppInitializer
 */

import { useEffect, type ReactNode } from 'react';
import { useInitStore } from './init.store';
import { fetchInitBundles, getStoredLang } from './init.service';
import InitSkeleton from '@/components/ui/InitSkeleton';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = { children: ReactNode };

/**
 * Wraps the application with an initialization gate.
 * Shows a fullscreen skeleton while locale + error config bundles load.
 */
export function AppInitializer({ children }: Props) {
  const isReady = useInitStore((s) => s.isReady);
  const setLocaleBundle = useInitStore((s) => s.setLocaleBundle);
  const setErrorConfig = useInitStore((s) => s.setErrorConfig);
  const setReady = useInitStore((s) => s.setReady);

  useEffect(() => {
    const lang = getStoredLang();

    fetchInitBundles(lang).then(({ locale, errorConfig }) => {
      setLocaleBundle(lang, locale);
      setErrorConfig(errorConfig);
      setReady();
    });
    // Runs once on mount — no dependencies needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) return <InitSkeleton />;

  return <>{children}</>;
}
