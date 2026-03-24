/**
 * @fileoverview CMS-driven content service.
 *
 * ## Strategy
 *
 * The content mode is controlled by the `VITE_CONTENT_MODE` environment
 * variable:
 *
 * | Value      | Source          | Env file            |
 * |------------|-----------------|---------------------|
 * | `local`    | i18n locale files (via init.store) | `.env.local`     |
 * | `backend`  | Remote CMS endpoint via HTTP       | `.env.production` |
 *
 * ## useContent() hook
 *
 * The primary public API. Returns a `getContent(key)` function that resolves
 * strings synchronously in LOCAL mode, and from an in-memory cache in CMS
 * mode (with automatic background refresh for cache misses).
 *
 * ```tsx
 * function MyComponent() {
 *   const { getContent, isLoading } = useContent();
 *   return <h1>{getContent('home.hero.title')}</h1>;
 * }
 * ```
 *
 * ## CMS endpoint contract
 *
 * ```
 * GET /cms/content?key=home.hero.title&lang=en
 * Response: { key: "home.hero.title", content: "Discover products you'll love" }
 * ```
 *
 * ## Caching
 *
 * CMS responses are stored in a module-level `Map<string, string>`. The cache
 * is keyed by `"${key}:${lang}"` so language switches don't serve stale
 * translations. The cache persists for the browser session (no TTL — content
 * changes require a page reload in production).
 *
 * ## Fallback chain
 *
 * ```
 * CMS fetch → cache hit? → return cached value
 *           → cache miss → fetch from CMS
 *                        → success → cache + return
 *                        → failure → fall back to i18n translate(key)
 * ```
 *
 * @module core/content/content.service
 */

import { useState, useCallback, useRef } from 'react';
import { useI18n } from '@/i18n/use-i18n.hook';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Content mode read from the Vite env. Defaults to `'LOCAL'` so that
 * development always works without a CMS server.
 */
const CONTENT_MODE = (import.meta.env.VITE_CONTENT_SOURCE ?? 'local') as string;

/**
 * Base URL of the CMS content endpoint.
 * Only used when `CONTENT_MODE === 'backend'`.
 */
const CMS_BASE_URL = import.meta.env.VITE_CMS_ENDPOINT ?? '/cms/content';

// ---------------------------------------------------------------------------
// Module-level cache (shared across all hook instances)
// ---------------------------------------------------------------------------

/** Cache key: `"<i18nKey>:<lang>"` → translated string */
const cmsCache = new Map<string, string>();

/** Set of keys currently being fetched to prevent duplicate in-flight requests */
const pendingFetches = new Set<string>();

// ---------------------------------------------------------------------------
// Internal CMS fetch
// ---------------------------------------------------------------------------

/**
 * Fetches a single content key from the CMS endpoint.
 * Caches the result and returns it.
 *
 * @param key      - i18n key (e.g. `'home.hero.title'`)
 * @param lang     - Active language code (`'en'` | `'ar'`)
 * @param fallback - Value to cache and return on fetch failure
 */
async function fetchFromCms(
  key: string,
  lang: string,
  fallback: string,
): Promise<string> {
  const cacheKey = `${key}:${lang}`;

  if (cmsCache.has(cacheKey)) return cmsCache.get(cacheKey)!;
  if (pendingFetches.has(cacheKey)) return fallback;

  pendingFetches.add(cacheKey);

  try {
    const url = `${CMS_BASE_URL}?key=${encodeURIComponent(key)}&lang=${encodeURIComponent(lang)}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`CMS responded with ${response.status}`);

    const data = (await response.json()) as { key?: string; content?: string };
    const content = data.content ?? fallback;

    cmsCache.set(cacheKey, content);
    return content;
  } catch {
    // Fallback to i18n — cache the fallback so we don't retry on every render
    cmsCache.set(cacheKey, fallback);
    return fallback;
  } finally {
    pendingFetches.delete(cacheKey);
  }
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Return type of `useContent()`.
 */
export type ContentService = {
  /**
   * Resolve a content key to a localized string.
   *
   * In LOCAL mode: synchronous, delegates to `useI18n().translate(key)`.
   * In CMS mode: synchronous from cache if available, otherwise returns the
   * i18n fallback and triggers a background CMS fetch.
   *
   * @param key      - i18n dot-notation key (e.g. `'home.hero.title'`).
   * @param fallback - Optional override for the missing-key fallback.
   */
  getContent: (key: string, fallback?: string) => string;
  /**
   * Explicitly prefetch a content key from the CMS and populate the cache.
   * No-op in LOCAL mode.
   *
   * @param key - i18n dot-notation key to prefetch.
   */
  prefetch: (key: string) => Promise<void>;
  /**
   * `true` while any CMS fetch is in-flight for the first time (cache miss).
   * Always `false` in LOCAL mode.
   */
  isLoading: boolean;
  /** Active content mode ('LOCAL' | 'CMS') */
  mode: string;
};

/**
 * CMS-driven content hook.
 *
 * Integrates with the existing i18n context as the LOCAL fallback so that
 * content keys work in both modes without duplication.
 *
 * @example
 * ```tsx
 * const { getContent } = useContent();
 * return <h1>{getContent('home.hero.title')}</h1>;
 * ```
 */
export function useContent(): ContentService {
  const { translate, lang } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  // Track in-flight count for isLoading state without Zustand dependency.
  const inFlightRef = useRef(0);

  const getContent = useCallback(
    (key: string, fallback?: string): string => {
      // ── LOCAL mode ─────────────────────────────────────────────────────────
      if (CONTENT_MODE === 'local') {
        return translate(key, fallback ?? key);
      }

      // ── CMS mode ───────────────────────────────────────────────────────────
      const cacheKey = `${key}:${lang}`;

      // Cache hit → return immediately (synchronous).
      if (cmsCache.has(cacheKey)) return cmsCache.get(cacheKey)!;

      // Cache miss → use i18n fallback and trigger background fetch.
      const i18nFallback = translate(key, fallback ?? key);

      if (!pendingFetches.has(cacheKey)) {
        inFlightRef.current += 1;
        setIsLoading(true);

        fetchFromCms(key, lang, i18nFallback).finally(() => {
          inFlightRef.current = Math.max(0, inFlightRef.current - 1);
          if (inFlightRef.current === 0) setIsLoading(false);
        });
      }

      return i18nFallback;
    },
    [translate, lang],
  );

  const prefetch = useCallback(
    async (key: string): Promise<void> => {
      if (CONTENT_MODE === 'local') return;
      const i18nFallback = translate(key, key);
      await fetchFromCms(key, lang, i18nFallback);
    },
    [translate, lang],
  );

  return {
    getContent,
    prefetch,
    isLoading: CONTENT_MODE === 'local' ? false : isLoading,
    mode: CONTENT_MODE,
  };
}

// ---------------------------------------------------------------------------
// Cache utilities (for testing / admin playground)
// ---------------------------------------------------------------------------

/** Clear all CMS cache entries (useful for hot reload in development). */
export function clearContentCache(): void {
  cmsCache.clear();
}

/** Returns a snapshot of the current CMS cache. */
export function getContentCacheSnapshot(): Record<string, string> {
  return Object.fromEntries(cmsCache.entries());
}
