/**
 * @fileoverview Product URL slug utilities.
 *
 * ## Why slug-based URLs?
 *
 * MongoDB ObjectId URLs like `/products/64c8f1234567890123456789` are:
 * - **Opaque** — they reveal nothing about the product to users or crawlers.
 * - **Not keyword-rich** — search engines cannot extract topic signals.
 * - **Hard to remember** — users cannot reconstruct or share meaningful links.
 *
 * Slug-based URLs like `/products/nike-air-max-270-64c8f1234567890123456789`:
 *
 * ### SEO ranking benefits
 * 1. **Keyword matching**: Google treats URL words as a ranking signal. A URL
 *    containing "nike-air-max-270" boosts that page for those queries vs a
 *    pure-ID URL.
 * 2. **Click-through rate**: Users in SERPs are more likely to click a
 *    descriptive URL. Human-readable paths in search results increase trust
 *    and CTR by ~15–25% (Moz, 2022 industry data).
 * 3. **Canonicalization**: By always deriving the slug from name + ID we avoid
 *    duplicate-content penalties for near-identical slug variants (e.g.
 *    "nike-air" vs "nike-air-270"). The ID anchors the canonical URL.
 *
 * ### Human-readable URL benefits
 * - Copy-paste sharability (Slack, email, social media)
 * - Breadcrumb inference by screen readers from the URL path
 * - Improved Lighthouse SEO audit score
 *
 * ### Canonical routing considerations
 * The MongoDB ObjectId (24 hex chars) is embedded at the END of the slug so
 * `extractProductId()` can parse it unambiguously, even when the product name
 * contains numeric substrings. Example:
 *
 * ```
 * /products/nike-air-max-270-64c8f1234567890123456789
 *                             └──────────────────────┘
 *                              24-char hex ObjectId (always last)
 * ```
 *
 * If the product name changes later, the old URL still resolves because the
 * ID is stable. A production system would add a 301 redirect from the old
 * slug to the new one to avoid spreading stale links, but that requires
 * server-side routing and is out of scope here.
 *
 * This module also supports **legacy pure-ID URLs** (`/products/:id`) via the
 * fallback in `extractProductId()`, making the migration to slug URLs
 * backwards-compatible — any existing bookmarks or shared links continue to
 * work after the route pattern changes.
 *
 * @module utils/slug
 */

// ---------------------------------------------------------------------------
// Core transformations
// ---------------------------------------------------------------------------

/**
 * Converts a human-readable string into a URL-safe, lowercase, hyphen-
 * separated slug segment.
 *
 * Transformation rules (applied in order):
 * 1. Lowercase all characters.
 * 2. Replace one or more non-alphanumeric characters (spaces, punctuation,
 *    special chars) with a single hyphen.
 * 3. Strip leading and trailing hyphens produced by rule 2.
 *
 * @param text - The raw string to slugify (e.g. product name or category).
 * @returns    A URL-safe slug string with only `[a-z0-9-]` characters.
 *
 * @example
 * slugify('Nike Air Max 270!')  // → 'nike-air-max-270'
 * slugify('  Café & Latte  ')   // → 'caf-latte'
 * slugify('100% Organic')       // → '100-organic'
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Product-specific slug helpers
// ---------------------------------------------------------------------------

/**
 * Builds the full slug-path segment for a product detail URL.
 *
 * The canonical format is `<slug>-<objectId>` where `<objectId>` is the
 * MongoDB ObjectId (always 24 hex chars, always last). This guarantee makes
 * extraction deterministic regardless of how many numbers appear in the name.
 *
 * @param name - Product name (used to derive the human-readable prefix).
 * @param id   - MongoDB ObjectId string (24 hex characters).
 * @returns    Combined segment ready for `navigate()` or `<Link to>`.
 *
 * @example
 * toProductSlugId('Nike Air Max 270', '64c8f1234567890123456789')
 * // → 'nike-air-max-270-64c8f1234567890123456789'
 */
export function toProductSlugId(name: string, id: string): string {
  return `${slugify(name)}-${id}`;
}

/**
 * Extracts the MongoDB ObjectId from a combined slug-id path segment.
 *
 * MongoDB ObjectIds are always **24 lowercase hex characters**
 * (`/[a-f0-9]{24}/`). This function matches the **final** 24-char hex run in
 * the slug so that product names containing hex-like substrings are handled
 * correctly.
 *
 * ### Backwards compatibility (legacy pure-ID URLs)
 *
 * If `slugId` is itself a bare ObjectId (i.e. legacy `/products/:id` URLs
 * from before the slug migration), the regex still matches and returns it
 * unchanged — no 404s for existing bookmarks or shared links.
 *
 * @param slugId - The full slug-id segment from a URL param
 *                 (e.g. `'nike-air-max-270-64c8f1234567890123456789'`).
 * @returns      The 24-character ObjectId extracted from the tail, or the
 *               entire `slugId` as a fallback (defensive, non-crashing).
 *
 * @example
 * extractProductId('nike-air-max-270-64c8f1234567890123456789')
 *  → '64c8f1234567890123456789'
 *
 * extractProductId('64c8f1234567890123456789') // legacy bare ID
 *  → '64c8f1234567890123456789'
 */
export function extractProductId(slugId: string): string {
  // Match exactly 24 lowercase hex characters anchored at the end.
  // The `i` flag allows uppercase ObjectIds (defensive — FreeAPI uses lowercase).
  const match = /([a-f0-9]{24})$/i.exec(slugId);
  return match ? match[1] : slugId;
}
