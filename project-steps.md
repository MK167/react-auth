# Blueprint: Building This Project from Scratch

Follow these phases **in order** — each layer depends on the one before it.

---

## Phase 1 — Scaffold & Tooling
**Goal: working dev environment before writing any app code.**

```
1. npm create vite@latest react-auth -- --template react-ts
2. Install core deps:
   - tailwindcss + postcss + autoprefixer  →  npx tailwindcss init -p
   - react-router-dom
   - zustand
   - axios
   - react-hook-form + zod + @hookform/resolvers
   - firebase
3. Configure:
   - tsconfig.app.json  →  strict: true, path aliases (@/src)
   - vite.config.ts     →  resolve aliases, dev proxy to mock server
   - tailwind.config.js →  content paths
   - eslint.config.js   →  react + ts + hooks rules
4. Create src/environments/environment.ts  (wrap import.meta.env)
5. Create src/config/Define.ts             (route constants, storage keys)
```

---

## Phase 2 — Mock Server
**Goal: API exists before writing a single fetch call.**

```
1. mkdir mock-server
2. npm init, install json-server + cors + express
3. Write db.json  →  seed: users, products, categories, orders, cart, wishlist
4. Write server.cjs  →  custom auth endpoints, JWT sign/verify middleware
5. Verify: npm start → GET /products returns data
```

---

## Phase 3 — Types & Schemas
**Goal: define data contracts first, implement later.**

```
src/types/
  auth.types.ts       User, AuthResponse, LoginPayload
  product.types.ts    Product, Category
  cart.types.ts       Cart, CartItem
  order.types.ts      Order, OrderStatus
  wishlist.types.ts   WishlistItem

src/schemas/
  login.schema.ts
  register.schema.ts
  product.schema.ts
  checkout.schema.ts
```

> Write types before stores, stores before API calls, API calls before pages.

---

## Phase 4 — HTTP Layer
**Goal: one Axios instance, all API modules.**

```
src/api/base/axios.ts
  - baseURL from environment
  - request interceptor  → attach Bearer token from cookie
  - response interceptor → 401 → refresh → retry, else logout
  - error interceptor    → call normalizeApiError

src/utils/normalizeApiError.ts   (Axios error → AppError)
src/utils/cookie.service.ts      (get/set/delete helpers)

src/api/
  auth.api.ts
  products.api.ts
  cart.api.ts
  orders.api.ts
  categories.api.ts
  wishlist.api.ts
```

---

## Phase 5 — Global State (Zustand Stores)
**Goal: state exists before any component reads it.**

```
src/store/
  auth.store.ts      user, token, isAuthenticated, login(), logout()
  cart.store.ts      items, addItem(), removeItem(), updateQty()
  wishlist.store.ts  items, add(), remove()
  ui.store.ts        sidebarOpen, globalLoading

src/core/errors/
  error.types.ts
  error.config.ts    (status code → message map)
  default-error.ts
  error.store.ts     (currentError, setError, clearError)
  error.handler.ts   (normalize + dispatch to store)
```

---

## Phase 6 — App Initialization
**Goal: auth state resolved before any route renders.**

```
src/core/init/
  init.store.ts      status: idle | loading | done | error
  init.service.ts    verifyToken → getMe → prefetchContent
  AppInitializer.tsx reads init store, shows skeleton or children

src/utils/prefetch.ts        (parallel warm-up calls)
src/core/content/
  content.service.ts         (categories, featured products)

src/components/ui/
  InitSkeleton.tsx
  Skeleton.tsx
src/components/common/
  GlobalLoader.tsx
```

---

## Phase 7 — i18n & Theme
**Goal: every component can call `t('key')` and read the theme.**

```
src/i18n/locales/
  default-en.ts / default-ar.ts   (core strings)
  en.ts / ar.ts                    (feature strings, merge on top)

src/i18n/
  i18n.types.ts
  i18n.context.tsx    I18nProvider → merges dictionaries, setLanguage()
  use-i18n.hook.ts    useI18n() → { t, lang, setLang }

src/themes/
  theme.context.tsx   ThemeProvider → { theme, toggleTheme }
```

---

## Phase 8 — Reusable Components
**Goal: build the component library before pages.**

```
src/components/form/input/
  index.type.ts
  FormInputControl.tsx   (label + input + error, react-hook-form ready)

src/components/auth/common/
  Spinner.tsx
  Divider.tsx
  ErrorNotification.tsx
  icons/  GoogleIcon, FacebookIcon, Microsoft

src/components/auth/social-media-auth/
  SocialLogin.tsx        (uses useSocialAuth hook)

src/components/admin/
  DeleteModal.tsx
```

---

## Phase 9 — Firebase & Social Auth
**Goal: OAuth works independently of pages.**

```
src/config/firebase.ts        initializeApp with env vars
src/hooks/useSocialAuth.ts    signInWithPopup → map to auth store
```

---

## Phase 10 — Layouts
**Goal: shells ready before dropping pages into them.**

```
src/layouts/
  AuthLayout.tsx    centered card, no nav
  UserLayout.tsx    navbar + footer + <Outlet />
  AdminLayout.tsx   sidebar + topbar + <Outlet />
```

---

## Phase 11 — Route Guards
**Goal: protection logic before wiring any routes.**

```
src/config/whitelist.config.ts

src/routes/
  ProtectedRoute.tsx   isAuthenticated? → render : redirect /login
  RoleGuard.tsx        hasRole? → render : redirect /unauthorized
  WhitelistGuard.tsx   emailInList? → render : redirect
  FeatureGuard.tsx     featureFlag on? → render : redirect
  DeepLinkGuard.tsx    saves intended URL, restores after login
```

---

## Phase 12 — Pages
**Build in this order — simpler pages first.**

```
Auth pages first (no guards needed to test):
  Login.tsx  →  Register.tsx

Error/utility pages:
  NotFound.tsx  →  Unauthorized.tsx  →  Error.tsx

User pages (protected):
  HomePage → ProductsPage → ProductDetailPage
  CartPage → CheckoutPage → OrdersPage
  WishlistPage → ProfilePage

Admin pages (role-guarded):
  DashboardPage → ProductsListPage → CreateProductPage → EditProductPage
  CategoriesPage → AdminOrdersPage → ErrorPlaygroundPage
```

---

## Phase 13 — Router
**Wire everything together last.**

```
src/routes/AppRouter.tsx

Structure:
  /                   → AuthLayout  → Login, Register  (public)
  /                   → UserLayout  → ProtectedRoute → user pages
  /admin              → AdminLayout → ProtectedRoute → RoleGuard → admin pages
  *                   → NotFound

Wrap in AppInitializer + ErrorBoundary in App.tsx
```

---

## Phase 14 — Realtime Feature
**Self-contained — add after core app is stable.**

```
src/features/realtime/
  types/socket.types.ts
  socket/socket.manager.ts     (connection, reconnect, heartbeat, queue)
  store/realtime.store.ts      (messages, status)
  providers/RealtimeProvider.tsx
  hooks/useAdminSocket.ts

pages/admin/RealtimeChatPage.tsx
```

---

## Phase 15 — Post-Auth Sync Hooks
**Run after login to reconcile local and server state.**

```
src/hooks/
  useCartMerge.ts       guest cart → server cart
  useWishlistSync.ts    local wishlist → server wishlist
  useDebounce.ts        (utility, used in search inputs)
```

---

## Phase 16 — Error Boundaries & Global Error UI

```
src/core/errors/
  ErrorBoundary.tsx       class component wrapping router
  GlobalErrorRenderer.tsx reads error store → toast/modal/banner

Mount both in App.tsx
```

---

## Phase 17 — Wire Error Handling into Axios
**Connect the handler built in Phase 5 to the interceptor from Phase 4.**

```
axios.ts response interceptor → call error.handler.ts → dispatches to error.store
```

---

## Summary: Build Order Principle

```
Config & Tooling
    ↓
Mock Server (API contract)
    ↓
Types & Schemas (data contracts)
    ↓
HTTP Layer (Axios + API modules)
    ↓
Zustand Stores (state)
    ↓
App Init (auth bootstrap)
    ↓
i18n + Theme (cross-cutting concerns)
    ↓
Reusable Components (UI atoms)
    ↓
Layouts (page shells)
    ↓
Route Guards (protection logic)
    ↓
Pages (leaf nodes, consume everything above)
    ↓
Router (wire it all together)
    ↓
Realtime Feature (isolated module)
    ↓
Post-login sync hooks
    ↓
Global error boundaries
```

> **Rule of thumb:** never build a consumer before its dependency exists.
> Types → Stores → API → Components → Pages → Router.
