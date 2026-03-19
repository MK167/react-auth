/**
 * @fileoverview DeepLinkGuard — validates deep links beyond basic auth/role.
 *
 * ## What it validates
 *
 * 1. **Feature flag** — if `featureFlag` prop is given, the flag must be `true`
 *    in the auth store. Failure → FEATURE_DISABLED error + redirect.
 *
 * 2. **Resource ownership** — if `resourceType` prop is given, calls the mock
 *    ownership service to verify the current user owns the resource identified
 *    by the `:id` URL param. Failure cases:
 *    - Resource not found  → `{resourceType}_NOT_FOUND` error (PAGE mode)
 *    - No access           → FORBIDDEN error (PAGE mode) + redirect
 *
 * 3. **Route validity** — handled implicitly by React Router (this guard only
 *    runs when a route matched).
 *
 * ## Position in the guard stack
 *
 * ```
 * ProtectedRoute      ← "Are you logged in?"
 *   └── RoleGuard     ← "Do you have the right role?"
 *       └── DeepLinkGuard ← "Do you own this resource? Is the feature on?"
 *           └── Page
 * ```
 *
 * ## Example usage in AppRouter
 *
 * ```tsx
 * // Guard an order detail page
 * <Route element={<ProtectedRoute />}>
 *   <Route element={<DeepLinkGuard resourceType="order" />}>
 *     <Route path="/orders/:id" element={<OrderDetailPage />} />
 *   </Route>
 * </Route>
 *
 * // Guard a feature-flagged page
 * <Route element={<FeatureGuard featureFlag="betaDashboard" />}>
 *   <Route element={<DeepLinkGuard featureFlag="betaDashboard" />}>
 *     <Route path="/beta/dashboard" element={<BetaDashboard />} />
 *   </Route>
 * </Route>
 * ```
 *
 * @module routes/DeepLinkGuard
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { handleRouteError } from '@/core/errors/error.handler';
import type { ErrorCode } from '@/core/errors/error.types';
import GlobalLoader from '@/components/common/GlobalLoader';

// ---------------------------------------------------------------------------
// Mock resource ownership service
// ---------------------------------------------------------------------------

/**
 * Result of an ownership check.
 */
type OwnershipResult = {
  /** `true` if the resource exists */
  found: boolean;
  /** `true` if the authenticated user is allowed to access it */
  hasAccess: boolean;
};

/**
 * Checks whether the authenticated user owns/can access a resource.
 *
 * **This is a mock implementation.**
 * Replace with a real API call to your backend:
 * ```ts
 * const { data } = await authUrl.get(`/${resourceType}s/${resourceId}/ownership`);
 * return { found: data.found, hasAccess: data.hasAccess };
 * ```
 *
 * The mock:
 * - Always returns `{ found: true, hasAccess: true }` for known resource types.
 * - Returns `{ found: false, hasAccess: false }` for unknown types (simulate 404).
 */
async function checkResourceOwnership(
  resourceType: string,
  resourceId: string,
  _userId: string,
): Promise<OwnershipResult> {
  // Simulate network latency.
  await new Promise<void>((resolve) => setTimeout(resolve, 60));

  // MOCK: treat any non-empty ID as valid for known types.
  const knownTypes = ['order', 'product', 'profile', 'wishlist'];
  if (!knownTypes.includes(resourceType)) {
    return { found: false, hasAccess: false };
  }

  // MOCK: treat empty/malformed IDs as not-found.
  if (!resourceId || resourceId.length < 4) {
    return { found: false, hasAccess: false };
  }

  return { found: true, hasAccess: true };
}

// ---------------------------------------------------------------------------
// Error code resolver for resource types
// ---------------------------------------------------------------------------

function resolveResourceErrorCode(resourceType: string): ErrorCode {
  const map: Record<string, ErrorCode> = {
    order:    'ORDER_NOT_FOUND',
    product:  'PRODUCT_NOT_FOUND',
  };
  return map[resourceType] ?? 'RESOURCE_NOT_FOUND';
}

// ---------------------------------------------------------------------------
// Validation states
// ---------------------------------------------------------------------------

type ValidationStatus = 'pending' | 'allowed' | 'not_found' | 'forbidden' | 'feature_disabled';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeepLinkGuardProps {
  /**
   * Feature flag key to check in `useAuthStore().featureFlags`.
   * If provided and the flag is `false`/missing, the user is blocked.
   */
  featureFlag?: string;
  /**
   * Resource type for ownership verification.
   * The guard reads the `id` from the nearest `:id` URL param.
   * Supported: 'order', 'product', 'profile'
   */
  resourceType?: string;
  /**
   * Custom redirect path for forbidden/not-found cases.
   * Defaults to `'/unauthorized'`.
   */
  fallbackPath?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Deep link validation guard. Place between `ProtectedRoute`/`RoleGuard`
 * and the guarded page component.
 *
 * Runs async validation (feature flag + ownership check) before rendering
 * children. Shows the global loader during validation.
 */
export default function DeepLinkGuard({
  featureFlag,
  resourceType,
  fallbackPath = '/unauthorized',
}: DeepLinkGuardProps) {
  const { user, featureFlags } = useAuthStore();
  const params = useParams();
  const resourceId = params.id ?? params.slugId ?? '';

  const [status, setStatus] = useState<ValidationStatus>('pending');

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      // ── 1. Feature flag check ──────────────────────────────────────────────
      if (featureFlag !== undefined) {
        const isEnabled = featureFlags[featureFlag] ?? false;
        if (!isEnabled) {
          if (!cancelled) {
            handleRouteError('FEATURE_DISABLED');
            setStatus('feature_disabled');
          }
          return;
        }
      }

      // ── 2. Resource ownership check ────────────────────────────────────────
      if (resourceType && user) {
        const result = await checkResourceOwnership(
          resourceType,
          resourceId,
          user._id,
        );

        if (cancelled) return;

        if (!result.found) {
          handleRouteError(resolveResourceErrorCode(resourceType));
          setStatus('not_found');
          return;
        }

        if (!result.hasAccess) {
          handleRouteError('FORBIDDEN');
          setStatus('forbidden');
          return;
        }
      }

      // ── 3. All checks passed ───────────────────────────────────────────────
      if (!cancelled) setStatus('allowed');
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [featureFlag, featureFlags, resourceType, resourceId, user]);

  // Show global loader while validating.
  if (status === 'pending') {
    return <GlobalLoader show />;
  }

  // Redirect on any failure — GlobalErrorRenderer handles the error display.
  if (status === 'not_found' || status === 'forbidden' || status === 'feature_disabled') {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
