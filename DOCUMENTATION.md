# ShopHub — Developer Documentation

> **Notion import tip:** Paste this file into a Notion page using **/Markdown** or import via **Settings → Import → Markdown & CSV**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Project Structure](#4-project-structure)
5. [Architecture Deep Dive](#5-architecture-deep-dive)
6. [Module Documentation](#6-module-documentation)
7. [State Management](#7-state-management)
8. [API Layer](#8-api-layer)
9. [Internationalisation (i18n)](#9-internationalisation-i18n)
10. [Theming](#10-theming)
11. [Routing & Guards](#11-routing--guards)
12. [Global Error System](#12-global-error-system)
13. [CMS Content Service](#13-cms-content-service)
14. [Error Boundary](#14-error-boundary)
15. [Feature Flags](#15-feature-flags)
16. [Mobile Navigation](#16-mobile-navigation)
17. [Global Loader](#17-global-loader)
18. [Type Definitions](#18-type-definitions)
19. [Utilities](#19-utilities)
20. [Configuration Files](#20-configuration-files)
21. [Development Guidelines](#21-development-guidelines)

---

## 1. Project Overview

**ShopHub** is a production-ready, bilingual (English/Arabic, LTR/RTL) e-commerce SPA with a separate admin panel and enterprise-grade guard, error, and content architecture.

### Key capabilities

| Capability | Detail |
|---|---|
| Storefront | Browse, search, filter, and buy products without logging in |
| Cart | Guest cart persisted to localStorage; merged into server on login |
| Wishlist | Synced to server after authentication |
| Authentication | Email/password + Google, Facebook, Microsoft (Firebase OAuth) |
| Admin panel | Product CRUD, category management, order management |
| Role-based access | `CUSTOMER`, `MANAGER`, `ADMIN` roles with layered route guards |
| Bilingual | Full Arabic RTL ↔ English LTR toggle with no page reload |
| Dark mode | System-aware class-based dark theme, no FOUC |
| Lazy loading | Every page is code-split; initial bundle 60–80% smaller |
| Global loader | Single Zustand-driven overlay for all API requests |
| Deep Link Guard | Async resource ownership + feature flag validation before render |
| Whitelist Guard | Per-route allowlists (role + userId + feature flag) from central config |
| Feature Guard | Gate any route behind a single feature flag |
| Target URL redirect | `/login?targetUrl=/orders/123` deep-link flow, survives new tabs |
| Global Error System | Centralized `ErrorCode` → display mode routing (PAGE / MODAL / TOAST / INLINE) |
| CMS Content | `VITE_CONTENT_MODE=LOCAL` (i18n) or `CMS` (remote endpoint with cache + fallback) |
| Error Playground | Interactive sandbox to test every error scenario at `/admin/error-playground` |

---

## 2. Tech Stack

| Layer | Library | Version | Why |
|---|---|---|---|
| UI framework | React | 19 | Concurrent features, use() hook |
| Routing | React Router | 7 | Nested routes, lazy loading, typed params |
| State | Zustand | 5 | Minimal boilerplate, built-in persist middleware |
| Styling | Tailwind CSS | 3.4 | Utility-first, RTL variants (`rtl:`), dark mode (`dark:`) |
| Forms | React Hook Form | 7 | Uncontrolled inputs, minimal re-renders |
| Validation | Zod | 4 | TypeScript-first schema inference |
| HTTP | Axios | 1.13 | Interceptors for auth headers, global loader, and error system |
| Auth (OAuth) | Firebase | 12 | Google / Facebook / Microsoft social login |
| Icons | Lucide React | 0.577 | Tree-shaken SVG icons |
| Build | Vite | 8 | Sub-second HMR, ESM-native |
| Language | TypeScript | 5.9 | Strict mode, `erasableSyntaxOnly` enabled |

---

## 3. Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Type-check + build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint
```

### Environment variables

The project uses three env files:

| File | When used | Key setting |
|------|-----------|-------------|
| `.env` | All environments | Firebase config, API base URL |
| `.env.local` | Development only | `VITE_CONTENT_MODE=LOCAL` |
| `.env.production` | Production build | `VITE_CONTENT_MODE=CMS`, CMS endpoint |

```env
# .env — shared across all environments
VITE_LOGIN_AUTH_URL=https://api.freeapi.app/api/v1
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...

# .env.local — development
VITE_CONTENT_MODE=LOCAL

# .env.production — production build
VITE_CONTENT_MODE=CMS
VITE_CMS_ENDPOINT=https://your-cms-api.example.com/content
```

All variables must be prefixed with `VITE_` to be exposed to the browser by Vite.

---

## 4. Project Structure

```
react-auth/
├── public/                     # Static assets (favicon, robots.txt)
├── src/
│   ├── api/                    # Axios API call modules (one per domain)
│   │   ├── base/
│   │   │   └── axios.ts        # Axios instance factory (auth + loader + error interceptors)
│   │   ├── auth.api.ts         # login, register, logout, refresh
│   │   ├── cart.api.ts         # Cart CRUD (server-side)
│   │   ├── categories.api.ts   # Category listing
│   │   ├── orders.api.ts       # Order creation and listing
│   │   ├── products.api.ts     # Product CRUD + pagination/search
│   │   └── wishlist.api.ts     # Wishlist sync
│   │
│   ├── assets/                 # Static images bundled by Vite
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   └── DeleteModal.tsx         # Confirmation dialog for product delete
│   │   ├── auth/
│   │   │   ├── Divider.tsx             # "or" separator between form and social login
│   │   │   ├── common/
│   │   │   │   ├── error-notification/ # Red banner for API error messages
│   │   │   │   ├── icons/              # SVG icons for Google, Facebook, Microsoft
│   │   │   │   └── spinner/            # Inline loading spinner (auth forms)
│   │   │   └── social-media-auth/
│   │   │       └── SocialLogin.tsx     # Firebase OAuth buttons row
│   │   ├── common/
│   │   │   └── GlobalLoader.tsx        # Fullscreen API loading overlay
│   │   ├── form/
│   │   │   └── input/
│   │   │       ├── FormInputControl.tsx # Reusable labelled input with error
│   │   │       └── index.type.ts        # Prop types for form inputs
│   │   └── ui/
│   │       └── Skeleton.tsx            # TableRowSkeleton + card skeletons
│   │
│   ├── config/
│   │   ├── Define.ts               # Axios instance export (authUrl)
│   │   ├── firebase.ts             # Firebase app initialisation
│   │   └── whitelist.config.ts     # ★ Per-route allowlist rules + findWhitelistRule()
│   │
│   ├── core/                       # ★ Enterprise systems (error, content)
│   │   ├── errors/
│   │   │   ├── error.types.ts      # ErrorCode, ErrorDisplayMode, ErrorConfig, ActiveError
│   │   │   ├── error.config.ts     # Config map: 11 error codes → icon, i18n keys, actions
│   │   │   ├── error.store.ts      # Zustand: pageError / modalError / toastQueue / inlineError
│   │   │   ├── error.handler.ts    # resolveErrorCode() + handleApiError() + handleRouteError()
│   │   │   ├── GlobalErrorRenderer.tsx  # PAGE overlay, MODAL dialog, TOAST stack via portals
│   │   │   └── ErrorBoundary.tsx   # Class component; auto-resets on resetKey change
│   │   └── content/
│   │       └── content.service.ts  # useContent() — LOCAL (i18n) or CMS (fetch + cache)
│   │
│   ├── hooks/
│   │   ├── useCartMerge.ts     # Merges localStorage cart into server on login
│   │   ├── useDebounce.ts      # Generic debounce hook (used in search inputs)
│   │   ├── useSocialAuth.ts    # Handles Firebase OAuth flow + auth store update
│   │   └── useWishlistSync.ts  # Syncs local wishlist to server after login
│   │
│   ├── i18n/
│   │   ├── i18n.context.tsx    # I18nProvider, useI18n hook, t() resolver
│   │   └── locales/
│   │       ├── en.ts           # English strings — source of truth (includes errors.* namespace)
│   │       └── ar.ts           # Arabic strings — must satisfy Locale type
│   │
│   ├── layouts/
│   │   ├── AdminLayout.tsx     # Dark sidebar (gray-900) shell for /admin/* routes
│   │   ├── AuthLayout.tsx      # Centered card shell for /login, /register
│   │   └── UserLayout.tsx      # Sticky header + mobile nav shell for storefront
│   │
│   ├── pages/
│   │   ├── Error.tsx           # Reusable — works via ?type= URL param OR code prop
│   │   ├── NotFound.tsx        # 404 catch-all page
│   │   ├── Unauthorized.tsx    # 403 page (insufficient role)
│   │   ├── Login.tsx           # Login form — reads ?targetUrl= for deep-link redirect
│   │   ├── Register.tsx        # Registration form
│   │   ├── admin/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProductsListPage.tsx    # Paginated product table with search/sort
│   │   │   ├── CreateProductPage.tsx   # New product form with image upload
│   │   │   ├── EditProductPage.tsx     # Pre-populated edit form
│   │   │   ├── CategoriesPage.tsx      # Category CRUD
│   │   │   ├── AdminOrdersPage.tsx     # All-orders view for admins/managers
│   │   │   └── ErrorPlaygroundPage.tsx # ★ Interactive error testing sandbox
│   │   └── user/
│   │       ├── HomePage.tsx            # Hero + featured products
│   │       ├── ProductsPage.tsx        # Paginated catalogue with search, filter, sort
│   │       ├── ProductDetailPage.tsx   # Single product view + add to cart
│   │       ├── CartPage.tsx            # Cart items + order summary
│   │       ├── CheckoutPage.tsx        # Shipping + payment + order placement
│   │       ├── OrdersPage.tsx          # Order history with status tracker
│   │       └── ProfilePage.tsx         # Account info + quick-action buttons
│   │
│   ├── routes/
│   │   ├── AppRouter.tsx       # Complete route tree with all guards wired
│   │   ├── ProtectedRoute.tsx  # Auth gate → /login?targetUrl=<path>
│   │   ├── RoleGuard.tsx       # Role check → /unauthorized
│   │   ├── WhitelistGuard.tsx  # ★ Fine-grained role/userId/flag allowlist
│   │   ├── FeatureGuard.tsx    # ★ Single feature flag gate
│   │   └── DeepLinkGuard.tsx   # ★ Async ownership check + feature flag validation
│   │
│   ├── schemas/
│   │   ├── login.schema.ts     # Zod schema for login form
│   │   ├── product.schema.ts   # Zod schema for product create/edit
│   │   └── register.schema.ts  # Zod schema for registration form
│   │
│   ├── store/
│   │   ├── auth.store.ts       # user, accessToken, featureFlags (+ setFeatureFlags)
│   │   ├── cart.store.ts       # Cart with localStorage persist
│   │   ├── ui.store.ts         # activeApiRequestsCount, toastQueue, modal
│   │   └── wishlist.store.ts   # Wishlist + server sync
│   │
│   ├── themes/
│   │   └── theme.context.tsx   # ThemeProvider + useTheme hook (light/dark)
│   │
│   ├── types/
│   │   ├── auth.types.ts       # UserType (role, permissions?), AuthResponse
│   │   ├── cart.types.ts       # CartItem, CartState
│   │   ├── order.types.ts      # Order, OrderItem, OrderStatus
│   │   ├── product.types.ts    # Product, ProductCategory, PaginatedData
│   │   └── wishlist.types.ts   # WishlistItem
│   │
│   ├── utils/
│   │   ├── cookie.service.ts   # getToken / setToken / removeToken (js-cookie)
│   │   ├── normalizeApiError.ts # Extracts error message from Axios error objects
│   │   ├── prefetch.ts         # import() calls to warm up lazy chunks on hover/login
│   │   └── slug.ts             # extractProductId() — parses <slug>-<objectId> URLs
│   │
│   ├── App.tsx                 # Root: providers + GlobalLoader + GlobalErrorRenderer + AppRouter
│   ├── index.css               # Tailwind directives + global base styles
│   └── main.tsx                # ReactDOM.createRoot + BrowserRouter
│
├── .env                        # Shared env (Firebase, API URL)
├── .env.local                  # Dev env (VITE_CONTENT_MODE=LOCAL)
├── .env.production             # Prod env (VITE_CONTENT_MODE=CMS)
├── eslint.config.js            # ESLint flat config (React hooks + TS rules)
├── package.json
├── postcss.config.js           # Tailwind + autoprefixer PostCSS pipeline
├── tailwind.config.js          # darkMode: 'class', custom gray-750, animate plugin
├── tsconfig.app.json           # App TypeScript config (strict, path aliases)
├── tsconfig.json               # Root TypeScript references config
├── tsconfig.node.json          # Node/Vite TypeScript config
└── vite.config.ts              # Vite config with vite-tsconfig-paths plugin
```

---

## 5. Architecture Deep Dive

### Component tree

```
<BrowserRouter>              ← main.tsx
  <I18nProvider>             ← App.tsx — language/RTL context
    <ThemeProvider>          ← App.tsx — dark/light theme context
      <ErrorBoundary>        ← App.tsx — top-level render error catch
        <GlobalLoader />     ← App.tsx — API loading overlay (always mounted)
        <GlobalErrorRenderer />  ← App.tsx — PAGE / MODAL / TOAST portals
        <AppRouter>          ← App.tsx — full route tree
          <Routes>
            <AuthLayout>     ← /login, /register
            <ErrorBoundary resetKey={pathname}>
              <UserLayout>   ← /, /products, /products/:slugId, /cart
                <ProtectedRoute> ← /checkout, /profile, /orders
                <ProtectedRoute>
                  <DeepLinkGuard> ← /orders/:id (ownership validation)
            <ProtectedRoute>
              <WhitelistGuard>
                <RoleGuard [ADMIN, MANAGER]>
                  <ErrorBoundary resetKey={pathname}>
                    <AdminLayout> ← /admin/*
                      <FeatureGuard> ← /admin/error-playground
            /unauthorized
            /error
            *              ← NotFound
```

### Why layouts are separate from routes

Each layout is a React Router `<Outlet>` wrapper. This means the layout renders once and stays mounted as child routes change — no layout flash when navigating within the same section. Admin and storefront have completely independent CSS contexts and sidebars.

### Enterprise guard stack (admin routes)

```
Request: GET /admin/products/create

ProtectedRoute     → Is user authenticated? No → /login?targetUrl=/admin/products/create
                   → Yes ↓
WhitelistGuard     → Does this route have a whitelist rule? Checked against whitelist.config.ts
                   → Rule found; does user satisfy role/userId/flag conditions?
                   → No → TOAST 'FORBIDDEN' error + redirect to fallbackPath
                   → Yes ↓
RoleGuard          → Does user.role ∈ allowedRoles? No → /unauthorized
                   → Yes ↓
AdminLayout        → Page renders
```

### Auth redirection flow

```
User visits /orders/123 (not logged in)
  → ProtectedRoute → /login?targetUrl=%2Forders%2F123
  → User logs in successfully
  → Login.tsx reads ?targetUrl, decodes, validates (relative path, not /login)
  → navigate('/orders/123')
  → DeepLinkGuard validates resource ownership
  → Page renders

If no targetUrl:
  → ADMIN / MANAGER → /admin/products
  → CUSTOMER        → /
```

### Progressive authentication

The storefront is fully public. Authentication is only required at the moment of genuine commitment:

| Action | Auth required? | Reasoning |
|---|---|---|
| Browse products | No | Reduces friction, enables SEO |
| Add to cart | No | Cart persists in localStorage |
| View cart | No | Guest cart survives page refresh |
| Checkout | **Yes** | Payment requires identity |
| View orders | **Yes** | Sensitive purchase history |
| View profile | **Yes** | Account management |

---

## 6. Module Documentation

### Auth module (`/login`, `/register`)

| File | Purpose |
|---|---|
| `pages/Login.tsx` | Email/password form + social login. Reads `?targetUrl=` for post-login deep-link redirect. |
| `pages/Register.tsx` | Registration form with the same pattern. |
| `components/auth/social-media-auth/SocialLogin.tsx` | Firebase OAuth buttons (Google, Facebook, Microsoft). |
| `hooks/useSocialAuth.ts` | Handles the Firebase `signInWithPopup` flow and updates the auth store. |
| `schemas/login.schema.ts` | Zod: email format + password min length. |
| `schemas/register.schema.ts` | Zod: username, email, password, confirm password. |

**Role-based redirect after login:**

```
Login success
  ├── ?targetUrl present (e.g. /orders/123) → navigate there
  ├── state.from present (fallback)          → navigate there
  ├── ADMIN or MANAGER (no redirect target)  → /admin/products
  └── CUSTOMER (no redirect target)          → /
```

**`resolveRedirectTarget(targetUrlParam, stateFrom)`** validates the redirect destination:
- Rejects absolute URLs (only relative paths allowed)
- Rejects `/login` and `/register` to prevent redirect loops
- Decodes the URI-encoded string before navigating

---

### User / Storefront module

| File | Purpose |
|---|---|
| `layouts/UserLayout.tsx` | Sticky header, desktop nav, two mobile nav modes, footer. |
| `pages/user/HomePage.tsx` | Hero section + featured products grid. |
| `pages/user/ProductsPage.tsx` | Paginated catalogue with search, category filter, sort. |
| `pages/user/ProductDetailPage.tsx` | Product image, description, add-to-cart, wishlist toggle. |
| `pages/user/CartPage.tsx` | Cart items list, quantity controls, order summary, checkout CTA. |
| `pages/user/CheckoutPage.tsx` | Shipping form + payment form + order placement. |
| `pages/user/OrdersPage.tsx` | Order history with step-by-step status tracker. |
| `pages/user/ProfilePage.tsx` | Account info + quick-action buttons. |

**Product URL format:**

```
/products/<human-readable-slug>-<24-char-ObjectId>
Example: /products/nike-air-max-270-64c8f1234567890123456789
```

`extractProductId()` in `utils/slug.ts` strips the slug prefix and returns the ObjectId for the API call. Legacy pure-ID URLs continue to work.

---

### Admin module (`/admin/*`)

| File | Purpose |
|---|---|
| `layouts/AdminLayout.tsx` | Dark sidebar (desktop always-on, mobile drawer), header with user info. |
| `pages/admin/DashboardPage.tsx` | Admin dashboard overview. |
| `pages/admin/ProductsListPage.tsx` | Data table: search, sort (name/price/date), category filter, pagination, delete. |
| `pages/admin/CreateProductPage.tsx` | Product creation form with image upload. |
| `pages/admin/EditProductPage.tsx` | Pre-populated edit form. |
| `pages/admin/CategoriesPage.tsx` | Category CRUD. |
| `pages/admin/AdminOrdersPage.tsx` | All-orders view for admins/managers. |
| `pages/admin/ErrorPlaygroundPage.tsx` | ★ Interactive sandbox to trigger, test, and preview every error scenario. |
| `components/admin/DeleteModal.tsx` | Confirmation dialog before permanent deletion. |

**Access control:** Both `ADMIN` and `MANAGER` roles access all admin routes via `ProtectedRoute > WhitelistGuard > RoleGuard`. The Error Playground additionally requires the `errorPlayground` feature flag.

**Admin i18n keys:**

```typescript
admin.nav.{dashboard, products, categories, orders, errorPlayground, signOut}
admin.products.{title, newProduct, search, allCategories, sort.*, table.*, ...}
admin.categories.{title, newCategory, empty}
admin.orders.{title, empty}
admin.deleteModal.{title, message, confirm, cancel}
admin.errorPlayground.{title, description, ...}
```

---

### Error pages

| File | Purpose |
|---|---|
| `pages/Error.tsx` | Reusable error page. Works as a standalone route (`/error?type=network`) OR as a prop-driven component in the Error Playground. |
| `pages/NotFound.tsx` | 404 catch-all. |
| `pages/Unauthorized.tsx` | 403 page — shown when `RoleGuard` fails. |

**`Error.tsx` resolution order:**

```
1. code prop              → look up in ERROR_CONFIG_MAP
2. ?type= URL param       → map via LEGACY_TYPE_MAP (network, server, unknown)
3. UNKNOWN_ERROR fallback → always shows something
```

Props `icon`, `title`, `description`, `primaryAction`, `secondaryAction` all override the config defaults.

---

## 7. State Management

All global state uses **Zustand** stores in `src/store/` and `src/core/errors/`.

### `auth.store.ts`

| State | Type | Persistence | Description |
|---|---|---|---|
| `user` | `UserType \| null` | `localStorage 'auth-user'` | Authenticated user object |
| `accessToken` | `string \| null` | Memory only | JWT — not stored in localStorage for security |
| `featureFlags` | `Record<string, boolean>` | `localStorage 'auth-feature-flags'` | Per-user feature toggles |

| Action | Description |
|---|---|
| `setAuth(user, token)` | Called after login/register. Sets user + token. |
| `setAccessToken(token)` | Updates the in-memory token (e.g. after refresh). |
| `setFeatureFlags(flags)` | Merges new flags into the store + persists to localStorage. |
| `logout()` | Clears user, token, cookie, and resets feature flags to defaults. |

**Feature flag defaults:**
- DEV: `{ errorPlayground: true }` — playground accessible without backend
- Production: `{}` — all flags disabled until set by `setFeatureFlags()` after login

---

### `cart.store.ts`

Persisted to `localStorage` via Zustand's `persist` middleware. Guest carts survive page refresh. On login, `useCartMerge` sends the local cart to the server and clears it.

| Action | Description |
|---|---|
| `addItem(product, qty)` | Adds or increments a cart item. |
| `removeItem(productId)` | Removes item from cart. |
| `updateQty(productId, qty)` | Sets exact quantity. |
| `clearCart()` | Empties the cart. |
| `getTotalItems()` | Derived: sum of all quantities. |
| `getTotalPrice()` | Derived: sum of price × quantity. |

---

### `ui.store.ts`

Manages global UI state unrelated to errors.

| State | Type | Description |
|---|---|---|
| `activeApiRequestsCount` | `number` | Semaphore counter for GlobalLoader visibility. |
| `toastQueue` | `GenericToast[]` | Non-error notifications (success, info, warning). |
| `modal` | `GenericModal \| null` | Non-error confirmation/info dialogs. |

| Action | Description |
|---|---|
| `startLoading()` | Increments request counter. Called by Axios request interceptor. |
| `stopLoading()` | Decrements request counter, clamped to ≥ 0. |
| `pushToast(message, variant?, duration?)` | Adds a success/info/warning toast (default 3000 ms). |
| `removeToast(id)` | Removes a toast by ID. |
| `openModal(modal)` | Opens a generic modal. |
| `closeModal()` | Closes the current modal. |

> **Separation from error.store:** Error-specific state (page error, modal error, error toasts) lives in `core/errors/error.store.ts` to avoid bloating ui.store and to allow the error system to be imported independently.

`GlobalLoader` renders visible when `activeApiRequestsCount > 0`. A counter (not a boolean) ensures parallel requests don't hide the loader early.

---

### `error.store.ts` (in `src/core/errors/`)

The runtime hub for all application errors. See [Section 12 — Global Error System](#12-global-error-system) for the full description.

| State | Type | Description |
|---|---|---|
| `pageError` | `ActiveError \| null` | Fullscreen overlay error. Replaced by new PAGE errors. |
| `modalError` | `ActiveError \| null` | Dialog overlay error. Replaced by new MODAL errors. |
| `toastQueue` | `ActiveError[]` | Multiple error toasts can coexist (max 5). |
| `inlineError` | `ActiveError \| null` | Component-level error (not rendered by GlobalErrorRenderer). |

| Action | Description |
|---|---|
| `pushError(code, options?)` | Create and route an error to the correct display slot. |
| `clearPageError()` | Clear the fullscreen overlay. |
| `clearModalError()` | Clear the modal. |
| `removeToast(id)` | Remove one toast from the queue. |
| `clearInlineError()` | Clear the inline error. |
| `clearAll()` | Reset all slots. |

---

### `wishlist.store.ts`

Persisted to `localStorage`. Synced to server after login via `useWishlistSync`.

---

## 8. API Layer

### `src/api/base/axios.ts` — Axios instance

The shared Axios instance has three interceptors:

**Request interceptor:**
- Attaches `Authorization: Bearer <token>` from `auth.store`.
- Increments `ui.store.activeApiRequestsCount` (shows GlobalLoader) unless `showGlobalLoader: false`.

**Response interceptor (success):**
- Decrements `ui.store.activeApiRequestsCount`.

**Response interceptor (error):**
- Decrements `ui.store.activeApiRequestsCount`.
- On `401 Unauthorized`: attempts a token refresh. If refresh succeeds, retries the original request. If it fails, calls `logout()`.
- On `403 Forbidden`: calls `handleApiError()` → pushes `FORBIDDEN` to error store.
- On network error (no response): calls `handleApiError()` → pushes `NETWORK_ERROR`.
- On `5xx` server error: calls `handleApiError()` → pushes `SERVER_ERROR`.
- On `400`/`422` validation errors: **NOT pushed globally** — components handle these with field-level messages.
- **No more `window.location.assign()`** — the error store + `GlobalErrorRenderer` handles display.

**Opting out of the global loader:**

```typescript
// This request will NOT show the GlobalLoader overlay
axios.get('/products', { showGlobalLoader: false });
```

**Opting out of the global error handler:**

```typescript
// Component will handle the error itself
axios.post('/orders', payload, { skipGlobalErrorHandler: true });
```

### Axios module augmentation

The `InternalAxiosRequestConfig` type is extended with custom flags:

```typescript
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    showGlobalLoader?: boolean;    // default: true
    skipGlobalErrorHandler?: boolean; // default: false
    _loaderStarted?: boolean;      // internal: was loader started for this request?
    _retry?: boolean;              // internal: is this a retry after token refresh?
  }
}
```

### API modules

| File | Endpoints |
|---|---|
| `auth.api.ts` | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/refresh` |
| `products.api.ts` | `GET /products`, `GET /products/:id`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id` |
| `categories.api.ts` | `GET /categories`, `POST /categories`, `DELETE /categories/:id` |
| `cart.api.ts` | `GET /cart`, `POST /cart`, `DELETE /cart/:itemId` |
| `orders.api.ts` | `GET /orders`, `GET /orders/:id`, `POST /orders` |
| `wishlist.api.ts` | `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:id` |

---

## 9. Internationalisation (i18n)

### Architecture

Context-based (no external library). Language preference is persisted in `localStorage` under `app-lang`.

```
I18nProvider (App.tsx)
  ├── Reads localStorage on mount → sets initial lang
  ├── Sets document.documentElement.lang + dir
  └── Provides { lang, dir, t(), setLang() } via context
```

### Adding a translation key

1. Add the key to `src/i18n/locales/en.ts` (source of truth).
2. TypeScript will produce a compile error in `ar.ts` until you add the matching Arabic key there too.

### Key structure

```typescript
const { t } = useI18n();
t('nav.home')                        // → 'Home' | 'الرئيسية'
t('auth.login.title')                // → 'Welcome back!' | 'مرحباً بعودتك!'
t('admin.nav.dashboard')             // → 'Dashboard' | 'لوحة التحكم'
t('errors.serverError.title')        // → 'Server Error' | 'خطأ في الخادم'
t('common.retry')                    // → 'Retry' | 'حاول مجدداً'
```

### Namespaces

| Namespace | Covers |
|---|---|
| `nav.*` | Shared navigation labels (storefront header) |
| `home.*` | Homepage hero, features, featured products |
| `products.*` | Products list page |
| `product.*` | Product detail page |
| `cart.*` | Cart page |
| `checkout.*` | Checkout page |
| `orders.*` | Orders page (including status labels) |
| `profile.*` | Profile page |
| `common.*` | Shared: loading, error, add, remove, cancel, retry, goHome… |
| `auth.login.*` | Login page |
| `auth.register.*` | Register page |
| `admin.nav.*` | Admin sidebar navigation |
| `admin.products.*` | Admin products table + forms |
| `admin.categories.*` | Admin categories page |
| `admin.orders.*` | Admin orders page |
| `admin.deleteModal.*` | Delete confirmation dialog |
| `admin.errorPlayground.*` | Error playground page |
| `errors.*` | ★ Global error system — 11 codes × (title + description) |

### `errors.*` namespace

Each of the 11 `ErrorCode` values maps to two keys:

```typescript
errors.orderNotFound.title       errors.orderNotFound.description
errors.productNotFound.title     errors.productNotFound.description
errors.unauthorized.title        errors.unauthorized.description
errors.forbidden.title           errors.forbidden.description
errors.sessionExpired.title      errors.sessionExpired.description
errors.serverError.title         errors.serverError.description
errors.networkError.title        errors.networkError.description
errors.featureDisabled.title     errors.featureDisabled.description
errors.validationError.title     errors.validationError.description
errors.resourceNotFound.title    errors.resourceNotFound.description
errors.unknownError.title        errors.unknownError.description
```

### RTL (Right-to-Left)

When `lang === 'ar'`, `I18nProvider` sets `document.documentElement.dir = 'rtl'`. This causes the browser to automatically mirror flex layout, text alignment, and block flow.

```tsx
// Logical properties (preferred — works in both LTR and RTL)
className="ps-4"      // padding-inline-start (left in LTR, right in RTL)
className="me-2"      // margin-inline-end
className="start-0"   // left: 0 in LTR, right: 0 in RTL

// RTL variant (for specific overrides)
className="pl-4 rtl:pr-4 rtl:pl-0"
```

---

## 10. Theming

**Strategy:** Tailwind's `class` dark mode. `ThemeProvider` toggles the `dark` class on `<html>`.

```tsx
// theme.context.tsx
document.documentElement.classList.toggle('dark', theme === 'dark');
```

Preference is persisted to `localStorage` under `app-theme`. Applied before first render to prevent FOUC (Flash Of Unstyled Content).

**Usage:**

```tsx
const { theme, toggleTheme } = useTheme();
// theme === 'light' | 'dark'
```

In Tailwind classes, add `dark:` prefix for dark overrides:

```tsx
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
```

---

## 11. Routing & Guards

### Route tree

```
/login                   → AuthLayout             (public)
/register                → AuthLayout             (public)
/                        → UserLayout             (public)
/products                → UserLayout             (public)
/products/:slugId        → UserLayout             (public)
/cart                    → UserLayout             (public)
/checkout                → ProtectedRoute > UserLayout
/orders                  → ProtectedRoute > UserLayout
/profile                 → ProtectedRoute > UserLayout
/orders/:id              → ProtectedRoute > DeepLinkGuard(order) > UserLayout
/admin                   → redirect → /admin/dashboard
/admin/dashboard         → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products          → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products/create   → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products/:id/edit → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/categories        → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/orders            → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/error-playground  → ProtectedRoute > WhitelistGuard > RoleGuard > FeatureGuard > AdminLayout
/unauthorized            → standalone (public)
/error                   → standalone (public, accepts ?type= or code prop)
*                        → NotFound (catch-all)
```

### `ProtectedRoute`

Checks `useAuthStore().user`. If `null`, redirects to:

```
/login?targetUrl=<encodeURIComponent(pathname + search + hash)>
```

Also populates `state.from` for backward compatibility with any code reading `state.from`.

### `RoleGuard`

```tsx
<RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
```

Checks `user.role` against `allowedRoles`. Redirects to `/unauthorized` on failure.

### `WhitelistGuard`

Reads per-route rules from `src/config/whitelist.config.ts`. If no rule exists for the current path, renders `<Outlet />` immediately (passthrough).

If a rule is found, it checks in order:
1. `allowedRoles` — user's role must be in the list
2. `allowedUserIds` — user's `_id` must be in the list
3. `requiredFeatureFlags` — all listed flags must be `true` in `featureFlags`

On any failure: `handleRouteError('FORBIDDEN', { displayModeOverride: 'TOAST' })` + `<Navigate to={fallbackPath} />`.

**Whitelist config example:**

```typescript
// src/config/whitelist.config.ts
export const WHITELIST_CONFIG: Record<string, WhitelistRule> = {
  '/admin/error-playground': {
    allowedRoles: ['ADMIN'],
    requiredFeatureFlags: ['errorPlayground'],
  },
  '/admin/products': {
    allowedRoles: ['ADMIN', 'MANAGER'],
    matchPrefix: true,   // applies to /admin/products, /admin/products/create, etc.
  },
};
```

`findWhitelistRule(pathname)` returns the most specific matching rule: exact match first, then longest prefix match.

### `FeatureGuard`

```tsx
<FeatureGuard featureFlag="errorPlayground" showPageError>
```

Reads `useAuthStore((s) => s.featureFlags)[featureFlag]`. If `false` or missing:
- `showPageError` true → pushes `FEATURE_DISABLED` as `PAGE` error
- `showPageError` false (default) → pushes as `TOAST`

Then navigates to `fallbackPath` (default `/`).

### `DeepLinkGuard`

Used for deep links to specific resources (e.g. `/orders/:id`) where both ownership validation and feature flag checks are needed before rendering.

```tsx
<DeepLinkGuard resourceType="order" featureFlag="deepLinks" fallbackPath="/">
```

**Flow:**

1. Shows `<GlobalLoader show />` while validating.
2. Extracts the resource ID from `useParams()`.
3. Calls `checkResourceOwnership(resourceType, id, user._id)` (async, mock — replace with real API call).
4. Optionally checks a feature flag.
5. On failure: pushes appropriate error code → navigates to `fallbackPath`.
6. On success: renders `<Outlet />`.

Uses the `cancelled` ref pattern in `useEffect` cleanup to prevent state updates after unmount.

| Validation result | Error code pushed | Navigation |
|---|---|---|
| Resource not found | `RESOURCE_NOT_FOUND` | `fallbackPath` |
| User does not own resource | `FORBIDDEN` | `fallbackPath` |
| Feature flag disabled | `FEATURE_DISABLED` | `fallbackPath` |
| Valid | — | Renders `<Outlet />` |

### Lazy loading

Every page component is loaded via `React.lazy()`. The `Page` helper in `AppRouter.tsx` wraps each with `<Suspense fallback={<GlobalLoader show />}>` so the GlobalLoader also shows during chunk download:

```typescript
const Page = ({ component: C }: { component: ComponentType }) => (
  <Suspense fallback={<GlobalLoader show />}>
    <C />
  </Suspense>
);

const ProductsPage = lazy(() => import('@/pages/user/ProductsPage'));
// used as: <Page component={ProductsPage} />
```

---

## 12. Global Error System

The error system provides centralized, structured error handling with four display modes. All errors flow through a single Zustand store and are rendered by `GlobalErrorRenderer`.

### Type system (`src/core/errors/error.types.ts`)

```typescript
// 11 error codes — string literal union (not enum, for erasableSyntaxOnly compat)
export type ErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'FEATURE_DISABLED'
  | 'VALIDATION_ERROR'
  | 'SESSION_EXPIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'UNKNOWN_ERROR';

export type ErrorDisplayMode = 'PAGE' | 'INLINE' | 'MODAL' | 'TOAST';

export type ErrorConfig = {
  displayMode: ErrorDisplayMode;
  iconName: string;               // Lucide icon name
  iconBgClass: string;            // Tailwind bg color
  iconColorClass: string;         // Tailwind text/stroke color
  titleKey: string;               // i18n key, e.g. 'errors.serverError.title'
  descriptionKey: string;
  primaryAction?: ErrorActionButton;
  secondaryAction?: ErrorActionButton;
};

export type ActiveError = {
  id: string;                     // crypto.randomUUID()
  code: ErrorCode;
  config: ErrorConfig;
  displayMode: ErrorDisplayMode;
  dismissible: boolean;
  onRetry?: () => void;
  timestamp: number;
  duration: number;               // ms; non-zero only for TOAST
};

export type PushErrorOptions = {
  displayModeOverride?: ErrorDisplayMode;
  dismissible?: boolean;
  onRetry?: () => void;
  duration?: number;
};
```

### Config map (`src/core/errors/error.config.ts`)

Maps every `ErrorCode` to a full `ErrorConfig`:

```typescript
export const ERROR_CONFIG_MAP: Record<ErrorCode, ErrorConfig> = {
  ORDER_NOT_FOUND: {
    displayMode: 'PAGE',
    iconName: 'PackageSearch',
    titleKey: 'errors.orderNotFound.title',
    // ...
  },
  SERVER_ERROR: {
    displayMode: 'PAGE',
    iconName: 'ServerCrash',
    // ...
  },
  // ... 9 more entries
};
```

### Pushing errors

From anywhere in the app:

```typescript
import { useErrorStore } from '@/core/errors/error.store';

// Basic — uses the code's default display mode
useErrorStore.getState().pushError('ORDER_NOT_FOUND');

// Override display mode
useErrorStore.getState().pushError('SERVER_ERROR', {
  displayModeOverride: 'TOAST',
  onRetry: () => refetch(),
});

// With custom duration (TOAST only)
useErrorStore.getState().pushError('VALIDATION_ERROR', {
  displayModeOverride: 'TOAST',
  duration: 6000,
});
```

From guards/handlers:

```typescript
import { handleRouteError } from '@/core/errors/error.handler';

handleRouteError('FORBIDDEN', { displayModeOverride: 'TOAST' });
```

### Display modes

| Mode | Behavior | Z-index | Dismissed by |
|---|---|---|---|
| `PAGE` | Fullscreen overlay — replaces all content | `z-[9990]` | `clearPageError()` or primary action |
| `MODAL` | Dialog overlay with backdrop | `z-[9995]` | Escape key, dismiss button, or primary action |
| `TOAST` | Bottom-right stack — auto-dismisses | `z-[9999]` | `removeToast(id)` after `duration` ms |
| `INLINE` | Component-level — not rendered by GlobalErrorRenderer | — | `clearInlineError()` |

**Why separate slots (not a single queue)?** Toasts can coexist — a queue makes sense. Only one PAGE or MODAL error should be active at a time. A new PAGE error always replaces the previous one (the new error is always more relevant).

### `GlobalErrorRenderer`

Mounted once in `App.tsx`. Uses `createPortal` to render into `document.body` above all z-layers:

```tsx
// App.tsx
<GlobalErrorRenderer />
```

Internal structure:

```
GlobalErrorRenderer
  ├── PageErrorOverlay   — if pageError ≠ null
  ├── ModalErrorDialog   — if modalError ≠ null
  └── ToastContainer     — always mounted; renders ToastItem for each in toastQueue
```

Toast auto-dismiss: each `ToastItem` runs `useEffect(() => { setTimeout(removeToast, duration) }, [])`.

Modal: Escape key listener + focus trap (primary action button auto-focuses on mount).

### `error.handler.ts`

```typescript
// Resolve an Axios error to an ErrorCode
resolveErrorCode(rawError: unknown, normalized: NormalizedError): ErrorCode

// Push to error store (used by Axios interceptor)
handleApiError(rawError, normalized, options?: PushErrorOptions): void

// Convenience for guards (skips Axios-specific resolution)
handleRouteError(code: ErrorCode, options?: PushErrorOptions): void
```

`resolveErrorCode` priority:
1. `response.data.errorCode` — backend-provided string code (maps via `BACKEND_ERROR_CODE_MAP`)
2. HTTP status: `401 → SESSION_EXPIRED`, `403 → FORBIDDEN`, `404 → RESOURCE_NOT_FOUND`, `5xx → SERVER_ERROR`
3. Normalized type: `network → NETWORK_ERROR`
4. Fallback: `UNKNOWN_ERROR`

### INLINE errors

INLINE errors are NOT rendered by `GlobalErrorRenderer`. The component must subscribe directly:

```tsx
const inlineError = useErrorStore((s) => s.inlineError);

if (inlineError) {
  return <AlertBanner message={t(inlineError.config.titleKey)} />;
}
```

---

## 13. CMS Content Service

### Overview

`useContent()` in `src/core/content/content.service.ts` abstracts content retrieval. The mode is controlled by `VITE_CONTENT_MODE` at build time.

```typescript
const { getContent, prefetch, isLoading, mode } = useContent();

return <h1>{getContent('home.hero.title')}</h1>;
```

### Modes

| Mode | `VITE_CONTENT_MODE` | Behavior |
|---|---|---|
| LOCAL | `LOCAL` | Synchronous — delegates to `t(key, fallback)` from `useI18n()` |
| CMS | `CMS` | Async — fetches from `GET ${VITE_CMS_ENDPOINT}?key=<key>&lang=<lang>` |

### CMS mode detail

- **Cache hit** (in-memory `Map<"key:lang", string>`): returns immediately, no fetch.
- **Cache miss**: returns the i18n fallback immediately (no loading flash) + triggers a background fetch.
- After fetch resolves: updates cache, triggers re-render with CMS content.
- **Parallel fetches**: a `pendingFetches: Set<string>` prevents duplicate in-flight requests for the same key.
- **Fetch failure**: silently keeps the i18n fallback (graceful degradation).
- **Cache TTL**: none — cache is session-scoped (resets on page reload).

### `prefetch`

```typescript
const { prefetch } = useContent();

// Warm up the cache for a key before the user navigates to that page
prefetch('home.hero.title');
```

### isLoading

`isLoading` is `true` when at least one CMS fetch is in-flight. Use sparingly — components should rely on the i18n fallback during loading rather than showing a spinner.

---

## 14. Error Boundary

`src/core/errors/ErrorBoundary.tsx` is a React class component that catches render-time errors (`componentDidCatch`) and prevents white-screen crashes.

### Usage

```tsx
// Wrapping a layout — auto-resets on route change
<ErrorBoundary resetKey={location.pathname} onError={(err, info) => sentry.capture(err, info)}>
  <UserLayout />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<MyCustomFallback />}>
  <RiskyComponent />
</ErrorBoundary>

// Fallback as render function (receives error and reset)
<ErrorBoundary fallback={(error, reset) => <button onClick={reset}>Retry: {error.message}</button>}>
  <RiskyComponent />
</ErrorBoundary>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | — | Content to protect. |
| `resetKey` | `string \| number` | — | When this value changes, the boundary resets and re-renders children. Use `location.pathname`. |
| `fallback` | `ReactNode \| ((error, reset) => ReactNode)` | Default UI | Custom error fallback. |
| `onError` | `(error, info) => void` | — | Callback for Sentry/analytics. |

### Auto-reset on route change

`AppRouter.tsx` passes `resetKey={location.pathname}` so navigating to a different page always clears the error state:

```tsx
<ErrorBoundary resetKey={location.pathname}>
  <AdminLayout />
</ErrorBoundary>
```

### Default fallback

Shows a centered card with error message. In DEV mode, also renders the full stack trace in a `<pre>` block for debugging. In production, only user-friendly copy is shown.

---

## 15. Feature Flags

Feature flags gate experimental features at the route, component, and code level.

### Storage

```typescript
// auth.store.ts
featureFlags: Record<string, boolean>
// Persisted to localStorage 'auth-feature-flags'
```

### Reading a flag

```typescript
const flags = useAuthStore((s) => s.featureFlags);
if (flags.errorPlayground) { /* ... */ }
```

### Setting flags

```typescript
// After login (from API response)
useAuthStore.getState().setFeatureFlags({ errorPlayground: true, newCheckout: false });

// Merges — does not replace
useAuthStore.getState().setFeatureFlags({ newCheckout: true });
// result: { errorPlayground: true, newCheckout: true }
```

### DEV defaults

In DEV mode (`import.meta.env.DEV`), the `defaultFeatureFlags()` function returns:

```typescript
{ errorPlayground: true }
```

This means developers can access `/admin/error-playground` without a backend that sets flags. In production, `defaultFeatureFlags()` returns `{}`.

### Route-level gating

Use `FeatureGuard` in the route tree (see [Section 11](#11-routing--guards)).

### Component-level gating

```tsx
const { errorPlayground } = useAuthStore((s) => s.featureFlags);

return errorPlayground ? <ErrorPlaygroundLink /> : null;
```

### Error Playground — live flag toggles

`ErrorPlaygroundPage.tsx` renders a toggle panel for every flag in the current `featureFlags` object. Changes are immediately written to the store via `setFeatureFlags()` and are reflected by all guards in real time — useful for testing guard behavior without backend changes.

---

## 16. Mobile Navigation

`UserLayout` supports two mobile nav styles, toggled by the `PanelLeft` / `AlignJustify` icon button in the header. The preference is persisted in `localStorage` under `mobileNavStyle`.

### Dropdown (default)

A panel slides down below the sticky header when the hamburger is tapped. Compact; keeps the page partially visible behind the menu.

```
┌─────────────── Header ───────────────┐
│ Logo    [🌙] [🌐] [🛒] [👤] [⊞] [☰] │
├──────────────────────────────────────┤
│  Home                                │  ← dropdown panel
│  Products                            │
│  Orders                              │
│  Profile                             │
│  Sign out                            │
└──────────────────────────────────────┘
```

### Sidebar

A full-height drawer slides from the leading edge (left in LTR, right in RTL) with a semi-transparent backdrop. Better for apps with many nav items or when a more "app-like" feel is desired.

```
┌──────────┬─────────────── Header ────┐
│  Logo  ✕ │ [🌙] [🌐] [🛒] [👤] [☰] │
├──────────┤                           │
│  Home    │   Page content            │
│  Products│                           │
│  Orders  │                           │
│  Profile │                           │
├──────────┤                           │
│  Avatar  │                           │
│  Sign out│                           │
└──────────┴───────────────────────────┘
```

**Toggle button:** The `PanelLeft` icon (→ sidebar mode) / `AlignJustify` icon (→ dropdown mode) switches between styles without opening/closing the menu.

---

## 17. Global Loader

`GlobalLoader` is a fullscreen overlay mounted once in `App.tsx` above the router. It is invisible (`opacity-0`) when no API request is in-flight and fades in (`opacity-100`) when one or more requests are active.

### How it works

```
Axios request starts
  → axios.ts interceptor increments ui.store.activeApiRequestsCount
  → GlobalLoader re-renders: isLoading = (count > 0) = true → opacity-100

Axios request settles (success or error)
  → interceptor decrements count
  → if count reaches 0: GlobalLoader fades out
```

### Opting out

For requests that already have their own skeleton/loading state:

```typescript
api.get('/products', { showGlobalLoader: false });
```

### Suspense fallback

`GlobalLoader` also accepts a `show` prop for use as a `<Suspense>` fallback during lazy chunk loading and during `DeepLinkGuard` async validation:

```tsx
<Suspense fallback={<GlobalLoader show />}>
  <LazyPage />
</Suspense>
```

---

## 18. Type Definitions

### `auth.types.ts`

```typescript
type Role = 'CUSTOMER' | 'ADMIN' | 'MANAGER';

type UserType = {
  _id: string;
  username: string;
  email: string;
  role: Role;
  permissions?: string[];   // optional fine-grained permissions
};
```

### `product.types.ts`

```typescript
type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category?: ProductCategory;
  mainImage?: { url: string; publicId: string };
  images?: Array<{ url: string; publicId: string }>;
  createdAt: string;
};

type PaginatedData<T> = {
  data: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
```

### `cart.types.ts`

```typescript
type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};
```

---

## 19. Utilities

### `utils/slug.ts` — `extractProductId(slugId)`

Parses the combined `<slug>-<ObjectId>` URL param and returns the 24-character ObjectId for API calls.

```typescript
extractProductId('nike-air-max-270-64c8f1234567890123456789')
// → '64c8f1234567890123456789'

extractProductId('64c8f1234567890123456789') // legacy pure-ID URL
// → '64c8f1234567890123456789'
```

### `utils/normalizeApiError.ts`

Extracts a human-readable error message from an Axios error object, falling back to a default string. Also used by `error.handler.ts` as input for `resolveErrorCode()`.

### `utils/cookie.service.ts`

Thin wrapper around `js-cookie` for managing the auth refresh token cookie:

```typescript
cookieService.getToken()     // → string | undefined
cookieService.setToken(val)  // sets cookie with Secure + SameSite=Strict
cookieService.removeToken()  // removes the cookie
```

### `utils/prefetch.ts`

Pre-fetches lazy chunks before the user navigates to improve perceived performance:

```typescript
// Called on login for ADMIN/MANAGER users so admin dashboard loads instantly
prefetchAdminDashboard(); // triggers import('@/pages/admin/ProductsListPage')
```

### `hooks/useDebounce.ts`

```typescript
const debouncedValue = useDebounce(value, 400); // delays by 400ms
```

Used in search inputs to avoid sending a request on every keystroke.

### `hooks/useCartMerge.ts`

Called after successful login. Sends the localStorage cart items to the server cart endpoint, then clears the local cart. Runs once per session.

### `hooks/useWishlistSync.ts`

Called after successful login. Reads the local wishlist from the store and pushes each item to the server wishlist API.

---

## 20. Configuration Files

### `tailwind.config.js`

```javascript
darkMode: 'class',           // Toggle by adding 'dark' to <html>
colors: {
  gray: { 750: '#2d3748' }   // Custom shade for dark sidebar rows
},
plugins: [animate]           // tailwindcss-animate for transitions
```

### `tsconfig.app.json`

Key settings:
- `"strict": true` — all strict TypeScript checks enabled
- `"erasableSyntaxOnly": true` — disallows `enum`, `namespace` (use const objects / string literal unions)
- `"paths": { "@/*": ["./src/*"] }` — `@/` alias for `src/`
- `"moduleResolution": "bundler"` — Vite-compatible resolution

### `vite.config.ts`

Uses `vite-tsconfig-paths` plugin so `@/` path aliases work without Vite-specific config duplication.

### `.env` files

| File | Purpose |
|---|---|
| `.env` | Shared: Firebase config, API base URL |
| `.env.local` | DEV override: `VITE_CONTENT_MODE=LOCAL` |
| `.env.production` | Production: `VITE_CONTENT_MODE=CMS`, `VITE_CMS_ENDPOINT=<url>` |

### `.hintrc`

Webhint configuration for browser compatibility and accessibility linting.

---

## 21. Development Guidelines

### Adding a new page

1. Create the component in `src/pages/<module>/MyPage.tsx`.
2. Add a `React.lazy()` import in `AppRouter.tsx`.
3. Add the route inside the appropriate layout group as `<Page component={MyPage} />`.
4. If auth is required, wrap with `<ProtectedRoute>`.
5. If role-restricted, add a `WhitelistRule` entry in `whitelist.config.ts`.
6. Add any new translation keys to `en.ts` → TypeScript will enforce `ar.ts` parity.

### Adding a new API call

1. Add the function to the relevant `src/api/*.api.ts` file.
2. The shared Axios instance handles auth headers, GlobalLoader, and global error handling automatically.
3. If the endpoint already has a skeleton, pass `showGlobalLoader: false`.
4. For endpoints where you want to handle errors locally, pass `skipGlobalErrorHandler: true`.

### Adding a new translation key

1. Add to `src/i18n/locales/en.ts` with an English value.
2. TypeScript will error in `ar.ts` until you add the Arabic equivalent.
3. Use `t('your.key')` in any component that calls `useI18n()`.

### Adding a new error code

1. Add the string literal to the `ErrorCode` union in `error.types.ts`.
2. Add an `ErrorConfig` entry to `ERROR_CONFIG_MAP` in `error.config.ts`.
3. Add `errors.<camelCase>.title` and `errors.<camelCase>.description` to `en.ts` and `ar.ts`.
4. Push the error anywhere with `useErrorStore.getState().pushError('YOUR_NEW_CODE')`.

### Adding a new feature flag

1. Add the flag name to the `defaultFeatureFlags()` return value in `auth.store.ts` if it should be enabled in DEV by default.
2. Gate the route with `<FeatureGuard featureFlag="yourFlag">` in `AppRouter.tsx`.
3. Gate UI elements with `const flags = useAuthStore((s) => s.featureFlags); if (flags.yourFlag) { ... }`.
4. The Error Playground will automatically show a toggle for the new flag.

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `ProductCard.tsx` |
| Hooks | camelCase + `use` prefix | `useDebounce.ts` |
| Stores | camelCase + `.store.ts` | `cart.store.ts` |
| API modules | camelCase + `.api.ts` | `products.api.ts` |
| Types | camelCase + `.types.ts` | `product.types.ts` |
| Schemas | camelCase + `.schema.ts` | `login.schema.ts` |
| i18n keys | nested dot-notation | `admin.products.newProduct` |
| Error codes | SCREAMING_SNAKE_CASE | `ORDER_NOT_FOUND` |
| Feature flags | camelCase | `errorPlayground` |

### Do not

- Store access tokens in `localStorage` — keep them in memory (auth store).
- Commit `.env` files with real credentials — use `.env.example` for documentation.
- Import from `src/` using relative paths — always use `@/` alias.
- Use `any` — prefer `unknown` or properly typed generics.
- Use `enum` — use string literal union types (TypeScript `erasableSyntaxOnly` constraint).
- Add hardcoded English strings to UI components — use `t('key')` instead.
- Call `window.location.assign()` for error navigation — push to the error store instead.
- Import `error.store` from inside `auth.store` or vice versa — keep store dependencies one-directional.
