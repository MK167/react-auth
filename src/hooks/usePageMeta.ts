/**
 * @fileoverview `usePageMeta` — sets document.title and <meta name="description">
 * for the current page on every route change.
 *
 * ## Why manage meta tags in hooks instead of react-helmet?
 *
 * For an SPA without SSR, directly mutating `document.title` and a single
 * `<meta name="description">` node is the lightest possible approach — zero
 * extra dependencies, no context providers, no tree reconciliation overhead.
 * It is functionally equivalent to react-helmet for the use cases here
 * (client-side title + description per route).
 *
 * ## Title format
 *
 * ```
 * usePageMeta('Products')           → "Products - ShopHub"
 * usePageMeta('Nike Air Max 270')   → "Nike Air Max 270 - ShopHub"
 * ```
 *
 * ## Description
 *
 * If `description` is provided the hook overwrites the `<meta name="description">`
 * element. If omitted the base description from `index.html` stays in place —
 * it is never blanked out.
 *
 * ## Cleanup / reset
 *
 * The hook resets `document.title` to the base "ShopHub" on unmount so that
 * any page that doesn't call this hook (e.g. modal-only routes) doesn't inherit
 * a stale title from the previously visited page.
 *
 * @module hooks/usePageMeta
 */

import { useEffect } from 'react';

/** Displayed in every tab title. Change once here to rename site-wide. */
const SITE_NAME = 'ShopHub';

/**
 * Sets `document.title` to `"<title> - ShopHub"` and optionally updates the
 * page's `<meta name="description">` content.
 *
 * @param title       Page-specific title shown in the browser tab.
 * @param description Optional page-specific meta description for SEO.
 *
 * @example
 * ```tsx
 * export default function CartPage() {
 *   usePageMeta('Cart', 'Review and checkout your shopping cart.');
 *   // ...
 * }
 * ```
 */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    // ── Tab title ────────────────────────────────────────────────────────────
    document.title = `${title} - ${SITE_NAME}`;

    // ── Meta description ──────────────────────────────────────────────────────
    // Only overwrite when a page-specific description is provided.
    // The base description set in index.html acts as a fallback for pages
    // that don't supply one (e.g. error pages).
    if (description) {
      let metaDesc = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      );
      if (!metaDesc) {
        // The element was not found (shouldn't happen since index.html always
        // has one, but defensive creation ensures this never throws).
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────
    // Reset to base site name when the component unmounts so layouts that
    // render a Suspense fallback don't show a stale page title.
    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description]);
}
