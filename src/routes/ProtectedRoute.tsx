/**
 * @fileoverview ProtectedRoute — authentication gate for the router tree.
 *
 * ## Security flow
 *
 * ```
 * Browser navigates to a protected path (e.g. /admin/products)
 *       │
 *       ▼
 * ProtectedRoute renders
 *       │
 *       ├── user in Zustand store?  AND  cookie token exists?
 *       │         YES → render <Outlet /> (proceed to the child route)
 *       │          NO → <Navigate to="/login" state={{ from: location }} />
 *       │
 *       └── After login, Login.tsx reads location.state.from and redirects
 *           back to the originally requested path.
 * ```
 *
 * ## Dual-check rationale (store + cookie)
 *
 * The Zustand auth store persists `user` to `localStorage` (see
 * `auth.store.ts`). After a page refresh, Zustand re-hydrates from storage
 * so `user` is immediately available. The cookie check (`cookieService.getToken()`)
 * acts as a second gate: even if the stored user object somehow outlives a
 * valid session, the absence of an access token cookie will prevent the user
 * from reaching protected content. The Axios response interceptor will then
 * handle any 401 responses from subsequent API calls by triggering the silent
 * refresh flow or redirecting to `/login`.
 *
 * ## Why NOT redirect inside the Axios interceptor only?
 *
 * The interceptor redirect (`window.location.href = '/login'`) is a last-resort
 * hard navigation that clears all in-memory state. The `ProtectedRoute` check
 * happens at render time — it is cheaper (no network call) and preserves the
 * React component tree for the login page.
 *
 * ## `state={{ from: location }}` pattern
 *
 * By passing the current location to the `<Navigate>` state, the Login page
 * can detect that the user was redirected and redirect them back after a
 * successful login. This is the standard React Router "redirect after login"
 * pattern.
 *
 * @module routes/ProtectedRoute
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { cookieService } from '@/utils/cookie.service';

/**
 * Route wrapper that allows rendering child routes only to authenticated
 * users. Unauthenticated visitors are redirected to `/login`.
 *
 * Place this component as the `element` of a wrapper `<Route>` in the router
 * tree; all protected routes should be nested under it:
 *
 * ```tsx
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 * </Route>
 * ```
 */
export default function ProtectedRoute() {
  const { user } = useAuthStore();
  const token = cookieService.getToken();
  const location = useLocation();

  // A user is considered authenticated when:
  // 1. The `user` object exists in the Zustand store (loaded from localStorage
  //    on refresh via the persist middleware).
  // 2. A valid access token cookie is present (set by the login / refresh flow).
  //
  // Either condition alone is insufficient: `user` without a token means the
  // session has expired; a token without `user` means the store hasn't been
  // hydrated (shouldn't happen in practice but defensive coding is important).
  const isAuthenticated = user !== null && token !== undefined;

  if (!isAuthenticated) {
    // Preserve the intended destination so Login can redirect back after auth.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
