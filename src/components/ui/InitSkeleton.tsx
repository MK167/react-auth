/**
 * @fileoverview InitSkeleton — fullscreen loading screen shown while
 * AppInitializer fetches locale and error config bundles.
 *
 * Renders before any React context is available, so it uses no hooks.
 * Matches the inline HTML skeleton in index.html (same colors + spinner)
 * for a seamless transition: HTML skeleton → React InitSkeleton → App.
 *
 * @module components/ui/InitSkeleton
 */

export default function InitSkeleton() {
  return (
    <div
      aria-label="Loading application"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 z-[9999]"
    >
      {/* Card skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5 min-w-[220px]">
        {/* Logo placeholder */}
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
          </svg>
        </div>

        {/* App name */}
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">
          ShopHub
        </p>

        {/* Spinner row */}
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"
            aria-hidden="true"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Loading…
          </span>
        </div>

        {/* Skeleton bars */}
        <div className="w-full space-y-2 pt-1">
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-full animate-pulse" />
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4 animate-pulse" />
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-1/2 animate-pulse" />
        </div>
      </div>

      {/* Bottom hint */}
      <p className="mt-4 text-xs text-gray-300 dark:text-gray-600">
        Initializing content bundles…
      </p>
    </div>
  );
}
