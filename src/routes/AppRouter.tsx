/**
 * @fileoverview Application router — complete route tree with lazy loading.
 *
 * ## Architecture overview
 *
 * ```
 * <Routes>
 * │
 * ├── /login, /register              ← AuthLayout (public, no auth check)
 * │
 * ├── UserLayout (shared storefront shell — always rendered)
 * │   ├── /                          ← HomePage          (PUBLIC)
 * │   ├── /products                  ← ProductsPage      (PUBLIC)
 * │   ├── /products/:slugId          ← ProductDetailPage (PUBLIC)
 * │   │   slug format: <name-slug>-<24-char-objectid>
 * │   │   e.g. /products/nike-air-max-64c8f1234567890123456789
 * │   ├── /cart                      ← CartPage          (PUBLIC)
 * │   └── ProtectedRoute             ← Gate: must be authenticated
 * │       ├── /checkout              ← CheckoutPage      (AUTH REQUIRED)
 * │       ├── /orders                ← OrdersPage        (AUTH REQUIRED)
 * │       └── /profile               ← ProfilePage       (AUTH REQUIRED)
 * │
 * ├── ProtectedRoute                 ← Gate: must be authenticated
 * │   └── RoleGuard [ADMIN, MANAGER]
 * │       └── AdminLayout
 * │           ├── /admin             → → /admin/products
 * │           ├── /admin/products    ← ProductsListPage
 * │           ├── /admin/products/create ← CreateProductPage
 * │           └── /admin/products/:id/edit ← EditProductPage
 * │
 * ├── /unauthorized                  ← Unauthorized (public, no layout)
 * └── *                              ← NotFound (catch-all)
 * ```
 *
 * ## Why the ecommerce storefront is public
 *
 * An ecommerce platform must let visitors browse before committing to
 * registration. Forcing login before any product is visible converts the app
 * into an admin dashboard experience, creates friction, and reduces
 * conversion. The public storefront pages (`/`, `/products`, `/products/:id`,
 * `/cart`) require no session and are indexed by search engines.
 *
 * Authentication is deferred to the moment of genuine commitment:
 * - Checkout (`/checkout`) — the user is about to pay.
 * - Orders (`/orders`) — the user wants their purchase history.
 * - Profile (`/profile`) — the user wants to manage account details.
 *
 * This is the "progressive authentication" pattern used by major ecommerce
 * platforms (Amazon, Shopify storefronts, Etsy): show value first, ask for
 * credentials only when necessary.
 *
 * ## Progressive authentication UX
 *
 * A guest user can:
 * 1. Land on the homepage and see featured products.
 * 2. Browse the full catalogue.
 * 3. View a product detail page.
 * 4. Add items to the cart (cart is persisted to `localStorage` via Zustand
 *    `persist` middleware — it survives page refresh without a session).
 * 5. Click "Proceed to checkout" → `ProtectedRoute` intercepts, saves
 *    `{ from: location }` in router state, and redirects to `/login`.
 * 6. After login, `Login.tsx` reads `location.state.from` and redirects
 *    straight back to `/checkout` — the cart is intact, the user never
 *    has to start over.
 *
 * ## Role-based redirection strategy
 *
 * After a successful login, the destination depends on:
 * 1. **Intended route** — if the user was redirected here from a protected
 *    page (e.g. `/checkout`), send them back there.
 * 2. **ADMIN / MANAGER** — if no intended route, send to `/admin/products`
 *    because their primary use-case is product management, not shopping.
 * 3. **CUSTOMER / other** — send to `/` (home page) which is the natural
 *    landing for a shopper.
 *
 * ## Intended-route redirect logic
 *
 * `ProtectedRoute` passes `state={{ from: location }}` when redirecting to
 * `/login`. `Login.tsx` reads that state:
 * ```tsx
 * const from = location.state?.from?.pathname;
 * navigate(from ?? roleBasedDefault, { replace: true });
 * ```
 * `replace: true` removes the `/login` entry from the browser history stack
 * so the back button does not return the user to the login form after they
 * have authenticated.
 *
 * ## Separation between storefront and dashboard routes
 *
 * Storefront routes live directly under the root path (`/`, `/products`,
 * `/cart`, etc.) without a `/user` prefix. This gives clean, shareable,
 * SEO-friendly URLs like `https://shophub.example/products/abc123`.
 *
 * Dashboard routes are namespaced under `/admin/` making their intent clear
 * to both users and monitoring tools, and allowing a simple prefix check to
 * decide whether to render the admin layout.
 *
 * ## Route-based code splitting
 *
 * Every page component is loaded via `React.lazy()` so each page's JS is
 * bundled into a separate chunk downloaded only when first visited. In
 * production this reduces the initial bundle by 60–80%.
 *
 * @module routes/AppRouter
 */

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleGuard from './RoleGuard';
import AuthLayout from '@/layouts/AuthLayout';
import AdminLayout from '@/layouts/AdminLayout';
import UserLayout from '@/layouts/UserLayout';
import GlobalLoader from '@/components/common/GlobalLoader';

// ---------------------------------------------------------------------------
// Lazy-loaded pages
// ---------------------------------------------------------------------------

// Auth pages
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));

// Error pages
const NotFound = lazy(() => import('@/pages/NotFound'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const ErrorPage = lazy(() => import('@/pages/Error'));

// Admin pages
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const ProductsListPage = lazy(() => import('@/pages/admin/ProductsListPage'));
const CreateProductPage = lazy(() => import('@/pages/admin/CreateProductPage'));
const EditProductPage = lazy(() => import('@/pages/admin/EditProductPage'));
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));

// User pages
const HomePage = lazy(() => import('@/pages/user/HomePage'));
const ProductsPage = lazy(() => import('@/pages/user/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/user/ProductDetailPage'));
const CartPage = lazy(() => import('@/pages/user/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/user/CheckoutPage'));
const OrdersPage = lazy(() => import('@/pages/user/OrdersPage'));
const ProfilePage = lazy(() => import('@/pages/user/ProfilePage'));

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * The complete application route tree. Rendered inside `<App>` which is
 * already wrapped in `<BrowserRouter>` in `main.tsx`.
 *
 * Key structural decisions:
 *
 * - `UserLayout` wraps both public storefront pages AND the protected account
 *   pages so the header/footer chrome is consistent throughout.
 * - The inner `<ProtectedRoute />` under `UserLayout` covers only the pages
 *   that require a session (checkout, orders, profile).
 * - Admin routes get their own `ProtectedRoute` + `RoleGuard` outside
 *   `UserLayout` so the admin sidebar layout is completely separate.
 */
export default function AppRouter() {
  return (
    <Routes>
      {/* ------------------------------------------------------------------ */}
      {/* Public — authentication pages                                       */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <Suspense fallback={<GlobalLoader show />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<GlobalLoader show />}>
              <Register />
            </Suspense>
          }
        />
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Storefront — UserLayout wraps public + protected pages              */}
      {/*                                                                     */}
      {/* Public pages are accessible without any session. The cart persists  */}
      {/* to localStorage so guest users don't lose items on refresh.         */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<UserLayout />}>
        {/* Public storefront — no authentication required */}
        <Route
          path="/"
          element={
            <Suspense fallback={<GlobalLoader show />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/products"
          element={
            <Suspense fallback={<GlobalLoader show />}>
              <ProductsPage />
            </Suspense>
          }
        />
        {/*
         * SEO-FRIENDLY PRODUCT ROUTE
         * ──────────────────────────
         * Pattern: /products/:slugId
         *
         * The :slugId param is a combined slug + ObjectId:
         *   "nike-air-max-270-64c8f1234567890123456789"
         *    └─── human readable ────┘└── 24-char ObjectId ┘
         *
         * ProductDetailPage uses extractProductId() from utils/slug.ts to
         * strip the ObjectId from the tail for the API call.
         *
         * Legacy pure-ID URLs (/products/64c8f...) continue to work because
         * extractProductId() falls back to the full string when no slug prefix
         * is found — fully backwards-compatible.
         *
         * To add URL-prefix language routing (/ar/products/:slugId):
         * Change the parent route from <Route element={<UserLayout />}> to
         * <Route path="/:lang?" element={<UserLayout />}> and update
         * UserLayout to read :lang and call setLang() from useI18n().
         */}
        <Route
          path="/products/:slugId"
          element={
            <Suspense fallback={<GlobalLoader show />}>
              <ProductDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/cart"
          element={
            <Suspense fallback={<GlobalLoader show />}>
              <CartPage />
            </Suspense>
          }
        />

        {/* Protected storefront — authentication required.                  */}
        {/* ProtectedRoute saves the intended path in state so Login can     */}
        {/* redirect back after authentication (e.g. /checkout preserved).  */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/checkout"
            element={
              <Suspense fallback={<GlobalLoader show />}>
                <CheckoutPage />
              </Suspense>
            }
          />
          <Route
            path="/orders"
            element={
              <Suspense fallback={<GlobalLoader show />}>
                <OrdersPage />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<GlobalLoader show />}>
                <ProfilePage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Admin panel — ADMIN and MANAGER roles only                          */}
      {/* Completely separate layout from the storefront.                     */}
      {/* ------------------------------------------------------------------ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRoles={['ADMIN', 'MANAGER']} />}>
          <Route element={<AdminLayout />}>
            {/* /admin → redirect to /admin/dashboard */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            <Route
              path="/admin/dashboard"
              element={
                <Suspense fallback={<GlobalLoader show />}>
                  <DashboardPage />
                </Suspense>
              }
            />

            <Route
              path="/admin/products"
              element={
                <Suspense fallback={<GlobalLoader show />}>
                  <ProductsListPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/products/create"
              element={
                <Suspense fallback={<GlobalLoader show />}>
                  <CreateProductPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/products/:id/edit"
              element={
                <Suspense fallback={<GlobalLoader show />}>
                  <EditProductPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <Suspense fallback={<GlobalLoader show />}>
                  <CategoriesPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <Suspense fallback={<GlobalLoader show />}>
                  <AdminOrdersPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
      </Route>

      {/* ------------------------------------------------------------------ */}
      {/* Error pages — public, no layout shell                               */}
      {/* ------------------------------------------------------------------ */}
      <Route
        path="/unauthorized"
        element={
          <Suspense fallback={<GlobalLoader show />}>
            <Unauthorized />
          </Suspense>
        }
      />
      <Route
        path="/error"
        element={
          <Suspense fallback={<GlobalLoader show />}>
            <ErrorPage />
          </Suspense>
        }
      />

      {/* Catch-all — must be last */}
      <Route
        path="*"
        element={
          <Suspense fallback={<GlobalLoader show />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}
