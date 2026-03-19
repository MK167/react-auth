/**
 * @fileoverview UserLayout — top navigation shell for the user ecommerce storefront.
 *
 * ## Layout structure
 *
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │  Logo   Home  Products  Orders  Profile   🤍(n)  🛒(n)  👤  │  ← Desktop header
 * │  Logo                                     🤍(n)  🛒(n)   ☰  │  ← Mobile header
 * ├──────────────────────────────────────────────────────────────┤
 * │                                                              │
 * │   <Outlet /> — page content                                  │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Mobile navigation
 *
 * On mobile the header is kept minimal: logo, wishlist badge, cart badge, and
 * a hamburger. Tapping the hamburger slides in a full-height sidebar that
 * contains nav links (with icons), theme toggle, language toggle, user info,
 * and sign-out — everything in one place.
 *
 * @module layouts/UserLayout
 */

import { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Package,
  Globe,
  Home,
  ShoppingBag,
  ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { addToServerCart } from '@/api/cart.api';
import { useTheme } from '@/themes/theme.context';
import { useI18n } from '@/i18n/i18n.context';

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

type NavItem = { labelKey: string; to: string; icon: React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.home',     to: '/',         icon: <Home size={18} /> },
  { labelKey: 'nav.products', to: '/products', icon: <ShoppingBag size={18} /> },
  { labelKey: 'nav.orders',   to: '/orders',   icon: <ClipboardList size={18} /> },
  { labelKey: 'nav.profile',  to: '/profile',  icon: <User size={18} /> },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserLayout() {
  const { user, logout } = useAuthStore();
  // Reactive selectors — subscribe to items array so badge updates instantly
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { theme, toggleTheme } = useTheme();
  const { translate, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    // Persist the current Zustand cart to the server before clearing local
    // state. This ensures the cart survives the session so it is reloaded
    // on the next login via useCartMerge.
    const items = useCartStore.getState().items;
    if (items.length > 0) {
      await Promise.allSettled(
        items.map(({ product, quantity }) =>
          addToServerCart(product._id, quantity),
        ),
      );
    }
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300">
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

            {/* Wishlist — always visible with badge */}
            <NavLink
              to="/wishlist"
              aria-label={`${translate('nav.wishlist')} — ${wishlistCount} items`}
              className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                >
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </NavLink>

            {/* Cart — always visible with badge */}
            <NavLink
              to="/cart"
              aria-label={`${translate('nav.cart')} — ${cartCount} ${cartCount !== 1 ? translate('cart.items') : 'item'}`}
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

            {/* User avatar + logout — desktop only */}
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
                    aria-label={translate('nav.signOut')}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={18} />
                  </button>
                </>
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
      {/* Mobile nav — full-height sidebar drawer                            */}
      {/* ------------------------------------------------------------------ */}

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Drawer — slides from the leading edge, RTL-aware */}
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

        {/* Nav links with icons */}
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
              {item.icon}
              {translate(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Footer: theme, language, user info, logout */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? translate('common.lightMode') : translate('common.darkMode')}
          </button>

          {/* Language toggle */}
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

          {/* User info + logout */}
          {user && (
            <>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  closeMenu();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={18} />
                {translate('nav.signOut')}
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Page content */}
      <main role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
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
