# Project File Reference — `react-auth`

---

## 📁 `.claude/`

| File | Purpose | When Used |
|------|---------|-----------|
| `settings.json` | Claude Code IDE configuration — permissions, hooks, allowed tools | Loaded automatically when Claude Code runs in this workspace |

---

## 📁 `mock-server/`

A standalone local JSON REST API server for development without a real backend.

| File | Purpose | When Used |
|------|---------|-----------|
| `db.json` | The database — contains all fake data (users, products, orders, cart, wishlist, categories) as JSON collections | Read/written by `json-server` on every API request |
| `package.json` | Dependencies + scripts for the mock server (json-server, cors) | `npm install` / `npm start` inside this folder |
| `server.cjs` | Custom Express wrapper around json-server — adds middleware, auth logic, custom routes | Runs with `node server.cjs`; intercepts requests before json-server handles them |

---

## 📁 `public/`

Static assets served as-is by Vite — never bundled.

| File | Purpose | When Used |
|------|---------|-----------|
| `favicon.svg` | Browser tab icon | Auto-loaded by `index.html` |
| `icons.svg` | SVG sprite sheet — all UI icons in one file | Referenced via `<use href="/icons.svg#icon-name">` anywhere in the app |

---

## 📁 `src/api/`

All HTTP communication layer — each file maps to one resource domain.

| File | Purpose | When Used |
|------|---------|-----------|
| `base/axios.ts` | Creates the shared Axios instance with `baseURL`, interceptors (attach JWT, handle 401 refresh, normalize errors) | Imported by every `*.api.ts` file — the single HTTP client |
| `auth.api.ts` | `login`, `register`, `logout`, `refreshToken`, `getMe` calls | Called from auth store actions and `AppInitializer` |
| `cart.api.ts` | `getCart`, `addItem`, `removeItem`, `updateQty`, `clearCart` | Called from cart store |
| `categories.api.ts` | `getCategories`, `createCategory`, `deleteCategory` | Called from admin categories page and product forms |
| `orders.api.ts` | `placeOrder`, `getUserOrders`, `getAllOrders` (admin) | Called from checkout flow and orders pages |
| `products.api.ts` | `getProducts`, `getProductBySlug`, `createProduct`, `updateProduct`, `deleteProduct` | Called from product pages and admin CRUD pages |
| `wishlist.api.ts` | `getWishlist`, `addToWishlist`, `removeFromWishlist` | Called from wishlist store |

---

## 📁 `src/assets/`

Bundled static assets imported directly in components.

| File | Purpose | When Used |
|------|---------|-----------|
| `hero.png` | Hero section background/image on the homepage | Used in `HomePage.tsx` |
| `react.svg` | React logo (scaffold leftover) | Rarely used; can be removed |
| `vite.svg` | Vite logo (scaffold leftover) | Rarely used; can be removed |

---

## 📁 `src/components/`

### `admin/`

| File | Purpose | When Used |
|------|---------|-----------|
| `DeleteModal.tsx` | Confirmation dialog before deleting a product/category | Triggered from admin list pages when delete button is clicked |

### `auth/common/`

| File | Purpose | When Used |
|------|---------|-----------|
| `error-notification/ErrorNotification.tsx` | Inline error banner for auth form failures (wrong password, user exists, etc.) | Rendered inside Login/Register forms conditionally |
| `icons/FacebookIcon.tsx` | Facebook SVG icon component | Used in `SocialLogin.tsx` |
| `icons/GoogleIcon.tsx` | Google SVG icon component | Used in `SocialLogin.tsx` |
| `icons/Microsoft.tsx` | Microsoft SVG icon component | Used in `SocialLogin.tsx` |
| `spinner/Spinner.tsx` | Loading spinner for async auth operations | Shown inside buttons during login/register submit |

### `auth/`

| File | Purpose | When Used |
|------|---------|-----------|
| `social-media-auth/SocialLogin.tsx` | Google / Facebook / Microsoft OAuth buttons | Rendered in `Login.tsx` and `Register.tsx` |
| `Divider.tsx` | "or" visual separator between form and social buttons | Used in auth pages between the form and `SocialLogin` |

### `common/`

| File | Purpose | When Used |
|------|---------|-----------|
| `GlobalLoader.tsx` | Full-screen loading overlay | Shown while `AppInitializer` bootstraps the app (auth check, prefetches) |

### `form/input/`

| File | Purpose | When Used |
|------|---------|-----------|
| `FormInputControl.tsx` | Reusable controlled input with label, error message, and `react-hook-form` integration | Used in every form (login, register, checkout, product create/edit) |
| `index.type.ts` | TypeScript prop types for `FormInputControl` | Imported alongside the component |

### `ui/`

| File | Purpose | When Used |
|------|---------|-----------|
| `InitSkeleton.tsx` | Full-page skeleton placeholder during app initialization | Shown by `AppInitializer` before content is ready |
| `Skeleton.tsx` | Generic reusable skeleton block for individual content areas | Used inside pages while data is loading (products list, etc.) |

---

## 📁 `src/config/`

| File | Purpose | When Used |
|------|---------|-----------|
| `Define.ts` | App-wide constants — API base URL, route paths, storage keys, feature flags | Imported wherever a magic string/number would otherwise be used |
| `firebase.ts` | Firebase app initialization with env-var config | Imported by `useSocialAuth.ts` for OAuth providers |
| `whitelist.config.ts` | List of allowed emails/domains for `WhitelistGuard` | Read by `WhitelistGuard` to gate certain routes |

---

## 📁 `src/core/`

App-level infrastructure — not feature-specific.

### `content/`

| File | Purpose | When Used |
|------|---------|-----------|
| `content.service.ts` | Fetches and caches initial content data (categories, featured products) on app boot | Called by `init.service.ts` during `AppInitializer` |

### `errors/`

| File | Purpose | When Used |
|------|---------|-----------|
| `default-error.ts` | Fallback error message definitions for unknown error codes | Used by `error.handler.ts` when no specific message maps |
| `error.config.ts` | Maps HTTP status codes / error codes → user-facing messages | Used by `error.handler.ts` |
| `error.handler.ts` | Central function that normalizes any thrown error and dispatches it to the error store | Called from Axios interceptors and try/catch blocks |
| `error.store.ts` | Zustand store holding the current global error state | Read by `GlobalErrorRenderer` and written by `error.handler.ts` |
| `error.types.ts` | TypeScript interfaces for error shape (`AppError`, severity levels) | Used across error infrastructure |
| `ErrorBoundary.tsx` | React class-based error boundary that catches render-time JS crashes | Wraps the router in `App.tsx` |
| `GlobalErrorRenderer.tsx` | Reads the error store and renders toast/modal/banner based on severity | Mounted once in `App.tsx`, always present |

### `init/`

| File | Purpose | When Used |
|------|---------|-----------|
| `AppInitializer.tsx` | React component that orchestrates app boot sequence — shows skeleton, triggers `init.service`, then renders children | Wraps the entire router in `App.tsx` |
| `init.service.ts` | Async function: verifies auth token → fetches user profile → prefetches content | Called once by `AppInitializer` on mount |
| `init.store.ts` | Zustand store tracking init status (`idle` / `loading` / `done` / `error`) | Read by `AppInitializer` to decide what to render |

---

## 📁 `src/environments/`

| File | Purpose | When Used |
|------|---------|-----------|
| `environment.ts` | Dev environment variables (API URL, feature flags) | Imported everywhere instead of `import.meta.env` directly |
| `environment.prod.ts` | Production overrides | Vite swaps this in via alias during `npm run build` |

---

## 📁 `src/features/realtime/`

Self-contained WebSocket feature module.

| File | Purpose | When Used |
|------|---------|-----------|
| `socket/socket.manager.ts` | `SocketManager` class — handles connection lifecycle, reconnect strategy, heartbeat, offline queue, frame guards | Instantiated once in `RealtimeProvider` |
| `providers/RealtimeProvider.tsx` | React context provider that creates/destroys the `SocketManager` and exposes it via context | Wraps admin routes that need real-time data |
| `hooks/useAdminSocket.ts` | Custom hook that consumes `RealtimeProvider` context and subscribes to admin-specific socket events | Used in `RealtimeChatPage` and admin dashboard |
| `store/realtime.store.ts` | Zustand store for real-time chat messages and connection status | Written by socket event handlers, read by chat UI |
| `types/socket.types.ts` | TypeScript interfaces for socket events, message payloads, connection state | Used across the entire realtime feature |

---

## 📁 `src/hooks/`

Global reusable hooks — not tied to one feature.

| File | Purpose | When Used |
|------|---------|-----------|
| `useCartMerge.ts` | Merges guest cart with server cart after login | Called once after successful authentication |
| `useDebounce.ts` | Delays a value update — prevents excessive API calls on fast input | Used in search inputs |
| `useSocialAuth.ts` | Wraps Firebase OAuth popup flow and maps result to app auth store | Called from `SocialLogin.tsx` button handlers |
| `useWishlistSync.ts` | Syncs local wishlist to server after login | Called once after successful authentication |

---

## 📁 `src/i18n/`

Internationalization (Arabic / English).

| File | Purpose | When Used |
|------|---------|-----------|
| `locales/en.ts` | English translation strings (feature-specific) | Merged with defaults to form full EN dictionary |
| `locales/ar.ts` | Arabic translation strings (feature-specific) | Merged with defaults to form full AR dictionary |
| `locales/default-en.ts` | Core/fallback English strings (errors, common labels) | Always loaded; feature strings overlay these |
| `locales/default-ar.ts` | Core/fallback Arabic strings | Always loaded |
| `i18n.context.tsx` | React context provider — holds active language, merged dictionary, `setLanguage` | Wraps the app in `main.tsx` |
| `i18n.types.ts` | Types for locale keys, translation map shape | Used across i18n infrastructure |
| `use-i18n.hook.ts` | `useI18n()` — returns `t(key)` translator and current language | Used in every component that displays text |

---

## 📁 `src/layouts/`

Shell components that define page structure for each user role.

| File | Purpose | When Used |
|------|---------|-----------|
| `AdminLayout.tsx` | Sidebar + topbar shell for all `/admin/*` pages | Wraps admin routes in `AppRouter` |
| `AuthLayout.tsx` | Centered card layout for login/register | Wraps auth routes |
| `UserLayout.tsx` | Navbar + footer shell for all `/user/*` pages | Wraps user routes |

---

## 📁 `src/pages/`

### `admin/`

| File | Purpose | When Used |
|------|---------|-----------|
| `DashboardPage.tsx` | Admin home — stats, recent orders summary | Route: `/admin` |
| `ProductsListPage.tsx` | Paginated product table with edit/delete | Route: `/admin/products` |
| `CreateProductPage.tsx` | Form to create a new product | Route: `/admin/products/create` |
| `EditProductPage.tsx` | Pre-filled form to edit an existing product | Route: `/admin/products/:id/edit` |
| `CategoriesPage.tsx` | Category list with add/delete | Route: `/admin/categories` |
| `AdminOrdersPage.tsx` | All orders from all users with status management | Route: `/admin/orders` |
| `RealtimeChatPage.tsx` | WebSocket-powered live chat interface | Route: `/admin/chat` |
| `ErrorPlaygroundPage.tsx` | Dev tool to trigger different error types and test error UI | Route: `/admin/error-playground` |

### `user/`

| File | Purpose | When Used |
|------|---------|-----------|
| `HomePage.tsx` | Landing page with hero, featured products | Route: `/` |
| `ProductsPage.tsx` | Browse/filter/search product catalog | Route: `/products` |
| `ProductDetailPage.tsx` | Single product view with add-to-cart/wishlist | Route: `/products/:slug` |
| `CartPage.tsx` | Shopping cart view with qty controls | Route: `/cart` |
| `CheckoutPage.tsx` | Order form — address, payment, summary, place order | Route: `/checkout` |
| `OrdersPage.tsx` | Current user's order history | Route: `/orders` |
| `WishlistPage.tsx` | Saved/favorited products | Route: `/wishlist` |
| `ProfilePage.tsx` | User profile info and settings | Route: `/profile` |

### Root pages

| File | Purpose | When Used |
|------|---------|-----------|
| `Login.tsx` | Login form page | Route: `/login` |
| `Register.tsx` | Registration form page | Route: `/register` |
| `Error.tsx` | Generic error page for caught route-level errors | Rendered by `ErrorBoundary` or error routes |
| `NotFound.tsx` | 404 page | Matched by catch-all route `*` |
| `Unauthorized.tsx` | 403 page — user lacks permission | Redirected to by `RoleGuard` |

---

## 📁 `src/routes/`

Route guards and the router definition.

| File | Purpose | When Used |
|------|---------|-----------|
| `AppRouter.tsx` | Full `react-router-dom` route tree — composes all layouts, pages, and guards | Rendered once in `App.tsx` |
| `ProtectedRoute.tsx` | Redirects to `/login` if user is not authenticated | Wraps all non-public routes |
| `RoleGuard.tsx` | Redirects to `/unauthorized` if user lacks required role | Wraps admin routes |
| `WhitelistGuard.tsx` | Blocks access unless user email is in the whitelist | Wraps beta/restricted routes |
| `FeatureGuard.tsx` | Blocks routes when a feature flag is disabled | Wraps feature-flagged pages |
| `DeepLinkGuard.tsx` | Saves the intended URL before redirecting to login, then restores it post-auth | Used by `ProtectedRoute` to enable redirect-back |

---

## 📁 `src/schemas/`

Zod validation schemas — define shape and rules for form data.

| File | Purpose | When Used |
|------|---------|-----------|
| `login.schema.ts` | Email + password validation rules | Passed to `react-hook-form` resolver in `Login.tsx` |
| `register.schema.ts` | Name, email, password, confirm-password rules | Used in `Register.tsx` |
| `checkout.schema.ts` | Address, phone, payment fields validation | Used in `CheckoutPage.tsx` |
| `product.schema.ts` | Name, price, stock, category, image rules | Used in `CreateProductPage` and `EditProductPage` |

---

## 📁 `src/store/`

Zustand global state stores.

| File | Purpose | When Used |
|------|---------|-----------|
| `auth.store.ts` | `user`, `token`, `isAuthenticated` state + `login`/`logout`/`setUser` actions | Read by guards, layouts, and after social login |
| `cart.store.ts` | Cart items, total, add/remove/update actions | Used by `CartPage`, `ProductDetailPage`, checkout |
| `wishlist.store.ts` | Wishlist items, add/remove | Used by `WishlistPage` and product cards |
| `ui.store.ts` | Global UI state — sidebar open, modal open, loading flags | Used by layouts and modal components |

---

## 📁 `src/themes/`

| File | Purpose | When Used |
|------|---------|-----------|
| `theme.context.tsx` | Light/dark mode context — provides `theme` and `toggleTheme` | Wraps the app; consumed by any component needing theme-aware styles |

---

## 📁 `src/types/`

Shared TypeScript interfaces for domain data shapes.

| File | Purpose | When Used |
|------|---------|-----------|
| `auth.types.ts` | `User`, `LoginPayload`, `AuthResponse` | Used by auth store and auth API |
| `cart.types.ts` | `CartItem`, `Cart` | Used by cart store and cart API |
| `order.types.ts` | `Order`, `OrderItem`, `OrderStatus` | Used by orders API and pages |
| `product.types.ts` | `Product`, `Category` | Used everywhere products appear |
| `wishlist.types.ts` | `WishlistItem` | Used by wishlist store and API |

---

## 📁 `src/utils/`

Pure helper functions — no React, no state.

| File | Purpose | When Used |
|------|---------|-----------|
| `cookie.service.ts` | `getCookie` / `setCookie` / `deleteCookie` helpers | Used by auth store for token persistence |
| `normalizeApiError.ts` | Converts raw Axios errors into a consistent `AppError` shape | Called in Axios response interceptor |
| `prefetch.ts` | Kicks off parallel API calls to warm the cache before user interaction | Called by `init.service.ts` on boot |
| `slug.ts` | Converts a product name to a URL-safe slug | Used when creating/navigating to products |

---

## Root `src/` files

| File | Purpose | When Used |
|------|---------|-----------|
| `App.tsx` | Root React component — composes `ErrorBoundary`, `AppInitializer`, `GlobalErrorRenderer`, `AppRouter` | Mounted once by `main.tsx` |
| `index.css` | Global Tailwind directives (`@tailwind base/components/utilities`) + any global overrides | Imported once in `main.tsx` |
| `main.tsx` | Entry point — wraps `App` in `I18nProvider`, `ThemeProvider`, `StrictMode` then renders to DOM | Run first by Vite |

---

## Root project files

| File | Purpose | When Used |
|------|---------|-----------|
| `index.html` | Vite HTML template — single `<div id="root">` entry point | Served by Vite dev server and as the SPA shell in production |
| `package.json` | Dependencies, scripts (`dev`, `build`, `preview`) | `npm install` / `npm run dev` |
| `package-lock.json` | Locked dependency tree for reproducible installs | Used automatically by `npm ci` |
| `vite.config.ts` | Vite bundler config — aliases, plugins, proxy rules for dev API | Read by Vite on start/build |
| `tailwind.config.js` | Tailwind theme extensions, content paths, plugins | Read by PostCSS during build |
| `postcss.config.js` | Connects Tailwind and Autoprefixer to the CSS pipeline | Used by Vite's CSS processing |
| `tsconfig.json` | Root TS config — references `tsconfig.app.json` and `tsconfig.node.json` | Base for all TypeScript compilation |
| `tsconfig.app.json` | TS config for `src/` — strict mode, JSX, path aliases | Used when type-checking app code |
| `tsconfig.node.json` | TS config for Vite config file itself (Node context) | Used when type-checking `vite.config.ts` |
| `eslint.config.js` | ESLint flat config — rules, plugins (React, TS, hooks) | Run by `npm run lint` and the IDE |
| `.hintrc` | Webhint config for HTML/accessibility linting | Used by the webhint VS Code extension |
| `.gitignore` | Files excluded from git (node_modules, dist, .env) | Checked by git on every commit |
| `DOCUMENTATION.md` | Human-readable project overview and feature docs | Reference for developers |
| `README.md` | Quick-start guide — how to run dev, build, mock server | First stop for new contributors |
| `TECHNICAL_REFERENCE_AR.md` | Arabic technical reference — architecture and API docs in Arabic | For Arabic-speaking team members |
