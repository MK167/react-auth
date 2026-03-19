/**
 * @fileoverview Route prefetch utilities — reduces perceived navigation latency.
 *
 * ## How prefetching reduces perceived latency
 *
 * React Router with `React.lazy()` splits each page into a separate JS chunk.
 * When the user clicks a link, the browser must:
 * 1. **Download** the chunk (network round-trip — 50–500 ms on mobile 4G).
 * 2. **Parse and evaluate** the JS (~10–50 ms depending on device).
 * 3. **React renders** the component tree.
 *
 * Steps 1–2 are the bottleneck. If we trigger the dynamic import **before**
 * the user clicks (e.g. on `mouseenter` at 150 ms before click), the chunk
 * download overlaps with the hover gesture. By click time the module is
 * already in the browser's module registry and React renders instantly.
 *
 * This technique is sometimes called "speculative prefetch" or "intent-based
 * preloading" and is used by Next.js (`<Link prefetch>`) and Gatsby.
 *
 * ## Bundle splitting strategy
 *
 * Each `import('@/pages/...')` call in `AppRouter.tsx` creates a separate
 * Vite/Rollup chunk at build time. Calling the **same** dynamic import string
 * here does NOT create a new chunk — it reuses the existing one. At runtime
 * the module system deduplicates: the second call returns the already-resolved
 * Promise from the module cache, so **no duplicate network request** is made.
 *
 * ## When NOT to prefetch
 *
 * - **Bandwidth-constrained devices**: Prefetching wastes data on slow or
 *   metered connections. The `navigator.connection.saveData` flag should gate
 *   prefetch calls in production (implemented via `isSaveData()` below).
 * - **Pages the user is unlikely to visit**: Prefetching every page on mount
 *   defeats the purpose. Keep prefetch calls intentional and close to the
 *   navigation trigger.
 * - **Admin-only pages for guest users**: No value in prefetching
 *   `/admin/products` for a CUSTOMER — the RoleGuard will block them anyway
 *   and the chunk download would waste their bandwidth.
 * - **Auth-gated pages before login**: Prefetching `/checkout` for a user
 *   who hasn't logged in yet adds marginal value; the `ProtectedRoute`
 *   redirect adds a round-trip anyway. Call `prefetchCheckout` only after
 *   a cart item has been added, signalling genuine purchase intent.
 *
 * @module utils/prefetch
 */

// ---------------------------------------------------------------------------
// Data-saver guard
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the user has opted into reduced data usage via the
 * Network Information API (`navigator.connection.saveData`).
 *
 * When true, all prefetch calls in this module are skipped to respect the
 * user's bandwidth preference.
 *
 * Falls back to `false` on browsers that do not support the API (Safari,
 * Firefox) — these users receive prefetch as normal.
 */
function isSaveData(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (navigator as any)?.connection?.saveData === true;
}

// ---------------------------------------------------------------------------
// Page prefetch functions
// ---------------------------------------------------------------------------

/**
 * Prefetches the `ProductDetailPage` JS chunk.
 *
 * **When to call**: On `mouseenter` / `focus` of any product card. Hovering
 * indicates intent to navigate ~150–300 ms before the click event fires,
 * which is enough time to start downloading a typical 15–50 kB page chunk.
 *
 * This is the **highest-value prefetch** in the storefront because product
 * cards are the primary navigation trigger for the vast majority of user
 * sessions (browse → detail → add-to-cart).
 *
 * @example
 * ```tsx
 * <article onMouseEnter={prefetchProductDetail} onFocus={prefetchProductDetail}>
 *   <ProductCard ... />
 * </article>
 * ```
 */
export function prefetchProductDetail(): void {
  if (isSaveData()) return;
  // The import string must match exactly what AppRouter uses so Vite
  // emits one chunk and the module cache deduplicates the runtime calls.
  void import('@/pages/user/ProductDetailPage');
}

/**
 * Prefetches the `CheckoutPage` JS chunk.
 *
 * **When to call**: When `CartPage` mounts (the user is viewing their cart
 * and is statistically likely to proceed). Also appropriate to call when
 * the first cart item is added anywhere in the app.
 *
 * Hiding the chunk download behind cart view (not product browse) keeps
 * bandwidth usage proportional to user intent.
 *
 * @example
 * ```tsx
 * useEffect(() => { prefetchCheckout(); }, []);
 * ```
 */
export function prefetchCheckout(): void {
  if (isSaveData()) return;
  void import('@/pages/user/CheckoutPage');
}

/**
 * Prefetches the `ProductsListPage` (admin) chunk.
 *
 * **When to call**: Immediately after a successful login when `user.role` is
 * `'ADMIN'` or `'MANAGER'`. The post-login navigation lands them at
 * `/admin/products` — prefetching here makes that page appear instantly
 * instead of showing the full-screen spinner for the chunk download.
 *
 * **Do NOT call** for CUSTOMER-role users — they cannot access admin routes
 * and the chunk download would be pure waste.
 */
export function prefetchAdminDashboard(): void {
  if (isSaveData()) return;
  void import('@/pages/admin/ProductsListPage');
}

/**
 * Prefetches the `OrdersPage` chunk.
 *
 * **When to call**: After a successful checkout (the confirmation screen has
 * a "View orders" CTA). Prefetching here makes the transition feel instant.
 * Also call after login for authenticated users who are likely returning to
 * track an existing order.
 */
export function prefetchOrders(): void {
  if (isSaveData()) return;
  void import('@/pages/user/OrdersPage');
}
