/**
 * @fileoverview UserLayout — top navigation shell for the user ecommerce storefront.
 *
 * ## Layout structure
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Logo    Home  Products  Orders  Profile    🛒(2)  Avatar   │  ← Header
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │   <Outlet /> — user page content (Home, Products, etc.)    │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Mobile navigation modes
 *
 * Two mobile nav styles are available and toggled by the `PanelLeft` icon
 * button next to the hamburger. The preference is persisted in localStorage
 * under the key `mobileNavStyle`.
 *
 * - **dropdown** (default): A menu panel slides down below the header when
 *   the hamburger is tapped. This is compact and keeps the page visible.
 *
 * - **sidebar**: A full-height drawer slides in from the leading edge
 *   (left in LTR, right in RTL) with a semi-transparent backdrop. Mirrors
 *   the admin panel drawer UX. Better for apps with many nav items.
 *
 * @module layouts/UserLayout
 */

import { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Package,
  Globe,
  PanelLeft,
  AlignJustify,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useTheme } from '@/themes/theme.context';
import { useI18n } from '@/i18n/i18n.context';

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

type NavItem = { labelKey: string; to: string };

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.home',     to: '/' },
  { labelKey: 'nav.products', to: '/products' },
  { labelKey: 'nav.orders',   to: '/orders' },
  { labelKey: 'nav.profile',  to: '/profile' },
];

type MobileNavStyle = 'dropdown' | 'sidebar';

function loadNavStyle(): MobileNavStyle {
  try {
    const saved = localStorage.getItem('mobileNavStyle');
    if (saved === 'dropdown' || saved === 'sidebar') return saved;
  } catch { /* non-fatal */ }
  return 'dropdown';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserLayout() {
  const { user, logout } = useAuthStore();
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavStyle, setMobileNavStyle] = useState<MobileNavStyle>(loadNavStyle);

  const cartCount = getTotalItems();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const toggleNavStyle = useCallback(() => {
    setMobileNavStyle((prev) => {
      const next: MobileNavStyle = prev === 'dropdown' ? 'sidebar' : 'dropdown';
      try { localStorage.setItem('mobileNavStyle', next); } catch { /* non-fatal */ }
      return next;
    });
    setMenuOpen(false);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
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

          {/* Desktop navigation */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              className="flex items-center gap-1 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-semibold"
            >
              <Globe size={16} />
              {lang === 'en' ? 'AR' : 'EN'}
            </button>

            {/* Cart */}
            <NavLink
              to="/cart"
              aria-label={`${t('nav.cart')} — ${cartCount} ${cartCount !== 1 ? t('cart.items') : 'item'}`}
              className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
              <span className="sr-only">{cartCount} items in cart</span>
            </NavLink>

            {/* User dropdown — desktop only */}
            <div className="hidden md:flex items-center gap-2">
              {user && (
                <>
                  <NavLink
                    to="/profile"
                    aria-label="Your profile"
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user.username}
                    </span>
                  </NavLink>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label={t('nav.signOut')}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Profile icon — mobile only */}
            <NavLink
              to="/profile"
              className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Profile"
            >
              <User size={20} />
            </NavLink>

            {/* Nav style toggle (dropdown ↔ sidebar) — mobile only */}
            <button
              type="button"
              onClick={toggleNavStyle}
              aria-label={
                mobileNavStyle === 'sidebar'
                  ? 'Switch to dropdown menu'
                  : 'Switch to sidebar menu'
              }
              title={
                mobileNavStyle === 'sidebar'
                  ? 'Switch to dropdown menu'
                  : 'Switch to sidebar menu'
              }
              className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {mobileNavStyle === 'sidebar' ? (
                <AlignJustify size={18} />
              ) : (
                <PanelLeft size={18} />
              )}
            </button>

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

        {/* ---------------------------------------------------------------- */}
        {/* Mobile nav — DROPDOWN style                                       */}
        {/* ---------------------------------------------------------------- */}
        {mobileNavStyle === 'dropdown' && menuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                {t('nav.signOut')}
              </button>
            )}
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile nav — SIDEBAR style                                          */}
      {/* Rendered outside the header so it overlays the full page.          */}
      {/* ------------------------------------------------------------------ */}
      {mobileNavStyle === 'sidebar' && (
        <>
          {/* Backdrop */}
          {menuOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
              onClick={closeMenu}
              aria-hidden="true"
            />
          )}

          {/* Drawer — slides from the leading edge, RTL-aware via ltr:/rtl: variants */}
          <aside
            className={`fixed inset-y-0 start-0 z-50 flex flex-col w-72 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 shadow-2xl transform transition-transform duration-200 ease-in-out md:hidden ${
              menuOpen
                ? 'translate-x-0'
                : 'ltr:-translate-x-full rtl:translate-x-full'
            }`}
            aria-label="Mobile navigation sidebar"
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
                aria-label="Close sidebar"
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
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>

            {/* Drawer footer — user info + logout */}
            <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
              {user && (
                <>
                  <div className="flex items-center gap-3 px-1 mb-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.username}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={16} />
                    {t('nav.signOut')}
                  </button>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Page content */}
      <main role="main" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-6 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} ShopHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
