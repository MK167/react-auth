/**
 * @fileoverview AuthLayout — public authentication pages with full nav header.
 *
 * Renders the same sticky header and footer as UserLayout so visitors can
 * browse to public pages (Home, Products) before signing in.
 *
 * Auth-specific differences from UserLayout:
 *  - Only public nav items (Home, Products) — no Orders/Profile
 *  - No cart/wishlist badge icons (no session yet)
 *  - No user avatar or logout button
 *  - Sign In / Create Account link in the action area
 *  - `<main>` stays vertically centered for the form card
 *
 * @module layouts/AuthLayout
 */

import { useState, useCallback } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Sun,
  Moon,
  Package,
  Globe,
  Home,
  ShoppingBag,
} from 'lucide-react';
import { useTheme } from '@/themes/theme.context';
import { useI18n } from '@/i18n/use-i18n.hook';

// ---------------------------------------------------------------------------
// Navigation config — public routes only
// ---------------------------------------------------------------------------

type NavItem = { labelKey: string; to: string; icon: React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.home',     to: '/',         icon: <Home size={18} /> },
  { labelKey: 'nav.products', to: '/products', icon: <ShoppingBag size={18} /> },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();
  const { translate, lang, setLang } = useI18n();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const isLogin    = location.pathname === '/login';
  const isRegister = location.pathname === '/register';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header
        role="banner"
        className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <NavLink
            to="/"
            className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg flex-shrink-0"
          >
            <Package size={22} className="text-indigo-600" />
            ShopHub
          </NavLink>

          {/* Desktop navigation — public pages */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
                {translate(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

            {/* Theme toggle — desktop only */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="hidden md:flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Language toggle — desktop only */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              className="hidden md:flex items-center gap-1 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-semibold"
            >
              <Globe size={16} />
              {lang === 'en' ? 'AR' : 'EN'}
            </button>

            {/* Sign In / Create Account link */}
            <div className="hidden md:flex items-center gap-2">
              {isRegister && (
                <Link
                  to="/login"
                  className="text-sm font-medium px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {translate('nav.signIn')}
                </Link>
              )}
              {isLogin && (
                <Link
                  to="/register"
                  className="text-sm font-medium px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  {translate('auth.login.signUp')}
                </Link>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile nav drawer                                                   */}
      {/* ------------------------------------------------------------------ */}

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex flex-col w-72 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 shadow-2xl transform transition-transform duration-200 ease-in-out md:hidden ${
          menuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <NavLink
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg"
          >
            <Package size={20} className="text-indigo-600" />
            ShopHub
          </NavLink>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav
          aria-label="Main navigation"
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`
              }
            >
              {item.icon}
              {translate(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Footer: theme, language, auth link */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? translate('common.lightMode') : translate('common.darkMode')}
          </button>

          <button
            type="button"
            onClick={() => {
              setLang(lang === 'en' ? 'ar' : 'en');
              closeMenu();
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Globe size={18} />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>

          {isRegister && (
            <Link
              to="/login"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {translate('nav.signIn')}
            </Link>
          )}
          {isLogin && (
            <Link
              to="/register"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {translate('auth.login.signUp')}
            </Link>
          )}
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Page content (Login / Register form — vertically centered)         */}
      {/* ------------------------------------------------------------------ */}
      <main
        role="main"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <Outlet />
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} ShopHub. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
