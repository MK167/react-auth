/**
 * @fileoverview GlobalLoader — fullscreen API loading overlay.
 *
 * ## Responsibilities
 *
 * Subscribes to `useUiStore.activeApiRequestsCount` and renders a fullscreen
 * dimmed overlay with a centered spinner whenever one or more API requests
 * are in-flight. Hides automatically when all requests settle.
 *
 * ## Why a global loader?
 *
 * Individual page components handle their own skeleton states for the _first_
 * load of their data. But many secondary operations — form submissions, cart
 * mutations, wishlist syncs, order status updates — do not have a natural
 * skeleton placeholder. Without a global loader, users can click a "Save"
 * button and see no visual feedback while the network call completes, leading
 * to double-submissions or confusion.
 *
 * The global loader fills this gap: any request that does not opt out with
 * `showGlobalLoader: false` will automatically show feedback.
 *
 * ## Why NOT use a global loader for everything?
 *
 * Full-page skeleton states (like the product list table) already provide
 * contextual loading feedback. Layering a fullscreen overlay on top would:
 * 1. Obscure the skeleton, making the transition jarring.
 * 2. Double the visual "loading duration" perception.
 *
 * For these cases, set `showGlobalLoader: false` on the request config and
 * let the page's own skeleton handle the loading state.
 *
 * ## Counter-driven visibility
 *
 * The component reads `activeApiRequestsCount > 0` rather than a boolean.
 * This means three parallel requests show the overlay once, and it only
 * disappears when ALL three settle — not after the first one finishes.
 * See `src/store/ui.store.ts` for the full counter semantics explanation.
 *
 * ## Performance
 *
 * The selector `(s) => s.activeApiRequestsCount > 0` is a derived boolean.
 * Zustand only re-renders this component when the boolean changes (0 → 1
 * or 1 → 0), NOT on every increment/decrement in between. Parallel requests
 * going from count 2 → 1 do not trigger a re-render.
 *
 * ## Accessibility
 *
 * - `role="status"` announces the loading state to screen readers.
 * - `aria-label` provides a descriptive text alternative.
 * - `aria-live="polite"` ensures it does not interrupt reading; assistive
 *   technology announces it at the next natural pause.
 * - `aria-busy="true"` marks the page as non-interactive during loading,
 *   which some screen readers surface as a hint to wait.
 * - The spinner `<div>` is `aria-hidden="true"` — it is purely decorative;
 *   the role="status" container carries all semantic meaning.
 * - `pointer-events-none` when hidden prevents invisible click-blocking.
 *
 * ## Animation
 *
 * Uses Tailwind CSS `transition-opacity duration-200` for a smooth 200ms
 * fade-in/out. The overlay stays in the DOM at `opacity-0` to keep the
 * transition smooth on show — if the element were conditionally rendered
 * (`isLoading && <div>`), the first mount would always be a jump-cut.
 *
 * The blur (`backdrop-blur-[2px]`) subtly signals that the page is
 * temporarily non-interactive without fully obscuring the content —
 * users can still see where they were, maintaining spatial context.
 *
 * @module components/common/GlobalLoader
 */

import { useUiStore } from '@/store/ui.store';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Fullscreen loading overlay driven by the global API request counter.
 *
 * Mount exactly once, near the root of the component tree (inside `App`),
 * so it renders above all page content via the `z-[9999]` stacking context.
 *
 * @example Inside App.tsx:
 * ```tsx
 * function App() {
 *   return (
 *     <I18nProvider>
 *       <ThemeProvider>
 *         <GlobalLoader />
 *         <AppRouter />
 *       </ThemeProvider>
 *     </I18nProvider>
 *   );
 * }
 * ```
 */
export default function GlobalLoader({ show }: { show?: boolean } = {}) {
  /**
   * Derive a boolean from the counter — Zustand only re-renders this
   * component when the boolean flips, not on every counter increment.
   *
   * This is a critical performance optimisation: if three requests run in
   * parallel (count: 0→1→2→3), this component renders once when count goes
   * 0→1 (show overlay), and once when count goes 1→0 (hide overlay). It
   * does NOT re-render for the intermediate 1→2 and 2→3 transitions.
   *
   * `show` bypasses the store — used as a Suspense fallback so the overlay
   * is visible during lazy-chunk loading even when no API request is in-flight.
   */
  const isApiLoading = useUiStore((s) => s.activeApiRequestsCount > 0);
  const isLoading = show ?? isApiLoading;

  return (
    /*
     * The overlay is always in the DOM but invisible when not loading.
     * `pointer-events-none` when hidden prevents the invisible layer from
     * blocking clicks below it.
     *
     * `z-[9999]` ensures it renders above all other stacking contexts,
     * including modals (z-50), dropdowns, and tooltips.
     */
    <div
      role="status"
      aria-label="Loading"
      aria-live="polite"
      aria-busy={isLoading}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-opacity duration-200 ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Spinner card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 flex items-center gap-3">
        {/*
         * The spinner itself is aria-hidden — it is purely decorative.
         * All semantic meaning is carried by the role="status" parent.
         */}
        <div
          aria-hidden="true"
          className="w-5 h-5 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 select-none">
          Loading…
        </span>
      </div>

      {/*
       * Visually hidden text for screen readers that do not announce
       * role="status" reliably. This fallback ensures the loading state
       * is communicated even in older or non-standard AT implementations.
       */}
      <span className="sr-only">Loading, please wait</span>
    </div>
  );
}
