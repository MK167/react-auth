/**
 * @fileoverview FeatureGuard — gates a route behind a single feature flag.
 *
 * ## Usage
 *
 * ```tsx
 * In AppRouter.tsx — wrap a route group behind a feature flag:
 * <Route element={<FeatureGuard featureFlag="betaReports" />}>
 *   <Route path="/admin/reports" element={<ReportsPage />} />
 * </Route>
 * ```
 *
 * When the flag is `false` or missing:
 * 1. Pushes a `FEATURE_DISABLED` error to the global error store
 *    (rendered as a PAGE overlay by `GlobalErrorRenderer`).
 * 2. Redirects to `fallbackPath` (default: `/unauthorized`).
 *
 * ## Flag storage
 *
 * Feature flags are stored in `useAuthStore().featureFlags` — a plain
 * `Record<string, boolean>` that can be:
 * - Loaded from the backend after login (call `setFeatureFlags()`)
 * - Hard-coded in the store's initial state for development
 * - Overridden in the ErrorPlayground for testing
 *
 * ## Position in the guard stack
 *
 * ```
 * ProtectedRoute      ← auth check
 *   └── RoleGuard     ← role check
 *       └── FeatureGuard ← feature flag check (this guard)
 *           └── Page
 * ```
 *
 * @module routes/FeatureGuard
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { handleRouteError } from '@/core/errors/error.handler';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FeatureGuardProps {
  /**
   * The feature flag key to check in `useAuthStore().featureFlags`.
   * The route is accessible only when this flag is strictly `true`.
   */
  featureFlag: string;
  /**
   * Redirect destination when the flag is disabled.
   * @default '/unauthorized'
   */
  fallbackPath?: string;
  /**
   * When `true`, a FEATURE_DISABLED error is pushed as a PAGE overlay.
   * When `false`, errors are pushed as TOAST (less disruptive).
   * @default true
   */
  showPageError?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Route wrapper that allows child routes only when a feature flag is enabled.
 * Disabled flags redirect to `fallbackPath` and optionally show a
 * FEATURE_DISABLED error overlay.
 *
 * @example
 * ```tsx
 * <Route element={<FeatureGuard featureFlag="analyticsV2" />}>
 *   <Route path="/admin/analytics" element={<AnalyticsPage />} />
 * </Route>
 * ```
 */
export default function FeatureGuard({
  featureFlag,
  fallbackPath = '/unauthorized',
  showPageError = true,
}: FeatureGuardProps) {
  const featureFlags = useAuthStore((s) => s.featureFlags);
  const isEnabled = featureFlags[featureFlag] === true;

  if (!isEnabled) {
    handleRouteError('FEATURE_DISABLED', {
      displayModeOverride: showPageError ? 'PAGE' : 'TOAST',
    });
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
