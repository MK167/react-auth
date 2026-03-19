# ShopHub

A bilingual (English/Arabic, LTR/RTL) e-commerce SPA with a separate admin panel, built with React 19, TypeScript, Zustand, and Tailwind CSS.

---

## Features

- **Storefront** — browse, search, filter, and purchase products without logging in
- **Guest cart** — persisted in `localStorage`, merged into the server on login
- **Social login** — Google, Facebook, Microsoft via Firebase OAuth
- **Admin panel** — product CRUD, category management, order management
- **Role-based access** — `CUSTOMER`, `MANAGER`, `ADMIN` with route guards
- **Bilingual** — full Arabic RTL ↔ English LTR toggle, no page reload
- **Dark mode** — class-based, persisted to `localStorage`, no flash on reload
- **Lazy loading** — every page is a separate JS chunk (60–80% smaller initial bundle)
- **Global loader** — single Zustand-driven overlay for all in-flight API requests
- **Mobile nav** — two modes: dropdown (default) or slide-in sidebar, toggle persisted

---

## Tech Stack

| | |
|---|---|
| **React 19** + TypeScript 5.9 | UI + type safety |
| **React Router 7** | Nested routes, lazy loading, typed params |
| **Zustand 5** | Auth, cart, wishlist, UI stores |
| **Tailwind CSS 3.4** | Utility-first styling with `dark:` and `rtl:` variants |
| **React Hook Form 7** + **Zod 4** | Form handling + validation |
| **Axios 1.13** | HTTP client with auth + global loader interceptors |
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

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=https://your-api.example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Project Structure

```
src/
├── api/          # Axios API modules (auth, products, cart, orders, wishlist)
├── components/   # Shared UI components (GlobalLoader, Skeleton, auth forms)
├── config/       # App constants and Firebase initialisation
├── hooks/        # Custom hooks (useCartMerge, useWishlistSync, useDebounce)
├── i18n/         # I18nProvider, useI18n hook, en.ts + ar.ts locale files
├── layouts/      # AuthLayout, UserLayout, AdminLayout
├── pages/        # All page components (auth/, user/, admin/)
├── routes/       # AppRouter, ProtectedRoute, RoleGuard
├── schemas/      # Zod validation schemas
├── store/        # Zustand stores (auth, cart, wishlist, ui)
├── themes/       # ThemeProvider + useTheme hook
├── types/        # TypeScript type definitions
└── utils/        # cookie.service, normalizeApiError, slug, prefetch
```

Full developer reference → [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## Route Structure

```
/login, /register          → AuthLayout      (public)
/, /products, /cart        → UserLayout      (public)
/products/:slugId          → UserLayout      (public)
/checkout, /orders         → UserLayout      (auth required)
/profile                   → UserLayout      (auth required)
/admin/products            → AdminLayout     (ADMIN | MANAGER)
/admin/products/create     → AdminLayout     (ADMIN | MANAGER)
/admin/products/:id/edit   → AdminLayout     (ADMIN | MANAGER)
/admin/categories          → AdminLayout     (ADMIN | MANAGER)
/admin/orders              → AdminLayout     (ADMIN | MANAGER)
/unauthorized              → standalone
*                          → NotFound
```

---

## Internationalisation

All UI text lives in `src/i18n/locales/`. English (`en.ts`) is the source of truth; TypeScript enforces that Arabic (`ar.ts`) satisfies the same shape at compile time.

```typescript
const { t, lang, setLang } = useI18n();
t('nav.home')           // 'Home' | 'الرئيسية'
t('admin.nav.products') // 'Products' | 'المنتجات'
setLang('ar')           // switches to RTL — document.dir is set automatically
```

**Key namespaces:** `nav`, `home`, `products`, `product`, `cart`, `checkout`, `orders`, `profile`, `common`, `auth.login`, `auth.register`, `admin.nav`, `admin.products`, `admin.categories`, `admin.orders`, `admin.deleteModal`

---

## Mobile Navigation

`UserLayout` supports two mobile nav modes. Toggle with the layout icon button in the header — preference is saved to `localStorage`.

| Mode | Description |
|---|---|
| **Dropdown** | Panel slides down below the header. Compact, default. |
| **Sidebar** | Full-height drawer from the leading edge. RTL-aware. |

---

## Adding Content

**New page:**
1. Create in `src/pages/<module>/MyPage.tsx`
2. Add `React.lazy()` import in `AppRouter.tsx`
3. Add route with `<Suspense fallback={<GlobalLoader show />}>`
4. Add translation keys to `en.ts` + `ar.ts`

**New translation key:**
1. Add to `en.ts` — TypeScript will error in `ar.ts` until you add the Arabic value
2. Use `t('your.key')` in components

**New API call:**
1. Add to the relevant `src/api/*.api.ts` file
2. The Axios instance auto-attaches auth headers and shows the GlobalLoader
3. Pass `showGlobalLoader: false` if the page has its own skeleton

---

## License

MIT
