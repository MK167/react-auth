/**
 * @fileoverview AdminLayout — responsive sidebar shell for the admin panel.
 *
 * ## Layout structure
 *
 * ```
 * ┌──────────────┬──────────────────────────────────────────┐
 * │              │  Header (user info + theme toggle)        │
 * │   Sidebar    ├──────────────────────────────────────────┤
 * │  (260px)     │                                          │
 * │              │   <Outlet /> — admin page content        │
 * │              │                                          │
 * └──────────────┴──────────────────────────────────────────┘
 * ```
 *
 * On mobile (< 768px) the sidebar is hidden by default and slides in as a
 * drawer when the hamburger button in the header is tapped. An overlay
 * backdrop closes it when clicked.
 *
 * @module layouts/AdminLayout
 */

import { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/themes/theme.context';
import { useI18n } from '@/i18n/use-i18n.hook';

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

type NavItem = {
  labelKey: string;
  to: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    labelKey: 'admin.nav.dashboard',
    to: '/admin/dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    labelKey: 'admin.nav.products',
    to: '/admin/products',
    icon: <Package size={18} />,
  },
  {
    labelKey: 'admin.nav.categories',
    to: '/admin/categories',
    icon: <Tag size={18} />,
  },
  {
    labelKey: 'admin.nav.orders',
    to: '/admin/orders',
    icon: <ShoppingBag size={18} />,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminLayout() {
  const { user, logout, featureFlags } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { translate } = useI18n();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    ...NAV_ITEMS,
    ...(featureFlags?.errorPlayground
      ? [{ labelKey: 'admin.nav.errorPlayground', to: '/admin/error-playground', icon: <Layers size={18} /> }]
      : []),
  ];

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Package size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg">ShopHub</span>
      </div>

      {/* Navigation */}
      <nav aria-label="Admin navigation" className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to + item.labelKey}
            to={item.to}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.icon}
            {translate(item.labelKey)}
            <ChevronRight size={14} className="ms-auto opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          {translate('admin.nav.signOut')}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Desktop sidebar (always visible ≥ md)                              */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0 bg-gray-900 dark:bg-gray-950"
        aria-label="Admin sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile sidebar drawer                                              */}
      {/* ------------------------------------------------------------------ */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex flex-col w-64 bg-gray-900 dark:bg-gray-950 transform transition-transform duration-200 ease-in-out md:hidden ${
          sidebarOpen
            ? 'translate-x-0'
            : 'ltr:-translate-x-full rtl:translate-x-full'
        }`}
        aria-label="Mobile admin sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content area                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
            className="md:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Desktop spacer */}
          <div className="hidden md:block" />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Mobile close */}
            {sidebarOpen && (
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close sidebar"
                className="md:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            )}

            {/* User badge */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user.username}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable page content */}
        <main
          role="main"
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
