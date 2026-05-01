/**
 * @fileoverview User Profile Page.
 *
 * Displays the authenticated user's profile information sourced from the
 * Zustand auth store (no additional API call needed since user data was
 * fetched and stored at login time).
 *
 * @module pages/user/ProfilePage
 */

import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useI18n } from '@/i18n/use-i18n.hook';
import { usePageMeta } from '@/hooks/usePageMeta';

/**
 * Profile page showing user details, role, and quick-action links.
 */
export default function ProfilePage() {
  usePageMeta('Profile', 'Manage your ShopHub account details and preferences.');
  const navigate = useNavigate();
  const { translate } = useI18n();
  const { user, logout } = useAuthStore();
  const getTotalItems = useCartStore((s) => s.getTotalItems);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const roleLabel =
    user.role === 'ADMIN'
      ? translate('profile.roleAdmin')
      : user.role === 'MANAGER'
      ? translate('profile.roleManager')
      : translate('profile.roleCustomer');

  const roleColor =
    user.role === 'ADMIN'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      : user.role === 'MANAGER'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{translate('profile.title')}</h1>

      {/* Avatar card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 mb-4 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user.username}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          <span className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${roleColor}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 mb-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
          {translate('profile.accountDetails')}
        </h3>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <User size={15} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{translate('profile.username')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Mail size={15} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{translate('profile.email')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Shield size={15} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{translate('profile.role')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-4 space-y-1">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 px-2">
          {translate('profile.quickActions')}
        </h3>

        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={17} className="text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            <span className="text-sm text-gray-700 dark:text-gray-200">{translate('profile.myOrders')}</span>
          </div>
          <span className="text-xs text-gray-400">→</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/cart')}
          className="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={17} className="text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            <span className="text-sm text-gray-700 dark:text-gray-200">{translate('profile.cart')}</span>
          </div>
          <span className="text-xs text-gray-400">{getTotalItems()} {translate('cart.items')} →</span>
        </button>

        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield size={17} className="text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              <span className="text-sm text-gray-700 dark:text-gray-200">{translate('profile.adminPanel')}</span>
            </div>
            <span className="text-xs text-gray-400">→</span>
          </button>
        )}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 w-full px-5 py-3 rounded-2xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
      >
        <LogOut size={16} />
        {translate('profile.signOut')}
      </button>
    </div>
  );
}
