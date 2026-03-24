# ShopHub

A production-ready, bilingual (English/Arabic, LTR/RTL) e-commerce SPA with a separate admin panel and enterprise-grade guard, error, content, and mock-backend architecture. Built with React 19, TypeScript, Zustand, and Tailwind CSS.

---

## Features

### Storefront
- Browse, search, filter, and purchase products without logging in
- Guest **cart** persisted in `localStorage`, merged into the server on login
- Guest **wishlist** persisted in `localStorage` — Heart icon in nav with live count badge
- Dedicated **Wishlist page** (`/wishlist`) fetches full product details in parallel
- Social login — Google, Facebook, Microsoft via Firebase OAuth
- Full Arabic RTL ↔ English LTR toggle, no page reload
- Class-based dark mode, persisted to `localStorage`, no FOUC on reload
- Two mobile nav modes: dropdown (default) or slide-in sidebar

### Checkout
- **React Hook Form + Zod** validation — inline field errors on blur/submit
- **Payment simulation** (mirrors Stripe test cards):
  - Any valid card → **payment approved** → order saved, cart cleared, success screen
  - Card starting with `0000` → **payment declined** → error banner, form stays editable
- Order POSTed to `/api/v1/ecommerce/orders` on success

### Admin Panel
- **Product CRUD** — create, edit, delete products with image upload
- **Category CRUD** — inline create, inline edit, delete with confirmation modal
- **Order management** — list and status updates
- Role-based access — `CUSTOMER`, `MANAGER`, `ADMIN` with layered route guards
- **Error Playground** — interactive sandbox to test every error scenario
- **Real-time Team Chat** — WebSocket-powered admin chat with rooms, presence, typing indicators, and notifications

### Enterprise Architecture
- **App Initialization Gate** — `AppInitializer` fetches locale + error config bundles before router mounts; `InitSkeleton` fullscreen loader prevents flash
- **Dynamic locale bundles** — served from mock server or real CMS; updated without a redeploy
- **Dynamic error config** — overrides static `ERROR_CONFIG_MAP` at runtime
- **Deep Link Guard** — async resource ownership + feature flag validation before render
- **Whitelist Guard** — per-route allowlists (role + userId + feature flag) from central config
- **Feature Guard** — gate any route behind a single feature flag
- **Target URL Redirect** — `/login?targetUrl=/orders/123` deep-link flow, survives new tabs
- **Global Error System** — centralized `ErrorCode` → display mode routing (PAGE / MODAL / TOAST / INLINE)
- **Content Provider** — `VITE_CONTENT_SOURCE=local` (mock server) or `backend` (real CMS)
- **React Error Boundary** — layout-level boundaries that auto-reset on route change
- **Axios Error Interceptor** — maps backend error codes to the global error store
- **WebSocket Realtime Layer** — singleton `SocketManager` with exponential-backoff reconnect, heartbeat, offline queue, and built-in mock simulation mode

### Mock Backend
- Full Express server at `http://localhost:3001` (`mock-server/server.cjs`)
- FreeAPI-compatible response envelope `{ statusCode, data, message, success }`
- Artificial delay (120–420 ms), optional random error injection
- Content bundle routes (`/content/default-en`, `/content/default-ar`, `/content/default-error`)
- Auth (login / register / refresh-token / current-user / logout)
- Products, Categories, Cart, Wishlist, Orders — full CRUD
- Seed data: 12 products, 4 categories, 2 users, 2 orders

---

## Tech Stack

| | |
|---|---|
| **React 19** + TypeScript 5.9 | UI + strict type safety |
| **React Router 7** | Nested routes, lazy loading, typed params |
| **Zustand 5** | Auth (+ feature flags), cart, wishlist, UI, error, init stores |
| **Tailwind CSS 3.4** | Utility-first styling with `dark:` and `rtl:` variants |
| **React Hook Form 7** + **Zod 4** | Form handling + validation (login, register, product, checkout) |
| **Axios 1.13** | HTTP client with auth + error system interceptors |
| **Firebase 12** | Google / Facebook / Microsoft OAuth |
| **Lucide React** | Tree-shaken SVG icons |
| **Vite 8** | Build tool with sub-second HMR + vendor chunk splitting |
| **Express** (mock-server) | Local mock backend — no real server needed in development |

---

## Getting Started

```bash
npm install

# Start Vite + mock server together (recommended for local dev)
npm run dev:all

# Or separately:
npm run dev:mock   # mock server on http://localhost:3001
npm run dev        # Vite on http://localhost:5173

# Production build
npm run build
npm run preview
npm run lint
```

### Test credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@test.com` | `Password123` |
| Admin | `admin@test.com` | `Password123` |

### Environment variables

| File | When used | Key settings |
|------|-----------|-------------|
| `.env` | All environments | Firebase config |
| `.env.local` | Development | `VITE_CONTENT_SOURCE=local`, `VITE_API_SOURCE=mock` |
| `.env.production` | Production build | `VITE_CONTENT_SOURCE=backend`, `VITE_API_SOURCE=real` |

```env
# .env — shared
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...

# .env.local — development (mock server)
VITE_CONTENT_SOURCE=local
VITE_API_SOURCE=mock
VITE_MOCK_SERVER_URL=http://localhost:3001

# .env.production
VITE_CONTENT_SOURCE=backend
VITE_API_SOURCE=real
VITE_LOGIN_AUTH_URL=https://api.yourapp.com/api/v1
```

**Network debug rule:** Open DevTools → Network tab:
- `GET /content/default-ar` → **LOCAL MODE** (mock server)
- `GET /content/be-default-ar` → **BACKEND MODE** (real CMS)

---

## Project Structure

```
src/
├── api/
│   ├── base/axios.ts         # Axios instance factory (auth, loader, error interceptors)
│   ├── auth.api.ts
│   ├── products.api.ts
│   ├── categories.api.ts
│   ├── cart.api.ts
│   ├── wishlist.api.ts
│   └── orders.api.ts
│
├── core/
│   ├── errors/               # ★ Global error system
│   │   ├── error.types.ts
│   │   ├── error.config.ts   #   11 error codes → icon, i18n keys, actions
│   │   ├── error.store.ts    #   Zustand: pageError / modalError / toastQueue / inlineError
│   │   ├── error.handler.ts
│   │   ├── default-error.ts  #   JSON-serializable bundle (served by mock server)
│   │   ├── GlobalErrorRenderer.tsx
│   │   └── ErrorBoundary.tsx
│   ├── init/                 # ★ App initialization gate
│   │   ├── init.store.ts     #   isReady, dynamicLocales, dynamicErrorConfig
│   │   ├── init.service.ts   #   fetchInitBundles() — parallel fetch with fallback
│   │   └── AppInitializer.tsx #  Gate: blocks AppRouter until bundles are ready
│   └── content/
│       └── content.service.ts #  useContent() — per-key CMS fetch with cache
│
├── features/
│   └── realtime/             # ★ WebSocket realtime layer
│       ├── types/
│       │   └── socket.types.ts     # All WS type contracts (events, payloads, status)
│       ├── socket/
│       │   └── socket.manager.ts   # Singleton: reconnect, heartbeat, queue, mock sim
│       ├── store/
│       │   └── realtime.store.ts   # Zustand: rooms, messages, presence, notifications
│       ├── hooks/
│       │   └── useAdminSocket.ts   # React hook exposing send/subscribe/status
│       └── providers/
│           └── RealtimeProvider.tsx # Lifecycle: connect on admin mount, disconnect on unmount
│
├── config/
│   ├── Define.ts             # authUrl Axios instance — mock or real based on VITE_API_SOURCE
│   ├── firebase.ts
│   └── whitelist.config.ts
│
├── i18n/
│   ├── i18n.context.tsx      # I18nProvider — prefers dynamicLocales from init.store
│   └── locales/
│       ├── default-en.ts     # Canonical English bundle (source of truth + Locale type)
│       ├── default-ar.ts     # Canonical Arabic bundle
│       ├── en.ts             # Re-exports defaultEn (backward compat)
│       └── ar.ts             # Re-exports defaultAr (backward compat)
│
├── pages/
│   ├── user/
│   │   ├── WishlistPage.tsx
│   │   ├── CheckoutPage.tsx  # RHF + Zod — payment simulation (approved / declined)
│   │   ├── ProductDetailPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── HomePage.tsx
│   └── admin/
│       ├── ProductsListPage.tsx
│       ├── CreateProductPage.tsx
│       ├── EditProductPage.tsx
│       ├── CategoriesPage.tsx    # Inline create/edit/delete
│       ├── AdminOrdersPage.tsx
│       ├── DashboardPage.tsx
│       ├── ErrorPlaygroundPage.tsx
│       └── RealtimeChatPage.tsx  # ★ NEW — WebSocket team chat demo
│
├── schemas/
│   ├── login.schema.ts
│   ├── register.schema.ts
│   ├── product.schema.ts
│   └── checkout.schema.ts    # Zod + isDeclinedCard() helper
│
├── store/
│   ├── auth.store.ts
│   ├── cart.store.ts         # Reactive selector: items.reduce (live badge)
│   ├── wishlist.store.ts     # Reactive selector: items.length (live badge)
│   ├── ui.store.ts
│   └── init.store.ts         # isReady, dynamicLocales, dynamicErrorConfig
│
└── layouts/
    ├── UserLayout.tsx         # Wishlist + Cart live badges (reactive Zustand selectors)
    ├── AdminLayout.tsx        # ★ Notification bell badge + RealtimeProvider wrapper
    └── AuthLayout.tsx

mock-server/
├── server.cjs                # Express mock backend (auth, products, categories, orders…)
├── db.json                   # Seed data + inline locale/error bundles
└── package.json              # "type": "commonjs" isolation
```

---

## Route Structure

```
/login, /register                → AuthLayout             (public)
/, /products, /products/:slugId  → UserLayout             (public)
/cart, /wishlist                 → UserLayout             (public)
/checkout, /orders, /profile     → ProtectedRoute > UserLayout
/orders/:id                      → ProtectedRoute > DeepLinkGuard(order) > UserLayout
/admin                           → redirect → /admin/dashboard
/admin/dashboard                 → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products                  → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products/create           → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/products/:id/edit         → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/categories                → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/orders                    → ProtectedRoute > WhitelistGuard > RoleGuard > AdminLayout
/admin/realtime-chat             → ProtectedRoute > WhitelistGuard > RoleGuard > FeatureGuard(realtimeChat) > AdminLayout
/admin/error-playground          → ProtectedRoute > WhitelistGuard > RoleGuard > FeatureGuard(errorPlayground) > AdminLayout
/unauthorized, /error, *         → standalone
```

---

## Checkout Payment Simulation

| Card number | Result |
|-------------|--------|
| `0000 0000 0000 0000` | **Declined** — error banner shown, form stays editable |
| Any other valid card | **Approved** — order saved, cart cleared, success screen |

---

## Error System Quick Reference

```ts
import { useErrorStore } from '@/core/errors/error.store';

useErrorStore.getState().pushError('ORDER_NOT_FOUND');

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

## Internationalisation

```typescript
const { t, lang, setLang } = useI18n();
t('nav.home')              // 'Home' | 'الرئيسية'
t('nav.wishlist')          // 'Wishlist' | 'المفضلة'
setLang('ar')              // switches to RTL — document.dir set automatically
```

**Key namespaces:** `nav`, `home`, `products`, `product`, `cart`, `wishlist`, `checkout`, `orders`, `profile`, `common`, `errors`, `auth.login`, `auth.register`, `admin.*`

---

## Realtime WebSocket System

```ts
import { useAdminSocket } from '@/features/realtime/hooks/useAdminSocket';
import { useRealtimeStore } from '@/features/realtime/store/realtime.store';

// Hook — connection status + typed send/subscribe
const { connectionStatus, sendMessage, subscribe, unsubscribe } = useAdminSocket();

// Store — messages, presence, notifications (granular selectors)
const messages    = useRealtimeStore((s) => s.rooms['general']?.messages ?? []);
const onlineUsers = useRealtimeStore((s) => s.onlineUsers);
const unreadCount = useRealtimeStore((s) => s.unreadCount);
```

| Feature | Detail |
|---|---|
| Singleton | One `WebSocket` per browser tab, shared across all hooks |
| Reconnect | Exponential backoff + ±30% jitter — 1 s → 2 s → 4 s → 8 s → 16 s (max 5 attempts) |
| Heartbeat | Client-side ping every 25 s; 10 s pong timeout triggers reconnect. Paused when tab is hidden (Page Visibility API) |
| Offline queue | Messages queued (cap: 50) while disconnected and drained in order on reconnect. Retries suspended while browser is offline (`offline` event) and re-triggered on `online` |
| Mock mode | Auto-activated in dev (`apiSource === 'mock'`) — timer-driven simulation using the same event API. Mock timers self-remove from a `Set` after firing (no memory leak) |
| Error routing | Connection failures → `pushError('NETWORK_ERROR', { displayModeOverride: 'TOAST' })` |
| Frame guards | Binary frames ignored; oversized frames (> 64 KB) dropped before parsing |
| Status dedup | `setStatus()` is a no-op when status is unchanged — no spurious Zustand re-renders |
| Console logging | Timestamped, colour-coded `[Socket HH:mm:ss.mmm]` logs for every lifecycle event |
| No GlobalLoader | WebSocket activity never touches the Axios semaphore |

Demo page: `/admin/realtime-chat` (requires `realtimeChat` feature flag, enabled by default in dev)

---

Full developer reference → [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## License

MIT
