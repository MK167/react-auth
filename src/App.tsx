/**
 * @fileoverview Root application component.
 *
 * `App` is the minimal composition root. It wraps the entire component tree
 * with providers that must be available to all children:
 *
 * 1. **`I18nProvider`** — makes `useI18n()` available everywhere. Reads
 *    stored language from `localStorage` and applies `dir`/`lang` to `<html>`
 *    immediately, preventing RTL layout flash for Arabic users.
 *
 * 2. **`ThemeProvider`** — makes `useTheme()` available everywhere. Reads
 *    stored theme preference and applies the `dark` class to `<html>` on
 *    mount, preventing FOUC for returning dark-mode users.
 *
 * 3. **`ErrorBoundary`** — top-level safety net. Catches render-time JS
 *    errors that escape layout-level boundaries (e.g. errors in providers themselves). Shows a minimal crash fallback UI.
 *    example: When the app starts, it initializes global providers like authentication, theming, or data fetching.
 *    If one of these fails during rendering (for example, corrupted user data causes the auth provider to crash, or a misconfigured theme throws an error), the entire app would normally break and show a blank screen.
 *    Instead, the top-level ErrorBoundary catches this failure and displays a simple fallback message like:
 *    Something went wrong. Please refresh the page.
 *
 * 4. **`GlobalLoader`** — fullscreen spinner overlay driven by the Zustand
 *    `useUiStore.activeApiRequestsCount` semaphore. Mounted above the router
 *    so it renders above all page content via `z-[9999]`. Shows automatically
 *    for any Axios request that does not opt out with `showGlobalLoader: false`.
 *
 * 5. **`GlobalErrorRenderer`** — subscribes to `useErrorStore` and renders
 *    the appropriate UI for each display mode:
 *    - PAGE → fullscreen overlay (z-[9990])
 *    - MODAL → dialog overlay (z-[9995])
 *    - TOAST → bottom-right notification stack (z-[9999])
 *    - INLINE errors are consumed by individual components directly.
 *
 * 6. **`AppRouter`** — renders the full React Router `<Routes>` tree with
 *    lazy-loaded pages, authentication gates, role guards, feature guards,
 *    whitelist guards, and deep-link guards.
 *    `BrowserRouter` is kept in `main.tsx` so that all descendants can use
 *    `useNavigate`, `useLocation`, etc.
 *
 * @module App
 */

import { I18nProvider } from '@/i18n/i18n.context';
import { ThemeProvider } from '@/themes/theme.context';
import GlobalLoader from '@/components/common/GlobalLoader';
import GlobalErrorRenderer from '@/core/errors/GlobalErrorRenderer';
import { ErrorBoundary } from '@/core/errors/ErrorBoundary';
import { AppInitializer } from '@/core/init/AppInitializer';
import AppRouter from '@/routes/AppRouter';

/**
 * Root application component. No business logic lives here — it is purely a
 * composition of providers, global UI components, and the router.
 *
 * Provider order (outer → inner):
 * 1. I18nProvider    — language + RTL (reads from init.store for dynamic bundles)
 * 2. ThemeProvider   — dark / light / custom theme
 * 3. AppInitializer  — blocks router until locale + error config bundles load
 * 4. ErrorBoundary   — top-level render-error safety net
 * 5. GlobalLoader    — fullscreen API spinner
 * 6. GlobalErrorRenderer — error page / modal / toast overlays
 * 7. AppRouter       — route tree (only mounts when AppInitializer is ready)
 */
function App() {
  /**
   * Provider hierarchy (outer → inner):
   *
   * 1. {@link I18nProvider} — language + RTL applied to `<html>` before first paint.
   * 2. {@link ThemeProvider} — dark/light class applied to `<html>` before first paint.
   * 3. {@link AppInitializer} — blocks the subtree until async init (locale bundles, error config) completes.
   * 4. {@link ErrorBoundary} — catches render-time JS errors in the router and global UI; shows a crash fallback.
   * 5. {@link GlobalLoader} — fullscreen spinner overlay (`z-[9999]`) driven by the Axios request semaphore.
   * 6. {@link GlobalErrorRenderer} — renders PAGE / MODAL / TOAST error overlays from `useErrorStore`.
   * 7. {@link AppRouter} — lazy-loaded route tree; only mounts after `AppInitializer` signals readiness.
   */
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppInitializer>
          <ErrorBoundary>
            <GlobalLoader />
            <GlobalErrorRenderer />
            <AppRouter />
          </ErrorBoundary>
        </AppInitializer>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
