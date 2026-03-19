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
12. [Mobile Navigation](#12-mobile-navigation)
13. [Global Loader](#13-global-loader)
14. [Type Definitions](#14-type-definitions)
15. [Utilities](#15-utilities)
16. [Configuration Files](#16-configuration-files)
17. [Development Guidelines](#17-development-guidelines)

---

## 1. Project Overview

**ShopHub** is a full-featured bilingual (English/Arabic, LTR/RTL) e-commerce storefront with a separate admin panel, built as a React SPA.

### Key capabilities

| Capability | Detail |
|---|---|
| Storefront | Browse, search, filter, and buy products without logging in |
| Cart | Guest cart persisted to localStorage; merged into server on login |
| Wishlist | Synced to server after authentication |
| Authentication | Email/password + Google, Facebook, Microsoft (Firebase OAuth) |
| Admin panel | Product CRUD, category management, order management |
| Role-based access | `CUSTOMER`, `MANAGER`, `ADMIN` roles with route guards |
| Bilingual | Full Arabic RTL ↔ English LTR toggle with no page reload |
| Dark mode | System-aware class-based dark theme |
| Lazy loading | Every page is code-split; initial bundle 60–80% smaller |
| Global loader | Single Zustand-driven overlay for all API requests |

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
| HTTP | Axios | 1.13 | Interceptors for auth headers and global loader |
| Auth (OAuth) | Firebase | 12 | Google / Facebook / Microsoft social login |
| Icons | Lucide React | 0.577 | Tree-shaken SVG icons |
| Build | Vite | 8 | Sub-second HMR, ESM-native |
| Language | TypeScript | 5.9 | Strict mode enabled |

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

Create a `.env` file in the project root (copy from `.env.example` if present):

```env
VITE_API_BASE_URL=https://your-api.example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

All variables must be prefixed with `VITE_` to be exposed to the browser by Vite.

---

## 4. Project Structure

```
react-auth/
├── public/                     # Static assets (favicon, robots.txt)
├── src/
│   ├── api/                    # Axios API call modules (one per domain)
│   │   ├── auth.api.ts         # login, register, logout
│   │   ├── axios.ts            # Axios instance + request/response interceptors
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
│   │   ├── Define.ts           # App-wide constants (API base URL, etc.)
│   │   └── firebase.ts         # Firebase app initialisation
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
│   │       ├── en.ts           # English strings (source of truth + Locale type)
│   │       └── ar.ts           # Arabic strings (must satisfy Locale type)
│   │
│   ├── layouts/
│   │   ├── AdminLayout.tsx     # Sidebar shell for /admin/* routes
│   │   ├── AuthLayout.tsx      # Centered card shell for /login, /register
│   │   └── UserLayout.tsx      # Top-nav shell for storefront routes
│   │
│   ├── pages/
│   │   ├── Error.tsx           # Generic error boundary fallback page
│   │   ├── NotFound.tsx        # 404 catch-all page
│   │   ├── Unauthorized.tsx    # 403 page (insufficient role)
│   │   ├── Login.tsx           # Login form (email/password + social)
│   │   ├── Register.tsx        # Registration form
│   │   ├── admin/
│   │   │   ├── AdminOrdersPage.tsx     # Admin order management table
│   │   │   ├── CategoriesPage.tsx      # Category management
│   │   │   ├── CreateProductPage.tsx   # New product form
│   │   │   ├── EditProductPage.tsx     # Edit existing product
│   │   │   └── ProductsListPage.tsx    # Paginated product table with search/sort
│   │   └── user/
│   │       ├── CartPage.tsx            # Shopping cart with order summary
│   │       ├── CheckoutPage.tsx        # Checkout form + order placement
│   │       ├── HomePage.tsx            # Hero + featured products
│   │       ├── OrdersPage.tsx          # User order history with status tracker
│   │       ├── ProductDetailPage.tsx   # Single product view + add to cart
│   │       ├── ProductsPage.tsx        # Filtered/sorted product catalogue
│   │       └── ProfilePage.tsx         # Account details + quick actions
│   │
│   ├── routes/
│   │   ├── AppRouter.tsx       # Complete route tree with lazy loading
│   │   ├── ProtectedRoute.tsx  # Redirects unauthenticated users to /login
│   │   └── RoleGuard.tsx       # Redirects users without required roles to /unauthorized
│   │
│   ├── schemas/
│   │   ├── login.schema.ts     # Zod schema for login form
│   │   ├── product.schema.ts   # Zod schema for product create/edit
│   │   └── register.schema.ts  # Zod schema for registration form
│   │
│   ├── store/
│   │   ├── auth.store.ts       # Zustand: user, accessToken, login/logout actions
│   │   ├── cart.store.ts       # Zustand: cart items, add/remove/clear + localStorage persist
│   │   ├── ui.store.ts         # Zustand: activeApiRequestsCount (GlobalLoader counter)
│   │   └── wishlist.store.ts   # Zustand: wishlist items + server sync
│   │
│   ├── themes/
│   │   └── theme.context.tsx   # ThemeProvider + useTheme hook (light/dark)
│   │
│   ├── types/
│   │   ├── auth.types.ts       # User, AuthResponse, Role
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
│   ├── App.tsx                 # Root: I18nProvider > ThemeProvider > GlobalLoader + AppRouter
│   ├── index.css               # Tailwind directives + global base styles
│   └── main.tsx                # ReactDOM.createRoot + BrowserRouter
│
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
<BrowserRouter>          ← main.tsx
  <I18nProvider>         ← App.tsx — language/RTL context
    <ThemeProvider>      ← App.tsx — dark/light theme context
      <GlobalLoader />   ← App.tsx — API loading overlay (always mounted)
      <AppRouter>        ← App.tsx — full route tree
        <Routes>
          <AuthLayout>   ← /login, /register
          <UserLayout>   ← /, /products, /products/:id, /cart
            <ProtectedRoute> ← /checkout, /orders, /profile
          <ProtectedRoute>
            <RoleGuard [ADMIN, MANAGER]>
              <AdminLayout> ← /admin/*
          /unauthorized
          /error
          *              ← NotFound
```

### Why layouts are separate from routes

Each layout (`AuthLayout`, `UserLayout`, `AdminLayout`) is a React Router `<Outlet>` wrapper. This means:

- The layout renders once and stays mounted as child routes change.
- There is no layout flash when navigating between pages within the same layout.
- Admin and storefront have completely independent CSS contexts and sidebars.

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

When an unauthenticated user hits `/checkout`, `ProtectedRoute` saves `{ from: location }` in router state and redirects to `/login`. After login, the user is sent straight back to `/checkout` — the cart remains intact.

---

## 6. Module Documentation

### Auth module (`/login`, `/register`)

| File | Purpose |
|---|---|
| `pages/Login.tsx` | Email/password form + social login. Uses `react-hook-form` + Zod. Fully translated. |
| `pages/Register.tsx` | Registration form with the same pattern. |
| `components/auth/social-media-auth/SocialLogin.tsx` | Firebase OAuth buttons (Google, Facebook, Microsoft). |
| `hooks/useSocialAuth.ts` | Handles the Firebase `signInWithPopup` flow and updates the auth store. |
| `schemas/login.schema.ts` | Zod: email format + password min length. |
| `schemas/register.schema.ts` | Zod: username, email, password, confirm password. |

**Role-based redirect after login:**

```
Login success
  ├── Had an intended route (e.g. /checkout) → go there
  ├── ADMIN or MANAGER                       → /admin/products
  └── CUSTOMER                               → /
```

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
| `pages/admin/ProductsListPage.tsx` | Data table: search, sort (name/price/date), category filter, pagination, delete. |
| `pages/admin/CreateProductPage.tsx` | Product creation form with image upload. |
| `pages/admin/EditProductPage.tsx` | Pre-populated edit form. |
| `pages/admin/CategoriesPage.tsx` | Category CRUD. |
| `pages/admin/AdminOrdersPage.tsx` | All-orders view for admins/managers. |
| `components/admin/DeleteModal.tsx` | Confirmation dialog before permanent deletion. |

**Access control:** Both `ADMIN` and `MANAGER` roles can access all admin routes. Route is protected by `ProtectedRoute` + `RoleGuard allowedRoles={['ADMIN', 'MANAGER']}`.

**Admin i18n keys** — all admin UI strings are in `t('admin.*')`:

```typescript
admin.nav.{dashboard, products, categories, orders, signOut}
admin.products.{title, newProduct, search, allCategories, sort.*, table.*, ...}
admin.categories.{title, newCategory, empty}
admin.orders.{title, empty}
admin.deleteModal.{title, message, confirm, cancel}
```

---

## 7. State Management

All global state uses **Zustand** stores. Stores live in `src/store/`.

### `auth.store.ts`

| State | Type | Description |
|---|---|---|
| `user` | `User \| null` | Authenticated user object |
| `accessToken` | `string \| null` | JWT stored in memory (not localStorage) |

| Action | Description |
|---|---|
| `setAuth(user, token)` | Called after login/register. Sets user + token. |
| `logout()` | Clears user, token, removes cookie. |
| `refreshToken()` | Called by Axios interceptor on 401 to get a new token. |

The access token is kept **in memory** for security. The refresh token is in an HTTP-only cookie managed by the server.

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

### `ui.store.ts`

Drives `GlobalLoader` visibility.

| State | Type | Description |
|---|---|---|
| `activeApiRequestsCount` | `number` | Counter incremented on request start, decremented on settle. |

`GlobalLoader` renders visible when `activeApiRequestsCount > 0`. Using a counter (not a boolean) ensures parallel requests don't hide the loader early.

### `wishlist.store.ts`

Persisted to `localStorage`. Synced to server after login via `useWishlistSync`.

---

## 8. API Layer

### `src/api/axios.ts` — Axios instance

The shared Axios instance has two interceptors:

**Request interceptor:**
- Attaches the `Authorization: Bearer <token>` header from `auth.store`.
- Increments `ui.store.activeApiRequestsCount` (shows GlobalLoader) unless the request config has `showGlobalLoader: false`.

**Response interceptor:**
- Decrements `ui.store.activeApiRequestsCount` on both success and error.
- On `401 Unauthorized`: attempts a token refresh. If refresh succeeds, retries the original request. If it fails, calls `logout()` and redirects to `/login`.

**Opting out of the global loader:**

```typescript
// This request will NOT show the GlobalLoader overlay
axios.get('/products', { showGlobalLoader: false });
```

### API modules

| File | Endpoints |
|---|---|
| `auth.api.ts` | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/refresh` |
| `products.api.ts` | `GET /products`, `GET /products/:id`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `GET /categories` |
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
// Usage in components:
const { t } = useI18n();
t('nav.home')              // → 'Home' | 'الرئيسية'
t('auth.login.title')      // → 'Welcome back!' | 'مرحباً بعودتك!'
t('admin.nav.dashboard')   // → 'Dashboard' | 'لوحة التحكم'
```

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
| `common.*` | Shared: loading, error, add, remove, cancel… |
| `auth.login.*` | Login page |
| `auth.register.*` | Register page |
| `admin.nav.*` | Admin sidebar navigation |
| `admin.products.*` | Admin products table + forms |
| `admin.categories.*` | Admin categories page |
| `admin.orders.*` | Admin orders page |
| `admin.deleteModal.*` | Delete confirmation dialog |

### RTL (Right-to-Left)

When `lang === 'ar'`, `I18nProvider` sets `document.documentElement.dir = 'rtl'`. This causes the browser to automatically mirror flex layout, text alignment, and block flow.

For fine-grained overrides, use Tailwind's logical properties and RTL variants:

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

### Route tree summary

```
/login                  → Login (AuthLayout)
/register               → Register (AuthLayout)
/                       → HomePage (UserLayout, PUBLIC)
/products               → ProductsPage (UserLayout, PUBLIC)
/products/:slugId       → ProductDetailPage (UserLayout, PUBLIC)
/cart                   → CartPage (UserLayout, PUBLIC)
/checkout               → CheckoutPage (UserLayout, AUTH REQUIRED)
/orders                 → OrdersPage (UserLayout, AUTH REQUIRED)
/profile                → ProfilePage (UserLayout, AUTH REQUIRED)
/admin                  → redirect to /admin/products
/admin/products         → ProductsListPage (AdminLayout, ADMIN | MANAGER)
/admin/products/create  → CreateProductPage (AdminLayout, ADMIN | MANAGER)
/admin/products/:id/edit → EditProductPage (AdminLayout, ADMIN | MANAGER)
/admin/categories       → CategoriesPage (AdminLayout, ADMIN | MANAGER)
/admin/orders           → AdminOrdersPage (AdminLayout, ADMIN | MANAGER)
/unauthorized           → Unauthorized (no layout)
/error                  → Error (no layout)
*                       → NotFound (no layout, catch-all)
```

### `ProtectedRoute`

Checks `useAuthStore().user`. If `null`, redirects to `/login` with `state={{ from: location }}` so the user returns to their intended page after login.

### `RoleGuard`

```tsx
<RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
```

Checks `user.role` against `allowedRoles`. Redirects to `/unauthorized` on failure.

### Lazy loading

Every page component is loaded via `React.lazy()`:

```typescript
const ProductsPage = lazy(() => import('@/pages/user/ProductsPage'));
```

Each page's JS is in a separate chunk downloaded only when first visited. `GlobalLoader` (with `show` prop) is used as the `<Suspense>` fallback so it shows during chunk download too.

---

## 12. Mobile Navigation

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

## 13. Global Loader

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

`GlobalLoader` also accepts a `show` prop for use as a `<Suspense>` fallback during lazy chunk loading:

```tsx
<Suspense fallback={<GlobalLoader show />}>
  <LazyPage />
</Suspense>
```

---

## 14. Type Definitions

### `auth.types.ts`

```typescript
type Role = 'CUSTOMER' | 'ADMIN' | 'MANAGER';

type User = {
  _id: string;
  username: string;
  email: string;
  role: Role;
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

## 15. Utilities

### `utils/slug.ts` — `extractProductId(slugId)`

Parses the combined `<slug>-<ObjectId>` URL param and returns the 24-character ObjectId for API calls.

```typescript
extractProductId('nike-air-max-270-64c8f1234567890123456789')
// → '64c8f1234567890123456789'

extractProductId('64c8f1234567890123456789') // legacy pure-ID URL
// → '64c8f1234567890123456789'
```

### `utils/normalizeApiError.ts`

Extracts a human-readable error message from an Axios error object, falling back to a default string.

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

---

## 16. Configuration Files

### `tailwind.config.js`

```javascript
darkMode: 'class',      // Toggle by adding 'dark' to <html>
colors: {
  gray: { 750: '#2d3748' }  // Custom shade for dark sidebar rows
},
plugins: [animate]          // tailwindcss-animate for transitions
```

### `tsconfig.app.json`

Key settings:
- `"strict": true` — all strict TypeScript checks enabled
- `"paths": { "@/*": ["./src/*"] }` — `@/` alias for `src/`
- `"moduleResolution": "bundler"` — Vite-compatible resolution

### `vite.config.ts`

Uses `vite-tsconfig-paths` plugin so `@/` path aliases work without Vite-specific config duplication.

### `.hintrc`

Webhint configuration for browser compatibility and accessibility linting.

---

## 17. Development Guidelines

### Adding a new page

1. Create the component in `src/pages/<module>/MyPage.tsx`.
2. Add a `React.lazy()` import in `AppRouter.tsx`.
3. Add the route inside the appropriate layout group with `<Suspense fallback={<GlobalLoader show />}>`.
4. Add any new translation keys to `en.ts` → TypeScript will enforce `ar.ts` parity.

### Adding a new API call

1. Add the function to the relevant `src/api/*.api.ts` file.
2. The shared Axios instance handles auth headers and GlobalLoader automatically.
3. If the endpoint already has a skeleton, pass `showGlobalLoader: false`.

### Adding a new translation key

1. Add to `src/i18n/locales/en.ts` with an English value.
2. TypeScript will error in `ar.ts` until you add the Arabic equivalent.
3. Use `t('your.key')` in any component that calls `useI18n()`.

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

### Do not

- Store access tokens in `localStorage` — keep them in memory (auth store).
- Commit `.env` files — use `.env.example` for documentation.
- Import from `src/` using relative paths — always use `@/` alias.
- Use `any` — prefer `unknown` or properly typed generics.
- Add hardcoded English strings to UI components — use `t('key')` instead.
