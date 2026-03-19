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
 *    errors that escape layout-level boundaries (e.g. errors in providers
 *    themselves). Shows a minimal crash fallback UI.
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
 *    INLINE errors are consumed by individual components directly.
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
import AppRouter from '@/routes/AppRouter';

/**
 * Root application component. No business logic lives here — it is purely a
 * composition of providers, global UI components, and the router.
 */
function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <GlobalLoader />
          <GlobalErrorRenderer />
          <AppRouter />
        </ErrorBoundary>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
