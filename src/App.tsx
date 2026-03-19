/**
 * @fileoverview Root application component.
 *
 * `App` is the minimal composition root. It wraps the entire component tree
 * with the two providers that must be available to all children:
 *
 * 1. **`I18nProvider`** — makes `useI18n()` available everywhere. On mount it
 *    reads the stored language from `localStorage` and applies `dir` and `lang`
 *    attributes to `<html>` immediately, preventing RTL layout flash for
 *    returning Arabic users. Must be the outermost provider so that
 *    `ThemeProvider` and layout components can call `useI18n()` if needed.
 *
 * 2. **`ThemeProvider`** — makes `useTheme()` available in every layout and
 *    component. It reads the stored preference from `localStorage` on mount
 *    and applies the `dark` class to `<html>` if needed, preventing FOUC
 *    (Flash Of Unstyled Content) for returning dark-mode users.
 *
 * 3. **`GlobalLoader`** — fullscreen spinner overlay driven by the Zustand
 *    `useUiStore.activeApiRequestsCount` counter. Mounted here (above the
 *    router) so it renders above all page content via `z-[9999]`. It shows
 *    automatically for any Axios request that does not opt out with
 *    `showGlobalLoader: false`.
 *
 * 4. **`AppRouter`** — renders the full React Router `<Routes>` tree with
 *    lazy-loaded pages, authentication gates, and role-based guards.
 *    `BrowserRouter` is intentionally kept in `main.tsx` so that `App` and
 *    its descendants can use `useNavigate`, `useLocation`, etc. without
 *    needing access to the router provider.
 *
 * @module App
 */

import { I18nProvider } from '@/i18n/i18n.context';
import { ThemeProvider } from '@/themes/theme.context';
import GlobalLoader from '@/components/common/GlobalLoader';
import AppRouter from '@/routes/AppRouter';

/**
 * Root application component. No logic lives here — it is purely a
 * composition of providers and the router.
 */
function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <GlobalLoader />
        <AppRouter />
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
