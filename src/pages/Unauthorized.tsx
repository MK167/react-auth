/**
 * @fileoverview 403 Unauthorized page.
 *
 * Rendered by `<RoleGuard>` when the authenticated user's role is not in the
 * `allowedRoles` list for the requested route. This is the HTTP 403 analogue
 * in the SPA routing layer.
 *
 * **Important distinction from 401 (Unauthenticated):**
 * The user IS logged in — they simply lack the required role for the section
 * they tried to access. Sending them to `/login` would be confusing (they
 * would log in and immediately be sent back here). Instead, this page
 * explains the situation and offers navigation to their authorised area.
 *
 * @module pages/Unauthorized
 */

import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Full-page 403 error screen shown when the user's role does not permit
 * access to the requested route.
 */
export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Determine the correct "home" path for this user's role
  const homePath =
    user?.role === 'ADMIN' || user?.role === 'MANAGER'
      ? '/admin/dashboard'
      : '/';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
          <ShieldOff size={40} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Access denied
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          You don't have permission to view this page. Your current role
          {user?.role ? (
            <>
              {' '}
              (<span className="font-medium text-gray-700 dark:text-gray-300">{user.role}</span>)
            </>
          ) : null}{' '}
          does not include access to this section.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Go back
          </button>

          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
