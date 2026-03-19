/**
 * @fileoverview General Error Page.
 *
 * ## UX rationale
 *
 * Generic error messages like "Something went wrong" leave users confused and
 * stranded — they don't know if the problem is their internet connection, the
 * server, or a bug. A purpose-built error page:
 *
 * 1. **Names the problem clearly** — "Connection Error" vs "Server Error" sets
 *    correct expectations about what the user can do next.
 * 2. **Provides actionable recovery** — retry the last action, or go home.
 * 3. **Maintains trust** — a polished error page signals that the team
 *    anticipated failures and handled them gracefully.
 *
 * ## URL contract
 *
 * The Axios interceptor navigates here with a `?type=` query param:
 *
 * - `/error?type=network` — device is offline or server unreachable.
 * - `/error?type=server`  — server returned 500 / 502 / 503 / 504.
 * - `/error`              — unknown error (no or invalid type param).
 *
 * Reading the type from the URL (rather than component props or store state)
 * makes the error page bookmarkable, shareable in bug reports, and compatible
 * with hard-navigation from interceptors that run outside the React tree.
 *
 * ## Accessibility
 *
 * - `role="alert"` on the error description announces it immediately to
 *   screen readers when the page mounts.
 * - `aria-live="assertive"` ensures the status is re-read if the type changes
 *   without a full page reload.
 * - Both action buttons have explicit, descriptive labels.
 * - Focus is placed on the primary action button on mount so keyboard
 *   users can immediately invoke recovery without tabbing.
 *
 * @module pages/Error
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WifiOff, ServerCrash, AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ---------------------------------------------------------------------------
// Error type config
// ---------------------------------------------------------------------------

type ErrorVariant = 'network' | 'server' | 'unknown';

type ErrorConfig = {
  icon: React.ReactNode;
  /** Colour of the icon wrapper circle */
  iconBg: string;
  iconColor: string;
  title: string;
  message: string;
  /** Label on the primary CTA button */
  retryLabel: string;
};

/**
 * Visual and textual configuration for each supported error variant.
 *
 * Designed to be empathetic and non-technical — users should understand
 * the situation without knowing what HTTP 503 means.
 */
const ERROR_CONFIG: Record<ErrorVariant, ErrorConfig> = {
  network: {
    icon: <WifiOff size={36} strokeWidth={1.5} />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500 dark:text-amber-400',
    title: 'Connection Error',
    message:
      "We couldn't reach our servers. Please check your internet connection and try again. If you're on Wi-Fi, try switching to mobile data.",
    retryLabel: 'Try again',
  },
  server: {
    icon: <ServerCrash size={36} strokeWidth={1.5} />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-500 dark:text-red-400',
    title: 'Server Error',
    message:
      "Something went wrong on our end. Our team has been automatically notified and is working on a fix. Please try again in a few minutes.",
    retryLabel: 'Try again',
  },
  unknown: {
    icon: <AlertTriangle size={36} strokeWidth={1.5} />,
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-500 dark:text-gray-400',
    title: 'Something went wrong',
    message:
      "An unexpected error occurred. If this keeps happening, please contact support with the details of what you were doing.",
    retryLabel: 'Try again',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * General-purpose error page supporting network failures, server crashes,
 * and unknown errors. The error type is read from the `?type=` URL param
 * so the page can be reached via hard navigation from the Axios interceptor.
 */
export default function ErrorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  // Read error type from URL; fall back to 'unknown' for invalid values.
  const rawType = searchParams.get('type');
  const errorType: ErrorVariant =
    rawType === 'network' || rawType === 'server' ? rawType : 'unknown';

  const config = ERROR_CONFIG[errorType];

  // Focus the retry button on mount so keyboard users can immediately
  // act without needing to tab through the page.
  useEffect(() => {
    const id = setTimeout(() => retryButtonRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, []);

  /**
   * Retry strategy:
   * - For network errors: `window.history.back()` returns to the page
   *   that triggered the error so the user can retry the same action.
   * - For server errors: `window.location.reload()` is a harder reset
   *   that re-fires the page's initial data fetch.
   *
   * We use `window` APIs rather than `navigate(-1)` because the error page
   * is often reached via `window.location.assign()` from the interceptor,
   * which means the previous history entry is the page that caused the
   * error — `navigate(-1)` would go back to it correctly, but a browser
   * reload on a server error retries the request from scratch.
   */
  const handleRetry = () => {
    if (errorType === 'network') {
      window.history.back();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4"
      aria-live="assertive"
    >
      <div className="w-full max-w-md text-center">
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 sm:p-10">
          {/* Icon illustration */}
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${config.iconBg} ${config.iconColor}`}
            aria-hidden="true"
          >
            {config.icon}
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {config.title}
          </h1>

          {/* Error description — announced immediately by screen readers */}
          <p
            role="alert"
            className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 text-sm"
          >
            {config.message}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Primary: retry */}
            <button
              ref={retryButtonRef}
              type="button"
              onClick={handleRetry}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <RefreshCw size={15} />
              {config.retryLabel}
            </button>

            {/* Secondary: go home */}
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              <Home size={15} />
              Back to home
            </button>
          </div>

          {/* Error type indicator — helps users describe the issue in support tickets */}
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 font-mono">
            error_type: {errorType}
          </p>
        </div>
      </div>
    </div>
  );
}
