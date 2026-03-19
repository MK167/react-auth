/**
 * @fileoverview 404 Not Found page.
 *
 * Rendered by the catch-all `<Route path="*">` in `AppRouter` when no other
 * route matches the current URL. This can happen when:
 * - The user types an invalid URL directly into the address bar.
 * - A deep-link target no longer exists.
 * - A typo in an internal `<Link>` or `navigate()` call.
 *
 * @module pages/NotFound
 */

import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * Full-page 404 error screen with navigation recovery options.
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <p className="text-8xl font-black text-gray-200 dark:text-gray-800 select-none mb-2">
          404
        </p>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Page not found
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
          Double-check the URL or navigate back to safety.
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
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Home size={16} />
            Return home
          </button>
        </div>
      </div>
    </div>
  );
}
