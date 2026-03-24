# ShopHub — Technical Reference Documentation

> A production-ready, bilingual (English/Arabic, LTR/RTL) e-commerce SPA with a full admin panel, enterprise-grade routing guards, a global error system, Angular-style environments, and a CMS-ready content pipeline.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Project Structure](#4-project-structure)
5. [Environments System](#5-environments-system)
6. [Application Bootstrap](#6-application-bootstrap)
7. [Internationalisation (i18n)](#7-internationalisation-i18n)
8. [Theming](#8-theming)
9. [Routing Architecture](#9-routing-architecture)
10. [Authentication & Auth Store](#10-authentication--auth-store)
11. [API Layer](#11-api-layer)
12. [State Management](#12-state-management)
13. [Global Error System](#13-global-error-system)
14. [App Initialization Gate](#14-app-initialization-gate)
15. [CMS Content Service](#15-cms-content-service)
16. [Feature Flags](#16-feature-flags)
17. [Layouts](#17-layouts)
18. [Admin Panel Pages](#18-admin-panel-pages)
19. [User Storefront Pages](#19-user-storefront-pages)
20. [Shared Components](#20-shared-components)
21. [Form Validation](#21-form-validation)
22. [Mock Server](#22-mock-server)
23. [Build & Bundle Splitting](#23-build--bundle-splitting)
24. [Cart Persistence & Wishlist Sync](#24-cart-persistence--wishlist-sync)
25. [Development Guidelines](#25-development-guidelines)
26. [WebSocket Realtime Architecture](#26-websocket-realtime-architecture)
27. [Performance Optimisation (Lighthouse)](#27-performance-optimisation-lighthouse)
28. [Dynamic Page Titles & Meta Tags](#28-dynamic-page-titles--meta-tags)

---

## 1. Project Overview

**ShopHub** is a bilingual e-commerce single-page application built with React 19, TypeScript, and Vite. It ships two distinct surfaces:

- **User Storefront** — public and authenticated shopping pages (home, product catalog, cart, wishlist, checkout, orders, profile).
- **Admin Panel** — protected dashboard for managing products, categories, and orders (role-gated to `ADMIN` / `MANAGER`).

### Key capabilities

| Capability | Detail |
|---|---|
| Bilingual UI | Full English + Arabic with automatic RTL layout switching |
| Guard stack | ProtectedRoute → WhitelistGuard → RoleGuard → FeatureGuard → DeepLinkGuard |
| Error system | Four display modes: PAGE, MODAL, TOAST, INLINE — driven by a typed error store |
| CMS content | Locale and error config bundles fetched at boot; backend-swappable at runtime |
| Auth | JWT access token (cookie) + silent refresh + feature flags per user |
| API switching | Mock (json-server) ↔ real backend via `VITE_API_SOURCE` |
| Code splitting | Every page is `React.lazy()` — ~70% smaller initial bundle |
| Environments | Angular-style typed `environment.ts` / `environment.prod.ts` wrappers |

---

## 2. Tech Stack

### Runtime dependencies

| Package | Version | Role |
|---|---|---|
| `react` | ^19.2 | UI framework |
| `react-dom` | ^19.2 | DOM renderer |
| `react-router-dom` | ^7.13 | Client-side routing |
| `zustand` | ^5.0 | Global state management |
| `axios` | ^1.13 | HTTP client |
| `react-hook-form` | ^7.71 | Form state & validation |
| `@hookform/resolvers` | ^5.2 | Zod adapter for RHF |
| `zod` | ^4.3 | Schema-based validation |
| `firebase` | ^12.10 | Social auth (Google, Facebook, Microsoft) |
| `js-cookie` | ^3.0 | JWT cookie management |
| `lucide-react` | ^0.577 | Icon library |
| `tailwind-merge` | ^3.4 | Conditional Tailwind class merging |
| `tailwindcss-animate` | ^1.0 | Animation utilities |

### Dev dependencies

| Package | Role |
|---|---|
| `vite` ^8 | Dev server + bundler |
| `@vitejs/plugin-react` | Fast Refresh, JSX transform |
| `vite-tsconfig-paths` | `@/` path alias resolution |
| `typescript` ~5.9 | Type checking |
| `tailwindcss` ^3.4 | Utility-first CSS |
| `eslint` + `typescript-eslint` | Linting |
| `json-server` ^0.17 | Mock REST API backend |
| `concurrently` | Run Vite + json-server in parallel |

---

## 3. Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
npm install
```

### Environment setup

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
# API routing strategy: 'mock' (json-server) or 'real' (backend)
VITE_API_SOURCE=mock

# Content bundle source: 'local' (json-server) or 'backend' (CMS)
VITE_CONTENT_SOURCE=local

# Backend base URL (only used when VITE_API_SOURCE=real)
VITE_LOGIN_AUTH_URL=https://api.freeapi.app/api/v1

# Mock server URL (only used in development)
VITE_MOCK_SERVER_URL=http://localhost:3001

# Firebase credentials (required for social login)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### NPM scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server only |
| `npm run dev:mock` | json-server mock backend only |
| `npm run dev:all` | Both Vite + json-server in parallel (recommended for local development) |
| `npm run build` | TypeScript compile → Vite production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint code quality check |

### Development workflow

For full local development with mock APIs:

```bash
npm run dev:all
```

This starts:
- Vite dev server at `http://localhost:5173`
- json-server at `http://localhost:3001`

Vite's proxy forwards `/api/v1/*` and `/content/*` to json-server automatically.

---

## 4. Project Structure

```
react-auth/
├── mock-server/            # json-server configuration + fixture data
│   └── server.cjs
├── public/                 # Static assets
├── src/
│   ├── api/                # Axios API modules (one file per domain)
│   │   ├── base/
│   │   │   └── axios.ts        # Axios instance factory + interceptors
│   │   ├── auth.api.ts
│   │   ├── cart.api.ts
│   │   ├── categories.api.ts
│   │   ├── orders.api.ts
│   │   ├── products.api.ts
│   │   └── wishlist.api.ts
│   ├── components/
│   │   ├── admin/
│   │   │   └── DeleteModal.tsx
│   │   ├── auth/               # Login/Register shared UI
│   │   │   ├── Divider.tsx
│   │   │   ├── common/         # Error notification, icons, spinner
│   │   │   └── social-media-auth/
│   │   ├── common/
│   │   │   └── GlobalLoader.tsx
│   │   ├── form/
│   │   │   └── input/          # FormInputControl (RHF-connected input)
│   │   └── ui/
│   │       ├── InitSkeleton.tsx  # Boot skeleton (shown while AppInitializer loads)
│   │       └── Skeleton.tsx
│   ├── config/
│   │   ├── Define.ts           # Axios instance export (uses environment.ts)
│   │   ├── firebase.ts         # Firebase app config (uses environment.ts)
│   │   └── whitelist.config.ts # Fine-grained route access rules
│   ├── core/
│   │   ├── content/
│   │   │   └── content.service.ts
│   │   ├── errors/             # Global error system
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── GlobalErrorRenderer.tsx
│   │   │   ├── default-error.ts
│   │   │   ├── error.config.ts
│   │   │   ├── error.handler.ts
│   │   │   ├── error.store.ts
│   │   │   └── error.types.ts
│   │   └── init/               # App initialization gate
│   │       ├── AppInitializer.tsx
│   │       ├── init.service.ts
│   │       └── init.store.ts
│   ├── environments/           # Angular-style typed environment config
│   │   ├── environment.ts      # Development environment (default)
│   │   └── environment.prod.ts # Production environment documentation
│   ├── hooks/                  # Custom React hooks
│   │   ├── useCartMerge.ts
│   │   ├── useDebounce.ts
│   │   ├── useSocialAuth.ts
│   │   └── useWishlistSync.ts
│   ├── i18n/                   # Internationalisation
│   │   ├── i18n.context.tsx    # I18nProvider + useI18n hook
│   │   └── locales/
│   │       ├── en.ts           # Static English locale (TypeScript)
│   │       ├── ar.ts           # Static Arabic locale (TypeScript)
│   │       ├── default-en.ts   # Dynamic English bundle (CMS-fetched)
│   │       └── default-ar.ts   # Dynamic Arabic bundle (CMS-fetched)
│   ├── layouts/
│   │   ├── AdminLayout.tsx     # Admin sidebar shell
│   │   ├── AuthLayout.tsx      # Centered auth card shell
│   │   └── UserLayout.tsx      # Storefront header + footer shell
│   ├── pages/
│   │   ├── Error.tsx
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   ├── Register.tsx
│   │   ├── Unauthorized.tsx
│   │   ├── admin/
│   │   │   ├── AdminOrdersPage.tsx
│   │   │   ├── CategoriesPage.tsx
│   │   │   ├── CreateProductPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EditProductPage.tsx
│   │   │   ├── ErrorPlaygroundPage.tsx
│   │   │   ├── ProductsListPage.tsx
│   │   │   └── RealtimeChatPage.tsx    # ★ WebSocket team chat demo
│   │   └── user/
│   │       ├── CartPage.tsx
│   │       ├── CheckoutPage.tsx
│   │       ├── HomePage.tsx
│   │       ├── OrdersPage.tsx
│   │       ├── ProductDetailPage.tsx
│   │       ├── ProductsPage.tsx
│   │       ├── ProfilePage.tsx
│   │       └── WishlistPage.tsx
│   ├── routes/
│   │   ├── AppRouter.tsx       # Full route tree with lazy loading
│   │   ├── DeepLinkGuard.tsx   # Async resource ownership guard
│   │   ├── FeatureGuard.tsx    # Feature flag guard
│   │   ├── ProtectedRoute.tsx  # Authentication guard
│   │   ├── RoleGuard.tsx       # Role-based access guard
│   │   └── WhitelistGuard.tsx  # Fine-grained path access guard
│   ├── schemas/                # Zod validation schemas
│   │   ├── checkout.schema.ts
│   │   ├── login.schema.ts
│   │   ├── product.schema.ts
│   │   └── register.schema.ts
│   ├── features/
│   │   └── realtime/           # ★ WebSocket realtime layer
│   │       ├── types/
│   │       │   └── socket.types.ts      # Event envelopes, payloads, status types
│   │       ├── socket/
│   │       │   └── socket.manager.ts    # Singleton manager (reconnect, heartbeat, queue, mock)
│   │       ├── store/
│   │       │   └── realtime.store.ts    # Zustand: rooms, messages, presence, notifications
│   │       ├── hooks/
│   │       │   └── useAdminSocket.ts    # React hook: status / sendMessage / subscribe
│   │       └── providers/
│   │           └── RealtimeProvider.tsx # Lifecycle: connect on admin mount
│   ├── store/                  # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── cart.store.ts
│   │   ├── ui.store.ts
│   │   └── wishlist.store.ts
│   ├── themes/
│   │   └── theme.context.tsx   # ThemeProvider + useTheme hook
│   ├── types/
│   │   └── auth.types.ts
│   ├── utils/
│   │   ├── cookie.service.ts
│   │   ├── normalizeApiError.ts
│   │   └── ...
│   ├── App.tsx                 # Provider composition root
│   └── main.tsx                # React DOM entry point
├── .env                        # Base environment variables
├── .env.local                  # Local overrides (git-ignored)
├── .env.production             # Production environment (git-ignored)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 5. Environments System

The project uses an **Angular-style environments pattern** to centralize all `import.meta.env.*` reads into typed TypeScript files, eliminating scattered env reads throughout the codebase.

### Files

| File | Purpose |
|---|---|
| `src/environments/environment.ts` | Development environment — reads from `.env` / `.env.local` |
| `src/environments/environment.prod.ts` | Production documentation — documents required `.env.production` variables |

### `Environment` interface

```ts
export interface Environment {
  production: boolean;           // true only in `vite build`
  apiSource: 'mock' | 'real';   // API routing strategy
  apiUrl: string;                // Backend base URL
  contentSource: 'local' | 'backend'; // CMS bundle strategy
  mockServerUrl: string;         // json-server URL (dev only)
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}
```

### Usage

```ts
import { environment } from '@/environments/environment';

if (environment.production) { ... }
const baseUrl = environment.apiUrl;
```

### How Vite resolves environment variables

| File | When loaded |
|---|---|
| `.env` | Always (base values) |
| `.env.local` | Local dev overrides (git-ignored) |
| `.env.production` | `vite build` only |

> The `.env*` files at the project root are the source of truth for runtime values. The TypeScript `environment.ts` files are **typed wrappers** — they provide autocompletion and compile-time safety. They do not move or replace the Vite `.env` files.

### Consumers

All code that needs environment values imports from `@/environments/environment`:

- `src/config/Define.ts` — chooses mock vs real API base URL
- `src/config/firebase.ts` — Firebase app initialization
- `src/core/init/init.service.ts` — content bundle strategy (`local` vs `backend`)

---

## 6. Application Bootstrap

Provider wrapping order in `App.tsx` (outer → inner):

```
I18nProvider          ← language + RTL (reads localStorage on mount)
  ThemeProvider       ← dark / light theme (reads localStorage on mount)
    AppInitializer    ← blocks router until locale + error config bundles load
      ErrorBoundary   ← top-level render-error safety net
        GlobalLoader  ← fullscreen API spinner (z-9999)
        GlobalErrorRenderer ← error PAGE / MODAL / TOAST overlays
        AppRouter     ← full route tree (only mounts when AppInitializer.isReady)
```

**Why this order matters:**

1. `I18nProvider` and `ThemeProvider` run first so `dir`, `lang`, and the `dark` class are applied to `<html>` synchronously — preventing layout flash before any paint.
2. `AppInitializer` gate ensures all locale strings and error config are available before any page renders.
3. `GlobalLoader` and `GlobalErrorRenderer` sit above the router so they overlay all page content.

---

## 7. Internationalisation (i18n)

### Architecture

```
useI18n()                    ← React hook (any component)
  I18nProvider               ← React Context (wraps App)
    i18n.context.tsx         ← provider + hook + resolve()
      LOCALES (static)       ← en.ts / ar.ts (always available)
      dynamicLocales (store) ← useInitStore — CMS-fetched bundles
        init.store.ts
```

The translation function is named `translate` (Angular `translate` pipe convention):

```tsx
const { translate, lang, setLang, dir } = useI18n();

<h1>{translate('home.hero.title')}</h1>
<button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
  {translate('nav.language')}
</button>
```

### Key resolution

Keys are dot-notation paths into the locale object:

```ts
translate('nav.home')              // → 'Home' (en) | 'الرئيسية' (ar)
translate('admin.orders.title')    // → 'Orders' (en) | 'الطلبات' (ar)
translate('missing.key')           // → 'missing.key' (key itself as fallback)
translate('missing.key', 'N/A')    // → 'N/A' (explicit fallback)
```

The resolver walks the locale object by splitting the key on `.` and traversing each level. A missing key returns the fallback — no crash.

### Interpolation

The `translate()` function does not support interpolation arguments. For strings with dynamic values, use `.replace()` after calling `translate()`:

```ts
translate('admin.products.showing')
  .replace('{{from}}', String(startItem))
  .replace('{{to}}', String(endItem))
  .replace('{{total}}', String(totalItems))
// en locale: 'Showing {{from}}–{{to}} of {{total}}'
// → 'Showing 1–20 of 147'
```

### Dynamic bundles vs static bundles

| Bundle type | Source | When used |
|---|---|---|
| Static | `en.ts` / `ar.ts` (TypeScript imports) | Always available; fallback if CMS fetch fails |
| Dynamic | CMS/json-server via `fetchLocaleBundle()` | Loaded at boot by `AppInitializer`; overrides static |

The translate function tries the dynamic bundle first, then falls back to the static bundle. This means static bundles always have the latest keys (added during development), while the dynamic bundle provides server-overridable copy.

### RTL layout

When `lang === 'ar'`:
1. `document.documentElement.dir = 'rtl'` — browser mirrors block layout automatically
2. `document.documentElement.lang = 'ar'` — screen readers use Arabic phoneme rules
3. Tailwind `rtl:` variants are available for fine-grained overrides

### Locale files

| File | Purpose |
|---|---|
| `src/i18n/locales/en.ts` | Static English locale (always bundled) |
| `src/i18n/locales/ar.ts` | Static Arabic locale (always bundled) |
| `src/i18n/locales/default-en.ts` | Dynamic English bundle served via CMS / json-server |
| `src/i18n/locales/default-ar.ts` | Dynamic Arabic bundle served via CMS / json-server |

`default-en.ts` exports a `Locale` type that TypeScript enforces across all locale files — add a key to `default-en.ts` and the compiler immediately flags any locale file that doesn't have it.

### Locale key structure

```
nav.*            Navigation links (home, products, orders, etc.)
common.*         Shared UI labels (lightMode, darkMode, etc.)
auth.*           Login / Register page strings
home.*           Storefront home page
products.*       Product catalog + product detail
cart.*           Shopping cart
wishlist.*       Wishlist
checkout.*       Checkout form + confirmation
orders.*         User orders list + detail
profile.*        User profile page
admin.dashboard.*  Admin dashboard
admin.products.*   Admin products management
admin.categories.* Admin categories management
admin.orders.*     Admin orders management
errors.*         Global error messages (PAGE / MODAL / TOAST content)
```

### Adding a new translation key

1. Add the key to `src/i18n/locales/default-en.ts` (TypeScript will enforce it elsewhere)
2. Add the Arabic translation to `src/i18n/locales/default-ar.ts`
3. Add the same key to `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts` (static bundles)
4. Use `translate('your.key')` in the component

---

## 8. Theming

Theme support is provided by `src/themes/theme.context.tsx` using the same React Context pattern as i18n.

### Supported themes

- `light` — default, white/gray palette
- `dark` — dark gray/slate palette
- `custom` — extensible third variant (hook exposes current theme name)

### Usage

```tsx
import { useTheme } from '@/themes/theme.context';

const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</button>
```

`toggleTheme` cycles: `light → dark → light`. The theme name is persisted to `localStorage` and the `dark` class is applied to `<html>` synchronously on mount to prevent FOUC.

### Tailwind dark mode

Tailwind is configured with `darkMode: 'class'`. All dark-mode styles use the `dark:` prefix:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

---

## 9. Routing Architecture

### Route tree overview

```
/login                        AuthLayout → Login
/register                     AuthLayout → Register

/                             UserLayout (ErrorBoundary)
/products                       → ProductsPage
/products/:slugId               → ProductDetailPage
/cart                           → CartPage
/wishlist                       → WishlistPage

  ProtectedRoute (auth required)
  /checkout                     → CheckoutPage
  /profile                      → ProfilePage
  /orders                       → OrdersPage
    DeepLinkGuard (ownership)
    /orders/:id                 → OrdersPage (detail view)

ProtectedRoute
  WhitelistGuard (config/whitelist.config.ts)
    RoleGuard (ADMIN | MANAGER)
      AdminLayout (ErrorBoundary) [RealtimeProvider wraps Outlet]
      /admin                    → redirect /admin/dashboard
      /admin/dashboard          → DashboardPage
      /admin/products           → ProductsListPage
      /admin/products/create    → CreateProductPage
      /admin/products/:id/edit  → EditProductPage
      /admin/categories         → CategoriesPage
      /admin/orders             → AdminOrdersPage
        FeatureGuard (realtimeChat flag)
        /admin/realtime-chat    → RealtimeChatPage
        FeatureGuard (errorPlayground flag)
        /admin/error-playground → ErrorPlaygroundPage

/unauthorized                 Unauthorized (no layout)
/error                        ErrorPage (no layout)
/*                            NotFound (catch-all)
```

### Guard stack explained

Guards are React Router layout routes (components that render `<Outlet />`). They compose by nesting — each outer guard runs before inner guards.

#### `ProtectedRoute`

Checks `useAuthStore().user !== null`. Redirects unauthenticated users to `/login?targetUrl=<encoded-path>`. After login, redirects back to the original URL.

```ts
// Redirect flow:
// User visits /checkout (unauthenticated)
//   → ProtectedRoute → /login?targetUrl=%2Fcheckout
//   → Login success  → navigate('/checkout', { replace: true })
```

#### `WhitelistGuard`

Reads `WHITELIST_CONFIG` from `src/config/whitelist.config.ts`. For each admin route, enforces `allowedRoles`, `allowedUserIds`, and `requiredFeatureFlags`. Redirects to `/unauthorized` on violation.

Rules support exact-path and prefix matching (`matchPrefix: true`).

#### `RoleGuard`

Checks `user.role` against an `allowedRoles` prop. Used for broad role access (ADMIN, MANAGER). Redirects to `/unauthorized`.

#### `FeatureGuard`

Checks `useAuthStore().featureFlags[featureFlag]`. Redirects to `/unauthorized` if the flag is false or absent.

```tsx
<FeatureGuard featureFlag="errorPlayground" />
```

#### `DeepLinkGuard`

Async ownership check. Reads `:id` from route params, calls a service to verify the resource belongs to the current user. Shows a loading state while the async check runs. Redirects to `/unauthorized` on failure.

```tsx
<DeepLinkGuard resourceType="order" />
```

### Code splitting

Every page is wrapped in `React.lazy()` + `<Suspense>`. The `<Page>` helper component handles this uniformly:

```tsx
function Page({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<GlobalLoader show />}>
      <Component />
    </Suspense>
  );
}
```

Each page's JavaScript is only downloaded when the user first visits that route, reducing the initial bundle by approximately 70%.

### Error Boundary per layout

Both `AdminLayout` and `UserLayout` are wrapped in an `ErrorBoundary` at the route level. Render-time JS errors inside a layout section show a fallback UI without crashing the entire application. The boundary resets automatically when the user navigates to a new route via `resetKey={location.pathname}`.

---

## 10. Authentication & Auth Store

**File:** `src/store/auth.store.ts`

### State

| Field | Type | Persistence | Description |
|---|---|---|---|
| `user` | `UserType \| null` | `localStorage` (`auth-user`) | Authenticated user — survives page refresh |
| `accessToken` | `string \| null` | In-memory only | Current JWT (cookie is authoritative) |
| `featureFlags` | `Record<string, boolean>` | `localStorage` (`auth-feature-flags`) | Per-user feature flags |

### Actions

| Action | Description |
|---|---|
| `setAuth(user, token)` | Called after successful login. Persists user, stores token in cookie. |
| `setAccessToken(token)` | Updates token after silent refresh. Does not update `user`. |
| `setFeatureFlags(flags)` | Replaces feature flags map. Called after login. |
| `logout()` | Clears all state, removes persisted data, clears cookie. Also calls `useCartStore.getState().clearCart()` and `useWishlistStore.getState().clearItems()` to clear frontend-only state. Server-side cart and wishlist are intentionally preserved so the user's items survive logout and are reloaded on next login. |

### Why persist `user` but not `accessToken`?

The access token is persisted in a browser cookie by `cookieService.setToken()`. The Axios request interceptor reads the token directly from the cookie on every request. Persisting `user` to `localStorage` ensures the store is initialized synchronously before any component renders — no auth flicker on hard refresh.

### Default feature flags (development)

In development builds (`import.meta.env.DEV`), `errorPlayground` is enabled so developers can access `/admin/error-playground` without a backend feature-flag API. All other flags default to `false`.

### Circular dependency prevention

`auth.store.ts` must NOT import `authUrl` from `src/config/Define.ts`. The Axios instance reads `useAuthStore.getState()` internally. Importing `api` into the store would create a circular module dependency that breaks Vite HMR and the production bundle.

`auth.store.ts` safely imports `useCartStore` and `useWishlistStore` (static ES imports) because neither of those stores imports `auth.store.ts`. The `logout()` action calls `useCartStore.getState().clearCart()` and `useWishlistStore.getState().clearItems()` imperatively — no React hook rules are violated since these are plain function calls outside the render cycle.

### Token refresh flow

```
Request → 401 → isRefreshing?
  YES → queue request → wait for refresh
  NO  → set isRefreshing = true
      → POST /users/refresh-token (withCredentials)
        SUCCESS → processQueue(null, newToken) → retry queued requests
        FAILURE → processQueue(error) → logout() → redirect /login
```

---

## 11. API Layer

### Axios instance factory

**File:** `src/api/base/axios.ts`

`createApiInstance(baseURL)` creates a configured Axios instance with five built-in cross-cutting concerns:

#### 1. Bearer token injection
Every outgoing request gets `Authorization: Bearer <token>` from the cookie.

#### 2. Global loading counter
Increments `useUiStore.activeApiRequestsCount` on request start, decrements on completion. Uses a counter (not boolean) so parallel requests work correctly.

Per-request opt-out:
```ts
authUrl.get('/endpoint', { showGlobalLoader: false })
```

#### 3. Silent token refresh (401 handling)
Queues concurrent 401 responses, fires a single refresh-token request, then retries all queued requests with the new token. On refresh failure, calls `logout()` and hard-navigates to `/login`.

#### 4. Global error store integration
Intercepts network failures, 5xx server errors, 403 Forbidden, and unhandled 4xx errors (404, 409, 429, etc.), resolves an `ErrorCode`, and pushes it to the global error store. `GlobalErrorRenderer` handles display without hard navigation.

Does **not** push to the error store for:
- `401` — handled by silent refresh
- `400` / `422` — validation errors, handled by form components inline
- Cancelled requests (`axios.isCancel`)
- Requests with `skipGlobalErrorHandler: true`

The condition that triggers global error routing:
```ts
// Fires for: network errors, 5xx, 403, and any 4xx not handled locally
type === 'network' ||
type === 'server'  ||
(status >= 400 && status < 500 && status !== 400 && status !== 401 && status !== 422)
```

Per-request opt-out:
```ts
authUrl.get('/endpoint', { skipGlobalErrorHandler: true })
```

#### 5. Backend error code mapping
When a 4xx/5xx response contains `{ errorCode: "ORDER_NOT_FOUND" }` in the body, `resolveErrorCode()` maps it to the typed `ErrorCode` enum for granular error display.

### API modules

All API modules import from `src/config/Define.ts` which exports `authUrl` (the pre-configured Axios instance):

```ts
import { authUrl } from '@/config/Define';

export const getProducts = () => authUrl.get('/products');
export const createProduct = (data: ProductPayload) => authUrl.post('/products', data);
```

### API source switching

**File:** `src/config/Define.ts`

```ts
// mock mode  → base URL: '/api/v1'  (Vite-proxied to json-server)
// real mode  → base URL: environment.apiUrl  (production backend)
const AUTH_BASE = environment.apiSource === 'mock'
  ? '/api/v1'
  : (environment.apiUrl || '/api/v1');

export const authUrl = createApiInstance(AUTH_BASE);
```

Set `VITE_API_SOURCE=real` and `VITE_LOGIN_AUTH_URL=https://api.yourapp.com` in `.env.production` to switch to the real backend.

---

## 12. State Management

All global state uses **Zustand**. UI-scoped state (language, theme) uses **React Context**. Local component state uses `useState`.

### `useAuthStore` — `src/store/auth.store.ts`

User, token, and feature flags. See [Section 10](#10-authentication--auth-store).

### `useCartStore` — `src/store/cart.store.ts`

Shopping cart state persisted to `localStorage`.

| State | Type | Description |
|---|---|---|
| `items` | `CartItem[]` | Array of `{ product, quantity }` |

| Action | Description |
|---|---|
| `addItem(product)` | Adds item or increments quantity |
| `removeItem(productId)` | Removes item entirely |
| `updateQuantity(productId, qty)` | Sets exact quantity |
| `clearCart()` | Empties the Zustand cart (and clears `localStorage`). Called on logout and after server cart merge. |
| `loadServerCart(items)` | Replaces the local cart with the server's authoritative list. Called by `useCartMerge` after login. |

Cart item count badge subscribes with a selector to avoid unnecessary re-renders:

```ts
const cartCount = useCartStore((s) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0)
);
```

### `useWishlistStore` — `src/store/wishlist.store.ts`

Wishlist state persisted to `localStorage`. Syncs with backend on login via `useWishlistSync` hook.

| Action | Description |
|---|---|
| `addItem(productId)` | Adds product ID to local wishlist |
| `removeItem(productId)` | Removes product ID |
| `clearItems()` | Empties the wishlist. Called on logout. |
| `setItemsFromServer(productIds)` | Replaces local wishlist with the server's authoritative list. Called by `useWishlistSync` after login sync so the navbar badge and product-card hearts stay accurate. |

### `useUiStore` — `src/store/ui.store.ts`

UI-only state (loading counter):

| State | Type | Description |
|---|---|---|
| `activeApiRequestsCount` | `number` | Semaphore for parallel requests |

| Action | Description |
|---|---|
| `startLoading()` | Increments counter |
| `stopLoading()` | Decrements counter (never below 0) |

`GlobalLoader` shows when `activeApiRequestsCount > 0`.

### `useInitStore` — `src/core/init/init.store.ts`

Initialization state:

| State | Type | Description |
|---|---|---|
| `isReady` | `boolean` | True after `AppInitializer` completes |
| `dynamicLocales` | `Record<Lang, Locale>` | CMS-fetched locale bundles |
| `errorConfig` | `ErrorBundle \| null` | CMS-fetched error config |

### `useErrorStore` — `src/core/errors/error.store.ts`

Global error state. See [Section 13](#13-global-error-system).

### `useRealtimeStore` — `src/features/realtime/store/realtime.store.ts`

WebSocket-driven realtime state. See [Section 26](#26-websocket-realtime-architecture).

| State | Type | Description |
|---|---|---|
| `connectionStatus` | `SocketConnectionStatus` | WS lifecycle state |
| `rooms` | `Record<string, RoomState>` | Messages + typing per room |
| `activeRoomId` | `string \| null` | Currently selected room |
| `onlineUsers` | `PresenceUser[]` | Users present in the admin panel |
| `notifications` | `NotificationPayload[]` | Server-pushed notifications |
| `unreadCount` | `number` | Badge counter (notifications not yet `markAllRead`) |
| `lastServerTimestamp` | `number \| null` | Epoch ms of last server event |

---

## 13. Global Error System

A centralized, typed error pipeline that handles all user-visible errors consistently.

### Error flow

```
Raw error (Axios / JS / Route guard)
  │
  ▼
error.handler.ts    → resolves raw error to ErrorCode
  │
  ▼
error.config.ts     → looks up ErrorConfig (display mode, icon, i18n keys)
  │
  ▼
error.store.ts      → routes to: pageError | modalError | toastQueue | inlineError
  │
  ▼
GlobalErrorRenderer.tsx → renders the appropriate UI
```

### Display modes

| Mode | When to use | UI |
|---|---|---|
| `PAGE` | Critical errors replacing page content | Fullscreen overlay (z-9990) |
| `INLINE` | Form or section-level errors | Small banner inside component |
| `MODAL` | Action-required errors | Dialog overlay (z-9995) |
| `TOAST` | Non-critical, transient notifications | Bottom-right stack (z-9999), auto-dismisses |

### Error codes

```ts
type ErrorCode =
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
```

### Pushing an error

```ts
import { useErrorStore } from '@/core/errors/error.store';

const { pushError } = useErrorStore();

// Basic push — uses defaults from error.config.ts
pushError('NETWORK_ERROR');

// With options
pushError('PRODUCT_NOT_FOUND', {
  displayModeOverride: 'TOAST',
  dismissible: true,
  onRetry: () => refetch(),
  duration: 5000, // ms, toast only
});
```

### Error config

Each `ErrorCode` has a static `ErrorConfig` in `src/core/errors/error.config.ts`:

```ts
type ErrorConfig = {
  code: ErrorCode;
  displayMode: ErrorDisplayMode;  // default display mode
  iconName: string;               // Lucide icon name
  iconBgClass: string;            // Tailwind bg class
  iconColorClass: string;         // Tailwind text class
  titleKey: string;               // i18n key for title
  descriptionKey: string;         // i18n key for description
  primaryAction?: { label, variant, redirectTo };
  secondaryAction?: { label, variant, redirectTo };
};
```

### Error Boundary

`src/core/errors/ErrorBoundary.tsx` is a React class component that catches render-time JavaScript errors. Used at:
- Top of `App.tsx` — catches provider errors
- Wrapping `AdminLayout` and `UserLayout` in `AppRouter.tsx` — auto-resets on route change

```tsx
<ErrorBoundary resetKey={location.pathname}>
  <AdminLayout />
</ErrorBoundary>
```

### Error Playground

`/admin/error-playground` is a developer tool page for testing all error display modes interactively. It is protected by the `errorPlayground` feature flag and only accessible to `ADMIN` role users with the flag enabled.

---

## 14. App Initialization Gate

**Files:** `src/core/init/AppInitializer.tsx`, `src/core/init/init.service.ts`, `src/core/init/init.store.ts`

### What it does

Blocks the router from mounting until two bundles are fetched in parallel:

1. **Locale bundle** — translation strings for the user's stored language
2. **Error config bundle** — server-overridable error display configuration

### Initialization flow

```
1. Read stored language from localStorage
2. Fetch locale bundle  ─┐ parallel (Promise.all)
3. Fetch error config  ──┘
4. Store both in useInitStore
5. setReady() → AppRouter mounts
```

### Guarantees

- The router does NOT mount until `isReady` is `true`
- All page-level API calls are naturally prevented until the router exists
- Fetch failures always fall back to static TypeScript bundles — the app always starts

### Loading state

While initializing, `AppInitializer` renders `<InitSkeleton />` — a fullscreen animated skeleton that matches the app's layout structure.

### Language switching after init

When the user switches language via `setLang()`, `i18n.context.tsx` calls `fetchLocaleBundle(newLang)` and updates the store. No page reload is required.

---

## 15. CMS Content Service

**File:** `src/core/init/init.service.ts`

Controlled by `VITE_CONTENT_SOURCE`:

| Value | URL pattern | Network tab signal |
|---|---|---|
| `local` | `/content/default-*` | `default-ar` |
| `backend` | `/content/be-default-*` | `be-default-ar` |

This distinction is visible in the browser's Network tab — the `be-` prefix is the debug signal that backend mode is active.

### Fetch with timeout + fallback

The service uses a 5-second timeout per fetch and falls back silently to the static TypeScript bundle on any failure:

```
Network fetch (5s timeout)
  → 200 OK → parse JSON → store in useInitStore
  → HTTP error / timeout / network error → use static fallback
```

The JSON response can be either a raw object or a FreeAPI envelope `{ data: {...} }` — both are handled.

### Serving the mock bundles

`json-server` serves the TypeScript locale files as JSON when Vite proxies `/content/*`. The mock server converts the TypeScript exports to JSON fixtures automatically.

---

## 16. Feature Flags

Feature flags enable progressive rollout of features per user without deploying new code.

### Storage

Flags are stored as `Record<string, boolean>` in:
- `useAuthStore.featureFlags` (in-memory Zustand state)
- `localStorage` under `auth-feature-flags` (survives refresh)

### Lifecycle

1. User logs in
2. Backend returns user-specific flags (or a separate `/feature-flags` API call)
3. `setFeatureFlags(flags)` is called
4. `FeatureGuard`, `WhitelistGuard`, and `DeepLinkGuard` read flags from the store
5. `logout()` clears flags back to defaults

### Default flags (development)

```ts
// In auth.store.ts — defaultFeatureFlags() in DEV mode:
{
  errorPlayground: true,   // enables /admin/error-playground
  realtimeChat:    true,   // enables /admin/realtime-chat + sidebar nav item
  betaReports: false,
  analyticsV2: false,
  newCheckout: false,
}
```

> **Dev merge behaviour:** `loadStoredFeatureFlags()` merges stored flags with `defaultFeatureFlags()` in development (`import.meta.env.DEV`). This means newly added dev flags appear automatically without a log-out/log-in cycle. Stored values always win over defaults, so server-set flags are never overwritten.

In production, all flags default to `{}` (empty) — features are disabled unless the backend grants them.

### Using feature flags in components

```tsx
const { featureFlags } = useAuthStore();

if (featureFlags.analyticsV2) {
  return <NewAnalyticsDashboard />;
}
```

### Route-level feature gating

```tsx
// In AppRouter.tsx — only users with errorPlayground flag can access this route:
<Route element={<FeatureGuard featureFlag="errorPlayground" />}>
  <Route path="/admin/error-playground" element={<Page component={ErrorPlaygroundPage} />} />
</Route>
```

---

## 17. Layouts

### `AuthLayout` — `src/layouts/AuthLayout.tsx`

Centered card layout for login and register pages. No navigation. Full-viewport, vertically and horizontally centered.

### `UserLayout` — `src/layouts/UserLayout.tsx`

Storefront shell. Structure:

```
┌─────────────────────────────────────────────────────────┐
│  Logo  Home  Products  Orders  Profile  🤍(n)  🛒(n)  👤 │  ← Desktop header
│  Logo                                  🤍(n)  🛒(n)   ☰  │  ← Mobile header
├─────────────────────────────────────────────────────────┤
│                  <Outlet /> — page content               │
├─────────────────────────────────────────────────────────┤
│          © 2025 ShopHub. All rights reserved.            │  ← Footer (sticky bottom)
└─────────────────────────────────────────────────────────┘
```

**Desktop:** Horizontal nav links + theme toggle + language toggle + user avatar + logout button.

**Mobile:** Logo + wishlist badge + cart badge + hamburger. Tapping the hamburger slides in a full-height drawer (RTL-aware with `start-0`) containing all nav links, theme toggle, language toggle, user info, and sign-out.

Footer is sticky to the bottom of the viewport on short pages via `min-h-screen flex flex-col` with `flex-1` on main.

#### Logout flow (cart preservation)

`handleLogout` is async. Before calling `logout()`, it pushes the current Zustand cart to the server so the items survive the session:

```ts
const handleLogout = useCallback(async () => {
  // Save current cart to server so it persists across sessions
  const items = useCartStore.getState().items;
  if (items.length > 0) {
    await Promise.allSettled(
      items.map(({ product, quantity }) =>
        addToServerCart(product._id, quantity)
      )
    );
  }
  logout();                               // clears Zustand + cookie + localStorage
  navigate('/login', { replace: true });
}, [logout, navigate]);
```

This ensures: User A logs in → adds items → logs out → items are on the server → User A logs in again → `useCartMerge` reloads them automatically.

### `AdminLayout` — `src/layouts/AdminLayout.tsx`

Admin panel shell. Structure:

```
┌──────────────────────────────────────────────────────────────┐
│  Logo  ShopHub Admin                     [🔔(n)]  [🌙]  [👤] │  ← Top bar
├──────────────────────────────────────────────────────────────┤
│ Sidebar  │                                                    │
│ Dashboard│         RealtimeProvider                          │
│ Products │           <Outlet />                              │
│ Categories│          (page content)                          │
│ Orders   │                                                    │
│ Team Chat│                                                    │
│ Error PG │                                                    │
│ Sign out │                                                    │
└──────────────────────────────────────────────────────────────┘
```

**Header bell badge:** Subscribes to `useRealtimeStore(s => s.unreadCount)`. Clicking the bell calls `markAllRead()`.

**`<Outlet />` wrapping:** `RealtimeProvider` wraps the `<Outlet />` inside `<main>`. This means the WebSocket connects when any admin page mounts and disconnects when the user leaves the admin panel entirely.

**Nav items:** `NAV_ITEMS` (static) merged with conditionally added items:
- **Team Chat** — shown when `featureFlags.realtimeChat === true`
- **Error Playground** — shown when `featureFlags.errorPlayground === true`

Mobile version collapses to a hamburger with a slide-in drawer (RTL-aware).

---

## 18. Admin Panel Pages

All admin routes are gated behind `ProtectedRoute → WhitelistGuard → RoleGuard(ADMIN|MANAGER)`.

### Dashboard — `/admin/dashboard`

**File:** `src/pages/admin/DashboardPage.tsx`

Overview metrics (total products, categories, orders, revenue) displayed as stat cards. Quick-action buttons link to the main admin sections. All text is fully translated via `useI18n()`.

### Products List — `/admin/products`

**File:** `src/pages/admin/ProductsListPage.tsx`

Paginated product table with:
- Search (debounced, client-side)
- Category filter dropdown
- Sort by name/price/stock (ascending/descending)
- Stock status badges (In Stock, Low Stock, Out of Stock)
- Inline actions: Edit, Delete (with confirmation modal)
- Pagination showing `X–Y of Z` with translated interpolation

### Create Product — `/admin/products/create`

**File:** `src/pages/admin/CreateProductPage.tsx`

Form for creating a new product. Validates with Zod schema (`src/schemas/product.schema.ts`). Fields: name, description, category, price, stock, image URL.

### Edit Product — `/admin/products/:id/edit`

**File:** `src/pages/admin/EditProductPage.tsx`

Pre-populated edit form. Loads product by ID from the API, prefills form fields.

### Categories — `/admin/categories`

**File:** `src/pages/admin/CategoriesPage.tsx`

Category table with inline create form and delete confirmation modal. Delete modal warns that products in the category will lose their category assignment. Restricted to `ADMIN` role (MANAGER cannot access).

### Orders — `/admin/orders`

**File:** `src/pages/admin/AdminOrdersPage.tsx`

Order management table with:
- Status filter (All / Pending / Delivered / Cancelled)
- Status badges with translated labels
- Order detail modal with line-item breakdown, subtotal, and payment status
- Pagination

Status badge labels use `labelKey` references into the locale, translated at render time:
```ts
PENDING:   { labelKey: 'admin.orders.status.pending', ... }
DELIVERED: { labelKey: 'admin.orders.status.delivered', ... }
CANCELLED: { labelKey: 'admin.orders.status.cancelled', ... }
```

#### Null-safety on order financials

All monetary `.toFixed()` calls guard against `undefined` with `?? 0`:

```ts
(order.discountedOrderPrice ?? order.orderPrice ?? 0).toFixed(2)  // displayed total
(order.orderPrice ?? 0).toFixed(2)                                 // subtotal
(item.product?.price ?? 0).toFixed(2)                             // line item price
```

Customer fields use optional chaining + fallbacks:
```ts
order.customer?.username ?? '—'
order.customer?.email ?? ''
```

These guards protect against both legacy seed data (missing fields) and mock server responses before `normalizeOrder()` runs.

### Realtime Chat — `/admin/realtime-chat`

**File:** `src/pages/admin/RealtimeChatPage.tsx`

WebSocket-powered team chat demo. Gate: `ADMIN` or `MANAGER` role + `realtimeChat` feature flag (enabled by default in dev). Demonstrates the full realtime layer:

- Three pre-seeded rooms (General, Operations, Dev Team)
- Optimistic message rendering — `sending` → `sent` / `failed` + retry button
- Typing indicators (debounced, auto-cleared)
- Live presence panel (online users count)
- Connection status banner (connecting / reconnecting / disconnected)
- Message skeleton while the WebSocket handshake is in progress
- Notification badge in AdminLayout header driven by `useRealtimeStore.unreadCount`

### Error Playground — `/admin/error-playground`

**File:** `src/pages/admin/ErrorPlaygroundPage.tsx`

Developer tool for testing all error display modes. Gate: `ADMIN` role + `errorPlayground` feature flag. Allows triggering PAGE, MODAL, TOAST, and INLINE error scenarios.

### Whitelist rules

```ts
// src/config/whitelist.config.ts
'/admin/realtime-chat':    { allowedRoles: ['ADMIN', 'MANAGER'], requiredFeatureFlags: ['realtimeChat'] },
'/admin/error-playground': { allowedRoles: ['ADMIN'], requiredFeatureFlags: ['errorPlayground'] },
'/admin/dashboard':        { allowedRoles: ['ADMIN', 'MANAGER'] },
'/admin/products':         { allowedRoles: ['ADMIN', 'MANAGER'], matchPrefix: true },
'/admin/categories':       { allowedRoles: ['ADMIN'] },
'/admin/orders':           { allowedRoles: ['ADMIN', 'MANAGER'] },
```

---

## 19. User Storefront Pages

### Home — `/`

**File:** `src/pages/user/HomePage.tsx`

Hero section, featured products, category highlights. Public (no auth required).

### Products — `/products`

**File:** `src/pages/user/ProductsPage.tsx`

Product catalog with search, category filter, and sort. Paginated grid. Public.

### Product Detail — `/products/:slugId`

**File:** `src/pages/user/ProductDetailPage.tsx`

Full product details with image, description, price, and add-to-cart / add-to-wishlist actions. Public.

### Cart — `/cart`

**File:** `src/pages/user/CartPage.tsx`

Cart contents with quantity controls, item removal, subtotal, and proceed-to-checkout CTA. Public (cart state is local Zustand store).

### Wishlist — `/wishlist`

**File:** `src/pages/user/WishlistPage.tsx`

Wishlist items with add-to-cart and remove actions. Syncs to backend when the user logs in via `useWishlistSync` hook.

### Checkout — `/checkout` _(protected)_

**File:** `src/pages/user/CheckoutPage.tsx`

Multi-field checkout form validated with Zod (`src/schemas/checkout.schema.ts`). Collects shipping address and payment method. Submits order to API. Simulates payment on mock backend.

### Orders — `/orders` _(protected)_

**File:** `src/pages/user/OrdersPage.tsx`

User's order history. Supports both list view (`/orders`) and detail view (`/orders/:id`). The detail view is gated by `DeepLinkGuard` to prevent URL guessing.

### Profile — `/profile` _(protected)_

**File:** `src/pages/user/ProfilePage.tsx`

User account information display and edit.

---

## 20. Shared Components

### `GlobalLoader` — `src/components/common/GlobalLoader.tsx`

Fullscreen spinner overlay driven by `useUiStore.activeApiRequestsCount`. Mounted above the router (z-9999). Shows automatically for every Axios request that does not opt out with `showGlobalLoader: false`.

### `InitSkeleton` — `src/components/ui/InitSkeleton.tsx`

Fullscreen animated skeleton shown while `AppInitializer` waits for locale and error config bundles. Matches the app's layout structure to minimize perceived layout shift.

### `DeleteModal` — `src/components/admin/DeleteModal.tsx`

Reusable confirmation modal for delete actions in admin pages. Accepts `title`, `message`, `onConfirm`, `onCancel`, and `isDeleting` props.

### `FormInputControl` — `src/components/form/input/FormInputControl.tsx`

`react-hook-form`-connected input component. Renders label, input field, and validation error message. Accepts the full `UseFormRegisterReturn` from RHF.

### `ErrorBoundary` — `src/core/errors/ErrorBoundary.tsx`

React class component error boundary. Accepts `resetKey` prop to reset on route change.

### `GlobalErrorRenderer` — `src/core/errors/GlobalErrorRenderer.tsx`

Subscribes to `useErrorStore` and renders:
- `pageError` → fullscreen PAGE overlay (z-9990)
- `modalError` → dialog overlay (z-9995)
- `toastQueue` → bottom-right toast stack (z-9999), auto-dismisses per `duration`
- INLINE errors are not rendered here — consumed directly by components

---

## 21. Form Validation

All forms use `react-hook-form` + `zod` via `@hookform/resolvers`.

### Pattern

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/schemas/login.schema';

const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

### Schemas

| File | Form |
|---|---|
| `src/schemas/login.schema.ts` | Login form (email, password) |
| `src/schemas/register.schema.ts` | Registration form (username, email, password, confirm) |
| `src/schemas/checkout.schema.ts` | Checkout form (address, payment) |
| `src/schemas/product.schema.ts` | Admin create/edit product form |

### Validation errors

Zod validation errors surface through `formState.errors` and are rendered by `FormInputControl` inline under each field. The global error system is NOT used for form validation — 400/422 API responses are handled by form components directly.

---

## 22. Mock Server

**File:** `mock-server/server.cjs`

The mock server uses `json-server` to simulate the REST API. It provides:

- All product, category, order, user, cart, and wishlist endpoints
- Authentication endpoints (`/users/login`, `/users/refresh-token`, `/users/register`)
- Content bundle endpoints (`/content/default-en`, `/content/default-ar`, `/content/default-error`)

### Starting the mock server

```bash
npm run dev:mock
```

Or together with Vite:

```bash
npm run dev:all
```

### Vite proxy configuration

`vite.config.ts` forwards requests to the mock server:

```ts
server: {
  proxy: {
    '/content': { target: 'http://localhost:3001', changeOrigin: true },
    // /api/v1 only proxied when VITE_API_SOURCE=mock:
    '/api/v1': { target: 'http://localhost:3001', changeOrigin: true },
  },
},
```

This means API calls from the browser appear as `/api/v1/...` in the Network tab — identical to production — and the mock server intercepts them transparently.

### Cart endpoints

The mock server implements per-user server-side cart storage with full product population:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/ecommerce/cart` | Fetch authenticated user's cart |
| `POST` | `/api/v1/ecommerce/cart/item/:productId` | Add or set item quantity (upsert with stock clamping) |
| `PATCH` | `/api/v1/ecommerce/cart/item/:productId` | Update existing item quantity |
| `DELETE` | `/api/v1/ecommerce/cart/item/:productId` | Remove single item |
| `DELETE` | `/api/v1/ecommerce/cart` | Clear all items for the user |

All cart responses are built by `buildCartResponse(db, userId)` which populates full product objects and computes `cartTotal` and `discountedTotal`.

### Wishlist endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/ecommerce/profile/wishlist` | Fetch authenticated user's wishlist |
| `POST` | `/api/v1/ecommerce/profile/wishlist/:productId` | Toggle item (add if absent, remove if present) |

All wishlist responses are built by `buildWishlistResponse(db, userId)` which returns the FreeAPI-compatible shape:
```json
{ "wishlistItems": [{ "_id": "...", "product": { "_id": "...", "name": "...", ... } }], "wishlistItemsCount": 2 }
```

### Order normalization

`normalizeOrder(order, db)` runs on every order returned from the mock server. It:

- Maps legacy `totalAmount` → `orderPrice` / `discountedOrderPrice` (fixes `.toFixed()` crash in AdminOrdersPage)
- Populates the `customer` object (`{ _id, username, email, role }`) from `db.users`
- Enriches each line item with the full product object from `db.products`
- Adds missing fields (`coupon`, `paymentProvider`, `paymentId`, `isPaymentDone`, `updatedAt`) with safe defaults

This normalization means the frontend can always call `.toFixed()` on order totals without null guards — though the component adds them defensively as a belt-and-suspenders measure.

---

## 23. Build & Bundle Splitting

### Production build

```bash
npm run build
```

TypeScript compiles first (`tsc -b`), then Vite builds and tree-shakes the output.

### Manual chunk splitting

`vite.config.ts` configures Rollup manual chunks to separate heavy vendor packages into individually cacheable files:

| Chunk | Contents | Cache benefit |
|---|---|---|
| `vendor-firebase` | `firebase/*` | Only downloaded when user visits Login |
| `vendor-react` | `react`, `react-dom`, `react-router`, `scheduler` | Very stable; long cache lifetime |
| `vendor-icons` | `lucide-react` | Tree-shaken per page at import time |
| `vendor-utils` | `zustand`, `axios`, `zod`, `react-hook-form`, `js-cookie` | Stable utility layer |
| `vendor` | Everything else from `node_modules` | |

### Chunk size warning limit

`chunkSizeWarningLimit: 600` (KB) suppresses warnings for the icon vendor chunk which is large but heavily tree-shaken at runtime.

### Code splitting impact

Every page is `React.lazy()` — each page's JavaScript is only downloaded on first visit. Combined with vendor chunk splitting, the initial load is approximately 70% smaller than a non-split build.

---

## 24. Cart Persistence & Wishlist Sync

### Cart lifecycle

| Phase | Storage | Mechanism |
|---|---|---|
| Guest (unauthenticated) | `localStorage` | Zustand `persist` middleware |
| Authenticated | Server + Zustand | Login merge + `loadServerCart()` |
| Post-checkout | Cleared | `clearCart()` + `clearServerCart()` |
| Logout | Zustand cleared, server preserved | `logout()` clears Zustand only; server cart kept for next login |

### Login merge — `src/hooks/useCartMerge.ts`

Called fire-and-forget immediately after `setAuth(user, token)`:

```
1. getServerCart()                   ← always fetch, even with no guest items
                                       (fixes: returning users saw empty cart)
2. if guestItems.length > 0:
   for each guestItem:
     if already on server → updateServerCartItem(sum, capped at stock)
     if new              → addToServerCart(qty)
   clearCart()                        ← wipe localStorage guest cart
   getServerCart()                    ← reload authoritative post-merge state
3. loadServerCart(serverItems)        ← populate Zustand from server truth
```

**Key bug fix:** The original implementation returned early when `guestItems.length === 0`, which meant a returning authenticated user never had their server cart loaded. The fix: always proceed to the load step regardless of guest item count.

**Conflict resolution:**

| Scenario | Resolution |
|---|---|
| Same product in both carts | Sum quantities, cap at `product.stock` |
| Product only in guest cart | Add to server with guest quantity |
| Product only in server cart | Untouched (returned in load step) |
| Product out of stock on server | `addToServerCart` fails silently via `allSettled` |

### Logout preservation — `src/layouts/UserLayout.tsx`

Before calling `logout()`, `handleLogout` pushes the current Zustand cart items to the server with `Promise.allSettled()`. If the save fails (network error), the items may be lost — but the user initiated the logout, so this is acceptable. This ensures:

```
User A: add items → logout → items saved to server
User B: login on same browser → has own server cart, A's items unaffected
User A: login again → useCartMerge reloads their server cart
```

### Wishlist sync — `src/hooks/useWishlistSync.ts`

Called fire-and-forget immediately after `setAuth(user, token)`:

```
1. Snapshot localIds from Zustand (guest wishlist before sync)
2. getWishlist()                     ← fetch current server wishlist
3. idsToAdd = localIds − serverIds   ← diff: avoid double-toggle
4. Promise.allSettled(
     idsToAdd.map(id => toggleWishlistItem(id))
   )
5. setItemsFromServer([...serverIds, ...idsToAdd])
   ← replaces local store with full server list
```

**Why the diff step is critical:** The FreeAPI wishlist endpoint is a **toggle** — calling it for an already-wishlisted product *removes* it. Without the diff, syncing a product already on the server would silently delete it.

**Why `setItemsFromServer` instead of `clearItems`:** The original `clearItems()` call left the local store empty after sync, causing the navbar wishlist badge to show 0 and `WishlistPage` to display the empty state. `setItemsFromServer` replaces the local store with server IDs so the badge count and product-card hearts are accurate immediately.

---

## 25. Development Guidelines

### Adding a new page

1. Create the component in `src/pages/user/` or `src/pages/admin/`
2. Add a `React.lazy()` import and a `<Route>` entry in `src/routes/AppRouter.tsx`
3. Wrap with appropriate guards if the page is protected
4. Add translation keys to `default-en.ts` → `default-ar.ts` → `en.ts` → `ar.ts`

### Adding a new admin route with access control

1. Add the route to `AppRouter.tsx` inside the admin section
2. Add a `WhitelistRule` to `src/config/whitelist.config.ts`:
   ```ts
   '/admin/reports': {
     allowedRoles: ['ADMIN'],
     requiredFeatureFlags: ['betaReports'],
   },
   ```
3. No changes needed in `WhitelistGuard.tsx` — it reads the config automatically

### Adding a new feature flag

1. Add the flag to `defaultFeatureFlags()` in `auth.store.ts` (set to `true` in DEV, `false` in prod)
2. Use it in a component: `featureFlags.yourFlagName`
3. Or gate a route: `<FeatureGuard featureFlag="yourFlagName" />`
4. Backend supplies per-user values at login via `setFeatureFlags()`

### Adding a new error code

1. Add the code to the `ErrorCode` union in `src/core/errors/error.types.ts`
2. Add a matching `ErrorConfig` entry in `src/core/errors/error.config.ts`
3. Add i18n keys for `titleKey` and `descriptionKey` in both locale files
4. Push the error from any component or interceptor via `pushError('YOUR_CODE')`

### Adding a new translation key

1. Add to `src/i18n/locales/default-en.ts` — TypeScript will flag missing keys in other files
2. Add Arabic translation to `src/i18n/locales/default-ar.ts`
3. Mirror in `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts` (static bundles)

### Environment variable naming

All client-accessible environment variables must be prefixed with `VITE_`. Variables without this prefix are never exposed to the browser. Server-only secrets (database URLs, signing keys) must never have the `VITE_` prefix.

### Avoiding circular dependencies

- `auth.store.ts` must NOT import from `api/` or `config/Define.ts`
- `api/base/axios.ts` imports from `auth.store.ts` (via `getState()`) — this is the intended one-way dependency
- If a utility needs both auth state and API access, pass it as a parameter rather than importing both

### i18n best practices

- Never hardcode user-visible strings — always use `translate('key')`
- For strings with dynamic values, use `.replace('{{placeholder}}', value)` after `translate()`
- Use descriptive key names: `admin.products.showing` not `productsPage.str3`
- Group keys by page/feature, not by component

### TypeScript strict mode

The project runs with `erasableSyntaxOnly: true` in tsconfig. This means:
- Use `type` unions instead of `enum` (e.g. `type ErrorCode = 'FOO' | 'BAR'`)
- Use `type` imports where possible (`import type { Foo }`)

---

---

## 26. WebSocket Realtime Architecture

**Files:** `src/features/realtime/`

### Folder structure

```
features/realtime/
├── types/socket.types.ts        # All shared type contracts
├── socket/socket.manager.ts     # Singleton I/O manager
├── store/realtime.store.ts      # Zustand state driven by WS events
├── hooks/useAdminSocket.ts      # React hook — clean component API
└── providers/RealtimeProvider.tsx  # Lifecycle manager
```

### Architecture overview

```
AdminLayout mounts
  └── RealtimeProvider (useEffect)
        └── socketManager.connect(wsUrl)
              │
              ├─ real mode   → new WebSocket(url?token=...)
              └─ mock mode   → local timer simulation (same event API)

Incoming event frame:
  WebSocket.onmessage (or mock timer)
    │
    ├── dispatchToHandlers()  → registered useAdminSocket subscribers
    └── routeEventToStore()   → useRealtimeStore (store always up-to-date)

Component tree:
  useAdminSocket()       → connectionStatus, sendMessage, subscribe
  useRealtimeStore(sel)  → messages, onlineUsers, notifications, unreadCount
```

### SocketManager — `src/features/realtime/socket/socket.manager.ts`

Singleton class (exported as `socketManager` instance). Handles all I/O so no React component touches `WebSocket` directly.

#### Reconnect strategy

Exponential backoff with ±30% random jitter to prevent thundering-herd when multiple admin tabs lose connection simultaneously.

| Attempt | Base delay | With max jitter (+30%) |
|---|---|---|
| 1st | 1 s | up to 1.3 s |
| 2nd | 2 s | up to 2.6 s |
| 3rd | 4 s | up to 5.2 s |
| 4th | 8 s | up to 10.4 s |
| 5th | 16 s (capped at 30 s max) | up to 20.8 s |

After 5 failed attempts: `pushError('NETWORK_ERROR', { displayModeOverride: 'TOAST' })` + fall back to mock simulation mode.

The reconnect timer is **suspended** on the `offline` browser event and re-triggered immediately on `online`, so no retry attempts are wasted without a network connection.

#### Heartbeat

Client pings every 25 s. If no pong arrives within 10 s, the manager closes the dead socket (triggering reconnect).

**Page Visibility API:** The heartbeat is **paused** when `document.visibilityState === 'hidden'` and resumed on tab focus. This prevents false pong-timeouts from Chromium timer throttling and avoids unnecessary server wake-ups.

#### Offline queue

Messages sent while the socket is not `OPEN` are pushed to `offlineQueue: OutboundSocketMessage[]`, capped at **50 messages** (oldest dropped when full). On reconnect, `drainQueue()` sends them in order and logs the count.

#### Frame guards

| Guard | Behaviour |
|---|---|
| Binary frames | Silently ignored — this protocol is text-only |
| Oversized frames (> 64 KB) | Dropped before `JSON.parse` — prevents memory spike from malformed payloads |
| Malformed JSON | Caught, warning logged, manager continues |

#### Performance optimisations

| Optimisation | Detail |
|---|---|
| `setStatus()` dedup | No-op when new status equals current — prevents spurious Zustand `set()` and React re-renders |
| `mockTimers: Set` + self-remove | Each timer removes itself from the `Set` after firing — no stale ID accumulation |
| `startHeartbeat()` guard | Calls `stopHeartbeat()` first — prevents double-interval if called twice |

#### Console logging

Every lifecycle event emits a timestamped, colour-coded console line:

```
[Socket 14:23:01.042] connect() called  url=ws://...
[Socket 14:23:01.043] status: idle → connecting
[Socket 14:23:25.844] → ping
[Socket 14:23:25.845] ← pong  (server alive)
[Socket 14:23:50.000] tab hidden — pausing heartbeat
⚠ [Socket 14:24:01.000] browser offline — suspending reconnect timer
[Socket 14:24:15.001] reconnect 1/5 in 1042 ms  (base=1000 ms, jitter=42 ms)
⚠ [Socket 14:24:01.000] pong timeout after 10000 ms — closing dead socket
```

Filter by `[Socket` in the browser Console tab to isolate all socket logs.

#### Auth close code `4001`

If the server closes the socket with code `4001` (authentication failure), the manager pushes `SESSION_EXPIRED` as a PAGE error and stops reconnecting — the session is unrecoverable.

#### Mock simulation mode

Activated when `environment.apiSource === 'mock'`. Timer-driven — produces the exact same events as a real server via `dispatchToHandlers` + `routeEventToStore`, so all UI components are unaware of which mode is active.

| Event | Frequency |
|---|---|
| Bot chat messages (with typing indicator) | Every 4–10 s |
| Server notifications | Every 15–35 s |
| Presence (initial seed) | On connect (staggered 400 ms) |

Timer IDs are stored in a `Set<ReturnType<typeof setTimeout>>`. Each timer calls `this.mockTimers.delete(id)` before its callback runs — the `Set` stays lean for the lifetime of the session with no memory leak from resolved IDs.

### useAdminSocket hook — `src/features/realtime/hooks/useAdminSocket.ts`

```ts
const {
  connectionStatus,       // SocketConnectionStatus — reactive via Zustand
  lastServerTimestamp,    // number | null
  sendMessage,            // (msg: OutboundSocketMessage) => void — memoised
  subscribe,              // <T>(type, handler) => void — memoised
  unsubscribe,            // (type, handler) => void — memoised
} = useAdminSocket();
```

**One connection, many subscribers.** Multiple components can call `useAdminSocket()` and all share the single `socketManager` singleton. No duplicate connections are created.

**Selective re-renders.** The hook subscribes to `connectionStatus` and `lastServerTimestamp` only. Message data is read from `useRealtimeStore` with granular selectors to avoid unnecessary renders.

**Subscription cleanup pattern:**

```tsx
useEffect(() => {
  const handler = (event: SocketEvent<ChatMessage>) => { ... };
  subscribe('chat:message', handler);
  return () => unsubscribe('chat:message', handler);
}, [subscribe, unsubscribe]);
```

### Realtime store — `src/features/realtime/store/realtime.store.ts`

State is organized by room. The flat `Record<roomId, RoomState>` structure gives O(1) message insertion and per-room typing updates without iterating the entire list.

**Message cap:** 200 messages per room (`.slice(-199)`) to bound memory usage.

**Notification cap:** 50 notifications (`.slice(0, 50)`).

### Event contract (server ↔ client)

Every frame is a JSON-encoded `SocketEvent<T>`:

```json
{
  "type": "chat:message",
  "payload": {
    "id": "uuid",
    "roomId": "general",
    "senderId": "user-123",
    "senderName": "Alice Chen",
    "senderInitials": "AC",
    "text": "Hey team!",
    "timestamp": 1700000000000,
    "status": "sent"
  },
  "roomId": "general",
  "timestamp": 1700000000000
}
```

#### Supported event types

| Type | Direction | Description |
|---|---|---|
| `chat:message` | ↔ | Chat message in a room |
| `chat:typing_start` | ↔ | User started typing |
| `chat:typing_stop` | ↔ | User stopped typing |
| `presence:join` | ← | User connected to the admin panel |
| `presence:leave` | ← | User disconnected |
| `notification:new` | ← | Server push notification |
| `room:subscribe` | → | Client subscribes to a room |
| `room:unsubscribe` | → | Client unsubscribes from a room |
| `system:ping` | → | Client heartbeat |
| `system:pong` | ← | Server heartbeat reply |
| `system:auth` | → | Post-connect auth token |
| `system:error` | ← | Server-side error |

### RealtimeProvider — `src/features/realtime/providers/RealtimeProvider.tsx`

Thin component mounted inside `AdminLayout` that wraps `<Outlet />`. It calls `socketManager.connect()` in a `useEffect` and `socketManager.disconnect()` in the cleanup function. This means:

- WS is alive for the entire admin session (not per-page)
- Navigating between admin pages does NOT reconnect
- Navigating away from the admin panel cleanly disconnects and resets store state

### Error integration

| Scenario | Action |
|---|---|
| Transient connection failure | `pushError('NETWORK_ERROR', { displayModeOverride: 'TOAST', onRetry })` |
| Max retries exhausted | Same as above + fallback to mock mode |
| Server auth failure (code 4001) | `pushError('SESSION_EXPIRED', { displayModeOverride: 'PAGE' })` |
| No GlobalLoader | WebSocket never touches `useUiStore.activeApiRequestsCount` |

### Scalability notes

- **Room-level subscriptions:** In production, the client should send `room:subscribe` on room selection and `room:unsubscribe` when leaving. This prevents the server from broadcasting messages the client doesn't need.
- **Presence namespace:** The current model sends presence to all admin users. For large teams, scope presence to active rooms.
- **Message pagination:** The 200-message in-memory cap should pair with a server-side history API for initial room load and infinite scroll.
- **Token rotation:** The `_retry` / `_loaderStarted` pattern from the Axios layer should be replicated for WS — reconnect after a silent token refresh by sending `system:auth` with the new token before retrying.

---

---

## 27. Performance Optimisation (Lighthouse)

The following changes were applied to achieve Lighthouse scores of 100 across all categories (Performance, Accessibility, Best Practices, SEO).

### LCP (Largest Contentful Paint) — `HomePage.tsx`

The first product card image on the Home page is the LCP element. Two attributes are critical:

```tsx
<img
  loading={index === 0 ? 'eager' : 'lazy'}
  fetchPriority={index === 0 ? 'high' : undefined}
/>
```

- **`loading="eager"`** — prevents the browser's lazy-load deferral that was delaying the LCP image until after the viewport intersection observer fired (~4 s penalty).
- **`fetchPriority="high"`** — tells the browser to give this image a high network priority, allowing it to compete with scripts and stylesheets for bandwidth.
- `ProductCard` receives an `index` prop (0-based). Cards at `index > 0` retain `loading="lazy"` so they don't block bandwidth for off-screen images.

### Preconnect hints — `index.html`

```html
<link rel="preconnect" href="https://fastly.picsum.photos" crossorigin />
<link rel="preconnect" href="https://picsum.photos" crossorigin />
```

Initiates the TCP+TLS handshake to the image CDN before the HTML is fully parsed. Saves ~200–400 ms on the LCP resource fetch.

### Base meta description — `index.html`

```html
<meta name="description" content="ShopHub — discover thousands of products..." />
```

Provides an SEO fallback description for the root path. Individual pages override this via `usePageMeta`.

### Color contrast — `HomePage.tsx`, `UserLayout.tsx`

Replaced `text-gray-400` (#9ca3af, contrast ratio 2.53:1 on white) with `text-gray-500` (#6b7280, contrast ratio 4.6:1 on white — passes WCAG AA at 4.5:1 minimum) in:
- Rating count span in `ProductCard`
- Footer copyright text in `UserLayout`

### CLS (Cumulative Layout Shift) — `UserLayout.tsx`

Added `flex-shrink-0` to the `<footer>` element. In a `flex-column min-h-screen` layout, the footer was pushed by the main content during skeleton→loaded transitions. `flex-shrink-0` prevents the footer from compressing or shifting when adjacent content reflows.

### robots.txt — `public/robots.txt`

Added a proper `robots.txt` at `public/robots.txt` so Lighthouse doesn't flag a missing or HTML-returning robots endpoint:

```
User-agent: *
Allow: /
Disallow: /admin/
```

---

## 28. Dynamic Page Titles & Meta Tags

**File:** `src/hooks/usePageMeta.ts`

Every page sets its browser tab title and SEO meta description by calling:

```tsx
usePageMeta('Page Title', 'Optional description for search engines.');
```

### Title format

```
<page title> - ShopHub
```

Examples:
| Page | Tab title |
|---|---|
| Home | `Home - ShopHub` |
| Products listing | `Products - ShopHub` |
| Product detail | `Nike Air Max 270 - ShopHub` (dynamic — updates when product loads) |
| Cart | `Cart - ShopHub` |
| Wishlist | `Wishlist - ShopHub` |
| Checkout | `Checkout - ShopHub` |
| My Orders | `My Orders - ShopHub` |
| Profile | `Profile - ShopHub` |
| Sign In | `Sign In - ShopHub` |
| Create Account | `Create Account - ShopHub` |
| Admin Dashboard | `Dashboard - ShopHub` |
| 404 | `Page Not Found - ShopHub` |

### How it works

```ts
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = `${title} - ${SITE_NAME}`;

    if (description) {
      // Overwrites <meta name="description"> with the page-specific value
    }

    return () => {
      // Cleanup: reset to base site name on unmount
      document.title = SITE_NAME;
    };
  }, [title, description]);
}
```

### Dynamic title on ProductDetailPage

`ProductDetailPage` calls `usePageMeta` with the product state:

```tsx
usePageMeta(
  product?.name ?? 'Product',
  product ? `${product.description} — $${product.price.toFixed(2)}` : undefined,
);
```

While the product is loading the tab reads `"Product - ShopHub"`. Once the API responds, it updates to `"Nike Air Max 270 - ShopHub"` — making browser history entries and shared tabs meaningful.

### No react-helmet dependency

`usePageMeta` directly mutates `document.title` and a single `<meta name="description">` DOM node. For a client-rendered SPA with no SSR, this is equivalent to react-helmet with zero additional bundle size.

---

*Last updated: 2026-03-24 — Added: WebSocket realtime layer (SocketManager, useRealtimeStore, useAdminSocket, RealtimeProvider, RealtimeChatPage), AdminLayout notification bell + nav items, feature flag dev-merge behaviour, realtime chat whitelist rule. Updated Section 26 with SocketManager performance improvements: reconnect jitter, Page Visibility API heartbeat pause, online/offline browser events, offline queue cap (50), frame guards (binary + 64 KB limit), status dedup, mockTimers Set self-remove, structured console logging. Added Section 27: Lighthouse performance optimisations (LCP fix, preconnect hints, WCAG contrast, CLS fix, robots.txt). Added Section 28: `usePageMeta` hook for dynamic per-page titles and meta descriptions.*
