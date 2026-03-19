/**
 * @fileoverview RoleGuard — role-based access control for the router tree.
 *
 * ## How it fits into the routing hierarchy
 *
 * `RoleGuard` is always nested **inside** a `ProtectedRoute`, never used
 * standalone. The layered architecture separates two distinct concerns:
 *
 * ```
 * <Route element={<ProtectedRoute />}>           ← "Are you logged in?"
 *   <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>  ← "Are you an admin?"
 *     <Route path="/admin/*" element={<AdminLayout />}>
 *       ...admin routes
 *     </Route>
 *   </Route>
 * </Route>
 * ```
 *
 * ## Role check logic
 *
 * ```
 * RoleGuard renders
 *       │
 *       ├── user.role is in allowedRoles[]?
 *       │         YES → render <Outlet /> (user has the required role)
 *       │          NO → <Navigate to="/unauthorized" replace />
 *       │
 *       └── user is null? (shouldn't happen — ProtectedRoute ran first)
 *                   → <Navigate to="/unauthorized" replace />
 * ```
 *
 * ## Supported roles
 *
 * The application supports three roles returned by the FreeAPI:
 * - `ADMIN`    — full access to admin dashboard and all user routes
 * - `MANAGER`  — access to admin dashboard (product management) but not
 *                necessarily all admin-only operations
 * - `CUSTOMER` — access to the user-facing ecommerce storefront only
 *
 * These are compared as plain strings against `user.role` from the auth store.
 * Using string literals avoids TypeScript enums (disallowed by
 * `erasableSyntaxOnly: true` in `tsconfig.app.json`) while keeping the
 * type information descriptive.
 *
 * ## Why redirect to `/unauthorized` instead of `/login`?
 *
 * The user IS authenticated — they just lack the required role. Sending them
 * to `/login` would be confusing. The `/unauthorized` page (HTTP 403 analogy)
 * explains the situation and offers a way back.
 *
 * @module routes/RoleGuard
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RoleGuardProps {
  /**
   * The list of role strings that are permitted to access the child routes.
   * At least one of the strings must match `user.role` (case-sensitive).
   *
   * @example
   * ```tsx
   * // Admin and Manager can both access these routes
   * <RoleGuard allowedRoles={['ADMIN', 'MANAGER']} />
   *
   * // Only customers can access these routes
   * <RoleGuard allowedRoles={['CUSTOMER']} />
   * ```
   */
  allowedRoles: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Route wrapper that allows rendering child routes only to users whose
 * `role` is listed in `allowedRoles`. Unauthorised users are redirected to
 * `/unauthorized`.
 *
 * Must always be placed inside a `ProtectedRoute` in the route tree so that
 * `user` is guaranteed non-null by the time this component renders (in
 * practice the `null` fallback is still handled defensively).
 *
 * @param props - See {@link RoleGuardProps}.
 */
export default function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuthStore();

  // This case is theoretically unreachable because ProtectedRoute already
  // checked authentication, but we handle it defensively to satisfy the
  // TypeScript null check and prevent a runtime error if the route tree is
  // ever restructured incorrectly.
  if (!user) {
    return <Navigate to="/unauthorized" replace />;
  }

  const hasRequiredRole = allowedRoles.includes(user.role);

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
