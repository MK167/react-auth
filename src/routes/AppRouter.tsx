/**
 * @fileoverview Application router — complete route tree with lazy loading
 * and the full enterprise guard stack.
 *
 * ## Guard stack (outer → inner)
 *
 * ```
 * ProtectedRoute         ← "Are you logged in?" → /login?targetUrl=<path>
 *   WhitelistGuard       ← "Does this route allow your role/userId/flags?"
 *   RoleGuard            ← "Do you have the required role?"
 *     FeatureGuard       ← "Is the required feature flag enabled?"
 *       DeepLinkGuard    ← "Do you own this resource? (async ownership check)"
 *         Page
 * ```
 *
 * Not all pages use all guards. Lightweight pages only use `ProtectedRoute`.
 * Admin pages additionally use `RoleGuard`. Feature-gated pages additionally
 * use `FeatureGuard`. Resource-owning pages additionally use `DeepLinkGuard`.
 *
 * ## Auth redirection flow
 *
 * ```
 * User visits /orders/123 (unauthenticated)
 *   → ProtectedRoute → /login?targetUrl=%2Forders%2F123
 *   → Login success  → navigate('/orders/123', { replace: true })
 * ```
 *
 * ## Error Boundary wrapping
 *
 * Each layout (`AdminLayout`, `UserLayout`) is wrapped in an `ErrorBoundary`
 * at the route level. Render-time JS errors inside a layout section show the
 * boundary fallback UI without crashing the entire app.
 *
 * The boundary automatically resets when the user navigates to a new route
 * (`resetKey={location.pathname}`).
 *
 * ## Route-based code splitting
 *
 * Every page component is `React.lazy()` + `<Suspense>` — each page's JS
 * downloads only when first visited, reducing the initial bundle by ~70%.
 *
 * @module routes/AppRouter
 */

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleGuard from './RoleGuard';
import WhitelistGuard from './WhitelistGuard';
import FeatureGuard from './FeatureGuard';
import DeepLinkGuard from './DeepLinkGuard';
import AuthLayout from '@/layouts/AuthLayout';
import AdminLayout from '@/layouts/AdminLayout';
import UserLayout from '@/layouts/UserLayout';
import GlobalLoader from '@/components/common/GlobalLoader';
import { ErrorBoundary } from '@/core/errors/ErrorBoundary';

// ---------------------------------------------------------------------------
// Lazy-loaded pages
// ---------------------------------------------------------------------------

// Auth pages
const Login    = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));

// Error pages
const NotFound    = lazy(() => import('@/pages/NotFound'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const ErrorPage   = lazy(() => import('@/pages/Error'));

// Admin pages
const DashboardPage       = lazy(() => import('@/pages/admin/DashboardPage'));
const ProductsListPage    = lazy(() => import('@/pages/admin/ProductsListPage'));
const CreateProductPage   = lazy(() => import('@/pages/admin/CreateProductPage'));
const EditProductPage     = lazy(() => import('@/pages/admin/EditProductPage'));
const CategoriesPage      = lazy(() => import('@/pages/admin/CategoriesPage'));
const AdminOrdersPage     = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const ErrorPlaygroundPage = lazy(() => import('@/pages/admin/ErrorPlaygroundPage'));
const RealtimeChatPage    = lazy(() => import('@/pages/admin/RealtimeChatPage'));

// User pages
const HomePage         = lazy(() => import('@/pages/user/HomePage'));
const ProductsPage     = lazy(() => import('@/pages/user/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/user/ProductDetailPage'));
const CartPage         = lazy(() => import('@/pages/user/CartPage'));
const WishlistPage     = lazy(() => import('@/pages/user/WishlistPage'));
const CheckoutPage     = lazy(() => import('@/pages/user/CheckoutPage'));
const OrdersPage       = lazy(() => import('@/pages/user/OrdersPage'));
const ProfilePage      = lazy(() => import('@/pages/user/ProfilePage'));

// ---------------------------------------------------------------------------
// Suspense wrapper helper
// ---------------------------------------------------------------------------

function Page({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<GlobalLoader show />}>
      <Component />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Complete application route tree. Rendered inside `<App>` which is already
 * wrapped in `<BrowserRouter>` in `main.tsx`.
 */
export default function AppRouter() {
  const location = useLocation();

  return (
    <Routes>
      {/* ------------------------------------------------------------------ */}
      {/* Public — authentication pages                                       */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<AuthLayout />}>
        <Route path="/login"    element={<Page component={Login} />} />
        <Route path="/register" element={<Page component={Register} />} />
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Storefront — UserLayout (public + protected pages share layout)     */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<ErrorBoundary resetKey={location.pathname}><UserLayout /></ErrorBoundary>}>
        {/* Public storefront — no authentication required */}
        <Route path="/"                element={<Page component={HomePage} />} />
        <Route path="/products"        element={<Page component={ProductsPage} />} />
        <Route path="/products/:slugId" element={<Page component={ProductDetailPage} />} />
        <Route path="/cart"             element={<Page component={CartPage} />} />
        <Route path="/wishlist"         element={<Page component={WishlistPage} />} />

        {/* Protected storefront — authentication required */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<Page component={CheckoutPage} />} />
          <Route path="/profile"  element={<Page component={ProfilePage} />} />

          {/*
           * Orders list: protected but no deep-link ownership check
           * (the list only shows the user's own orders).
           */}
          <Route path="/orders" element={<Page component={OrdersPage} />} />

          {/*
           * Order detail: deep-link guard verifies resource ownership.
           * DeepLinkGuard reads :id from params and calls the ownership service.
           */}
          <Route element={<DeepLinkGuard resourceType="order" />}>
            <Route path="/orders/:id" element={<Page component={OrdersPage} />} />
          </Route>
        </Route>
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Admin panel — ADMIN and MANAGER roles only                          */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<ProtectedRoute />}>
        {/*
         * WhitelistGuard enforces fine-grained admin route rules from
         * src/config/whitelist.config.ts (role + userId + featureFlag checks).
         */}
        <Route element={<WhitelistGuard />}>
          <Route element={<RoleGuard allowedRoles={['ADMIN', 'MANAGER']} />}>
            <Route element={<ErrorBoundary resetKey={location.pathname}><AdminLayout /></ErrorBoundary>}>
              {/* /admin → redirect to /admin/dashboard */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              <Route path="/admin/dashboard" element={<Page component={DashboardPage} />} />

              {/* Products */}
              <Route path="/admin/products"              element={<Page component={ProductsListPage} />} />
              <Route path="/admin/products/create"       element={<Page component={CreateProductPage} />} />
              <Route path="/admin/products/:id/edit"     element={<Page component={EditProductPage} />} />

              {/* Categories */}
              <Route path="/admin/categories" element={<Page component={CategoriesPage} />} />

              {/* Orders */}
              <Route path="/admin/orders" element={<Page component={AdminOrdersPage} />} />

              {/*
               * Error Playground — ADMIN only + errorPlayground feature flag.
               * WhitelistGuard already checks the role; FeatureGuard adds the
               * flag check so the route is invisible to ADMINs without the flag.
               */}
              <Route element={<FeatureGuard featureFlag="realtimeChat" />}>
                <Route
                  path="/admin/realtime-chat"
                  element={<Page component={RealtimeChatPage} />}
                />
              </Route>
              <Route element={<FeatureGuard featureFlag="errorPlayground" />}>
                <Route
                  path="/admin/error-playground"
                  element={<Page component={ErrorPlaygroundPage} />}
                />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Error pages — public, no layout shell                               */}
      {/* ------------------------------------------------------------------ */}
      <Route path="/unauthorized" element={<Page component={Unauthorized} />} />
      <Route path="/error"        element={<Page component={ErrorPage} />} />

      {/* Catch-all — must be last */}
      <Route path="*" element={<Page component={NotFound} />} />
    </Routes>
  );
}
