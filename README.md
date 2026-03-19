# ShopHub

A production-ready, bilingual (English/Arabic, LTR/RTL) e-commerce SPA with a separate admin panel and enterprise-grade guard, error, and content architecture. Built with React 19, TypeScript, Zustand, and Tailwind CSS.

---

## Features

### Storefront
- Browse, search, filter, and purchase products without logging in
- Guest cart persisted in `localStorage`, merged into the server on login
- Social login — Google, Facebook, Microsoft via Firebase OAuth
- Full Arabic RTL ↔ English LTR toggle, no page reload
- Class-based dark mode, persisted to `localStorage`, no FOUC on reload
- Two mobile nav modes: dropdown (default) or slide-in sidebar

### Admin Panel
- Product CRUD, category management, order management
- Role-based access — `CUSTOMER`, `MANAGER`, `ADMIN` with layered route guards
- **Error Playground** — interactive sandbox to test every error scenario

### Enterprise Architecture
- **Deep Link Guard** — async resource ownership + feature flag validation before render
- **Whitelist Guard** — per-route allowlists (role + userId + feature flag) from central config
- **Feature Guard** — gate any route behind a single feature flag
- **Target URL Redirect** — `/login?targetUrl=/orders/123` deep-link flow, survives new tabs
- **Global Error System** — centralized `ErrorCode` → display mode routing (PAGE / MODAL / TOAST / INLINE)
- **CMS Content Provider** — `VITE_CONTENT_MODE=LOCAL` (i18n) or `CMS` (remote endpoint with cache + fallback)
- **React Error Boundary** — layout-level boundaries that auto-reset on route change
- **Axios Error Interceptor** — maps backend error codes to the global error store, no hard navigation
- **Error Boundary** — catches render errors per-layout, shows recovery UI
- **Error Playground Page** — `/admin/error-playground` — trigger any error, toggle feature flags, preview all codes

---

## Tech Stack

| | |
|---|---|
| **React 19** + TypeScript 5.9 | UI + strict type safety |
| **React Router 7** | Nested routes, lazy loading, typed params |
| **Zustand 5** | Auth (+ feature flags), cart, wishlist, UI, error stores |
| **Tailwind CSS 3.4** | Utility-first styling with `dark:` and `rtl:` variants |
| **React Hook Form 7** + **Zod 4** | Form handling + validation |
| **Axios 1.13** | HTTP client with auth + error system interceptors |
| **Firebase 12** | Google / Facebook / Microsoft OAuth |
| **Lucide React** | Tree-shaken SVG icons |
| **Vite 8** | Build tool with sub-second HMR |

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # preview production build
npm run lint       # ESLint
```

### Environment variables

The project uses three env files:

| File | When used | Key setting |
|------|-----------|-------------|
| `.env` | All environments | Firebase config, API base URL |
| `.env.local` | Development | `VITE_CONTENT_MODE=LOCAL` |
| `.env.production` | Production build | `VITE_CONTENT_MODE=CMS`, CMS endpoint |

```env
# .env
VITE_LOGIN_AUTH_URL=https://api.freeapi.app/api/v1
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...

# .env.local
VITE_CONTENT_MODE=LOCAL

# .env.production
VITE_CONTENT_MODE=CMS
VITE_CMS_ENDPOINT=https://your-cms.example.com/content
```

---

## Project Structure

```
src/
├── api/
│   ├── base/
│   │   └── axios.ts          # Axios instance factory (auth, loader, error interceptors)
│   ├── auth.api.ts
│   ├── products.api.ts
│   ├── cart.api.ts
│   ├── orders.api.ts
│   ├── categories.api.ts
│   └── wishlist.api.ts
│
├── core/
│   ├── errors/               # ★ Global error system
│   │   ├── error.types.ts    #   ErrorCode, ErrorDisplayMode, ErrorConfig, ActiveError
│   │   ├── error.config.ts   #   Config map: 11 error codes → icon, i18n keys, actions
│   │   ├── error.store.ts    #   Zustand: pageError / modalError / toastQueue / inlineError
│   │   ├── error.handler.ts  #   resolveErrorCode() + handleApiError() + handleRouteError()
│   │   ├── GlobalErrorRenderer.tsx  # PAGE overlay, MODAL dialog, TOAST stack via portals
│   │   └── ErrorBoundary.tsx #   Class component; auto-resets on resetKey change
│   └── content/              # ★ CMS content service
│       └── content.service.ts  # useContent() hook — LOCAL (i18n) or CMS (fetch + cache)
│
├── config/
│   ├── Define.ts             # Axios instance export (authUrl)
│   ├── firebase.ts           # Firebase app initialisation
│   └── whitelist.config.ts   # ★ Per-route allowlist rules + findWhitelistRule()
│
├── components/
│   ├── admin/DeleteModal.tsx
│   ├── auth/…
│   ├── common/GlobalLoader.tsx
│   ├── form/…
│   └── ui/Skeleton.tsx
│
├── hooks/
│   ├── useCartMerge.ts
│   ├── useDebounce.ts
│   ├── useSocialAuth.ts
│   └── useWishlistSync.ts
│
├── i18n/
│   ├── i18n.context.tsx      # I18nProvider, useI18n, t() resolver
│   └── locales/
│       ├── en.ts             # Source of truth (includes errors.* namespace)
│       └── ar.ts             # Arabic — must satisfy Locale type
│
├── layouts/
│   ├── AdminLayout.tsx       # Wrapped in ErrorBoundary in AppRouter
│   ├── AuthLayout.tsx
│   └── UserLayout.tsx        # Wrapped in ErrorBoundary in AppRouter
│
├── pages/
│   ├── Error.tsx             # Reusable — works via ?type= URL param OR code prop
│   ├── NotFound.tsx
│   ├── Unauthorized.tsx
│   ├── Login.tsx             # Reads ?targetUrl= for deep-link redirect after login
│   ├── Register.tsx
│   ├── admin/
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsListPage.tsx
│   │   ├── CreateProductPage.tsx
│   │   ├── EditProductPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── AdminOrdersPage.tsx
│   │   └── ErrorPlaygroundPage.tsx  # ★ Interactive error testing sandbox
│   └── user/
│       ├── HomePage.tsx
│       ├── ProductsPage.tsx
│       ├── ProductDetailPage.tsx
│       ├── CartPage.tsx
│       ├── CheckoutPage.tsx
│       ├── OrdersPage.tsx
│       └── ProfilePage.tsx
│
├── routes/
│   ├── AppRouter.tsx         # Full route tree with all guards wired
│   ├── ProtectedRoute.tsx    # Auth gate → /login?targetUrl=<path>
│   ├── RoleGuard.tsx         # Role check → /unauthorized
│   ├── WhitelistGuard.tsx    # ★ Fine-grained role/userId/flag allowlist
│   ├── FeatureGuard.tsx      # ★ Single feature flag gate
│   └── DeepLinkGuard.tsx     # ★ Async ownership check + feature flag validation
│
├── schemas/                  # Zod schemas (login, register, product)
│
├── store/
│   ├── auth.store.ts         # user, accessToken, featureFlags (+ setFeatureFlags)
│   ├── cart.store.ts         # Cart with localStorage persist
│   ├── ui.store.ts           # activeApiRequestsCount, toastQueue, modal
│   └── wishlist.store.ts
│
├── themes/theme.context.tsx
├── types/                    # auth.types (UserType + permissions?), product, cart, order
└── utils/
    ├── cookie.service.ts
    ├── normalizeApiError.ts
    ├── prefetch.ts
    └── slug.ts
```

Full developer reference → [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## Route Structure

```
/login, /register                → AuthLayout             (public)
/, /products, /products/:slugId  → UserLayout             (public)
/cart                            → UserLayout             (public)
/checkout, /orders, /profile     → ProtectedRoute > UserLayout
/orders/:id                      → ProtectedRoute > DeepLinkGuard(order) > UserLayout
/admin                           → redirect → /admin/dashboard
/admin/dashboard                 → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products                  → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products/create           → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products/:id/edit         → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/categories                → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/orders                    → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/error-playground          → ProtectedRoute > WhitelistGuard > RoleGuard > FeatureGuard > AdminLayout
/unauthorized                    → standalone
/error                           → standalone (accepts ?type= or code prop)
*                                → NotFound
```

---

## Auth Redirection Flow

```
User visits /orders/123 (not logged in)
  → ProtectedRoute → /login?targetUrl=%2Forders%2F123
  → User logs in
  → Login.tsx reads ?targetUrl, validates, navigates → /orders/123
  → If no targetUrl: ADMIN/MANAGER → /admin/products, CUSTOMER → /
```

---

## Error System Quick Reference

```ts
// Push any error from anywhere (interceptor, guard, component)
import { useErrorStore } from '@/core/errors/error.store';

useErrorStore.getState().pushError('ORDER_NOT_FOUND');

// Override display mode:
useErrorStore.getState().pushError('SERVER_ERROR', {
  displayModeOverride: 'TOAST',
  onRetry: () => refetch(),
});
```

| Display mode | Behavior |
|---|---|
| `PAGE` | Fullscreen overlay — replaces all content |
| `MODAL` | Dialog overlay — user must act or dismiss |
| `TOAST` | Bottom-right stack — auto-dismisses after 4s |
| `INLINE` | Component subscribes to `inlineError` directly |

---

## Content Service Quick Reference

```ts
// Use in any component — automatically LOCAL or CMS based on VITE_CONTENT_MODE
import { useContent } from '@/core/content/content.service';

const { getContent } = useContent();
return <h1>{getContent('home.hero.title')}</h1>;
```

---

## Internationalisation

```typescript
const { t, lang, setLang } = useI18n();
t('nav.home')              // 'Home' | 'الرئيسية'
t('errors.orderNotFound.title')  // 'Order Not Found' | 'الطلب غير موجود'
setLang('ar')              // switches to RTL — document.dir set automatically
```

**Key namespaces:** `nav`, `home`, `products`, `product`, `cart`, `checkout`, `orders`, `profile`, `common`, `errors`, `auth.login`, `auth.register`, `admin.*`

---

## License

MIT
