/**
 * @fileoverview AuthLayout — wrapper for public authentication pages.
 *
 * ## Responsibilities
 *
 * 1. **Centered card container** — provides the full-screen centered layout
 *    that both Login and Register pages render inside. Pages themselves only
 *    need to render their form; layout concerns live here.
 *
 * 2. **Theme toggle** — exposes a theme toggle button in the top-right corner
 *    so users can switch between light and dark before logging in. This is
 *    important for accessibility (some users need high-contrast dark mode
 *    to be able to read forms comfortably).
 *
 * 3. **Brand mark** — renders the application name at the top of the page
 *    to orient the user before they see the form card.
 *
 * ## Why a separate AuthLayout?
 *
 * The authentication pages have a completely different visual language from
 * the admin and user layouts (no sidebar, no navigation bar, fully centered).
 * A dedicated layout avoids conditional rendering logic inside the main
 * layouts and makes the route tree self-documenting.
 *
 * ## Outlet
 *
 * `<Outlet />` is where React Router renders the matched child route
 * (Login or Register). The layout wraps it; the page fills it.
 *
 * @module layouts/AuthLayout
 */

import { Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/themes/theme.context';

/**
 * Full-screen centered layout used by `/login` and `/register`.
 *
 * Consumed as the `element` prop of a parent `<Route>` in `AppRouter`:
 * ```tsx
 * <Route element={<AuthLayout />}>
 *   <Route path="login" element={<Login />} />
 *   <Route path="register" element={<Register />} />
 * </Route>
 * ```
 */
export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Top bar with brand + theme toggle */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          ShopHub
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Page content (Login / Register) */}
      <main
        role="main"
        className="flex items-center justify-center px-4 pb-12"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
