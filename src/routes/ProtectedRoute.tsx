/**
 * @fileoverview ProtectedRoute — authentication gate for the router tree.
 *
 * ## Auth redirection flow
 *
 * ```
 * User opens /orders/123 (unauthenticated)
 *       │
 *       ▼
 * ProtectedRoute detects: no user / no cookie
 *       │
 *       ▼
 * Redirect to: /login?targetUrl=%2Forders%2F123
 *       │
 *       ▼
 * User completes login in Login.tsx
 *       │
 *       ▼
 * Login reads ?targetUrl → navigate('/orders/123', { replace: true })
 * ```
 *
 * ## Why `?targetUrl=` instead of `state.from`?
 *
 * `state.from` works within a single browser session but is lost when:
 * - The user opens a deep link in a new tab
 * - The user pastes a URL into an address bar (no router state)
 * - The user shares a link that requires login
 *
 * `?targetUrl=` survives all of the above because it is encoded in the URL
 * itself. The Login page reads it from `useSearchParams()`.
 *
 * `state.from` is still populated as a fallback for backwards compatibility
 * (e.g. any existing code that reads `location.state?.from`).
 *
 * ## Security note
 *
 * The `targetUrl` is validated in `Login.tsx` before navigation:
 * - Must be a relative path (starts with `/`)
 * - Cannot be `/login` or `/register` (prevents redirect loops)
 * - URL-decoded before use to prevent double-encoding issues
 *
 * @module routes/ProtectedRoute
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { cookieService } from '@/utils/cookie.service';

/**
 * Route wrapper that allows rendering child routes only to authenticated users.
 * Unauthenticated visitors are redirected to `/login?targetUrl=<current-path>`.
 *
 * Place this component as the `element` of a wrapper `<Route>`:
 * ```tsx
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/orders" element={<OrdersPage />} />
 * </Route>
 * ```
 */
export default function ProtectedRoute() {
  const { user } = useAuthStore();
  const token = cookieService.getToken();
  const location = useLocation();

  // A user is considered authenticated when:
  // 1. The `user` object exists in the Zustand store (loaded from localStorage).
  // 2. A valid access token cookie is present.
  const isAuthenticated = user !== null && token !== undefined;

  if (!isAuthenticated) {
    // Build targetUrl from the full current location (path + search + hash)
    // so the user lands exactly where they intended after login.
    const targetUrl = encodeURIComponent(
      location.pathname + location.search + location.hash,
    );

    return (
      <Navigate
        to={`/login?targetUrl=${targetUrl}`}
        // Also populate state.from for any code that reads the legacy pattern.
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}
