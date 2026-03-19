/**
 * @fileoverview WhitelistGuard — enforces per-route allowlist rules.
 *
 * ## How it works
 *
 * The guard reads `location.pathname` and looks it up in `WHITELIST_CONFIG`
 * (using `findWhitelistRule()`). If a rule matches, ALL conditions are checked:
 *
 * 1. **Roles** — `user.role` must be in `rule.allowedRoles`.
 * 2. **User IDs** — `user._id` must be in `rule.allowedUserIds`.
 * 3. **Feature flags** — every flag in `rule.requiredFeatureFlags` must be
 *    `true` in the auth store.
 *
 * Any failed condition redirects to `/unauthorized` (or the `fallbackPath`
 * prop). Failures also push an appropriate error to the global error store
 * so `GlobalErrorRenderer` can optionally display a toast.
 *
 * If NO rule matches the current pathname, the guard is transparent (passes
 * through to `<Outlet />`).
 *
 * ## Position in the guard stack
 *
 * ```
 * ProtectedRoute      ← auth check
 *   └── WhitelistGuard ← fine-grained role/user/flag check
 *       └── RoleGuard  ← broad role check (or skip if whitelist covers it)
 *           └── AdminLayout
 *               └── Page
 * ```
 *
 * Typically placed directly inside `ProtectedRoute`, wrapping an entire layout
 * group so all routes inside inherit the check.
 *
 * @module routes/WhitelistGuard
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { findWhitelistRule } from '@/config/whitelist.config';
import { handleRouteError } from '@/core/errors/error.handler';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WhitelistGuardProps {
  /**
   * Redirect destination when the user fails a whitelist check.
   * @default '/unauthorized'
   */
  fallbackPath?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Route wrapper that enforces per-route whitelist rules defined in
 * `src/config/whitelist.config.ts`.
 *
 * Must be placed **inside** a `ProtectedRoute` so that `user` is guaranteed
 * non-null when this guard runs (in practice the null check is still
 * handled defensively).
 *
 * Renders `<Outlet />` transparently when no rule matches the current path.
 */
export default function WhitelistGuard({
  fallbackPath = '/unauthorized',
}: WhitelistGuardProps) {
  const location = useLocation();
  const { user, featureFlags } = useAuthStore();
  const rule = findWhitelistRule(location.pathname);

  // No rule for this path → transparent pass-through.
  if (!rule) return <Outlet />;

  // ── Role check ─────────────────────────────────────────────────────────────
  if (rule.allowedRoles && rule.allowedRoles.length > 0) {
    if (!user || !rule.allowedRoles.includes(user.role)) {
      handleRouteError('FORBIDDEN', { displayModeOverride: 'TOAST' });
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // ── User ID check ──────────────────────────────────────────────────────────
  if (rule.allowedUserIds && rule.allowedUserIds.length > 0) {
    if (!user || !rule.allowedUserIds.includes(user._id)) {
      handleRouteError('FORBIDDEN', { displayModeOverride: 'TOAST' });
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // ── Feature flag check ─────────────────────────────────────────────────────
  if (rule.requiredFeatureFlags && rule.requiredFeatureFlags.length > 0) {
    const allEnabled = rule.requiredFeatureFlags.every(
      (flag) => featureFlags[flag] === true,
    );
    if (!allEnabled) {
      handleRouteError('FEATURE_DISABLED', { displayModeOverride: 'TOAST' });
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // All checks passed.
  return <Outlet />;
}
