/**
 * @fileoverview App initialization service — fetches locale and error config
 * bundles before the router mounts.
 *
 * ## Content source strategy
 *
 * Controlled by `VITE_CONTENT_SOURCE`:
 *
 * | Value       | URL pattern             | Network tab shows   |
 * |-------------|-------------------------|---------------------|
 * | `local`     | `/content/default-*`    | `default-ar`        |
 * | `backend`   | `/content/be-default-*` | `be-default-ar`     |
 *
 * In `local` mode, the Vite dev server proxies `/content/` to json-server
 * which serves the TypeScript locale files as JSON — the developer sees a
 * real network request, proving the init pipeline works.
 *
 * In `backend` mode (production), the same URLs hit the real CMS/backend.
 *
 * ## Fallback chain
 *
 * Network fetch → on failure → static TypeScript import (zero downtime).
 *
 * @module core/init/init.service
 */

import { defaultEn } from '@/i18n/locales/default-en';
import { defaultAr } from '@/i18n/locales/default-ar';
import { defaultErrorBundle } from '@/core/errors/default-error';
import { environment } from '@/environments/environment';
import type { Locale } from '@/i18n/locales/default-en';
import type { ErrorBundle } from '@/core/errors/default-error';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONTENT_SOURCE = environment.contentSource;

/** URL prefix that appears in the Network tab — the debug signal */
const BUNDLE_PREFIX = CONTENT_SOURCE === 'backend' ? 'be-' : '';

const STATIC_LOCALES: Record<'en' | 'ar', Locale> = { en: defaultEn, ar: defaultAr };

// ---------------------------------------------------------------------------
// Internal fetch with timeout + fallback
// ---------------------------------------------------------------------------

async function fetchBundle<T>(
  name: string,
  fallback: T,
  timeoutMs = 5000,
): Promise<T> {
  const url = `/content/${BUNDLE_PREFIX}${name}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Accept both raw object and FreeAPI envelope { data: ... }
    const json = (await res.json()) as { data?: T } | T;
    return ('data' in (json as object) ? (json as { data: T }).data : json) as T;
  } catch {
    // Network error, timeout, or server not running → use static fallback
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type InitBundles = {
  locale: Locale;
  errorConfig: ErrorBundle;
};

/**
 * Fetches the locale bundle for `lang` and the error config bundle in
 * parallel. Always resolves (never rejects) — falls back to the bundled
 * static files on any network failure.
 *
 * @param lang - The language to load ('en' | 'ar'). Reads localStorage.
 */
export async function fetchInitBundles(lang: 'en' | 'ar'): Promise<InitBundles> {
  const [locale, errorConfig] = await Promise.all([
    fetchBundle<Locale>(`default-${lang}`, STATIC_LOCALES[lang]),
    fetchBundle<ErrorBundle>('default-error', defaultErrorBundle),
  ]);

  return { locale, errorConfig };
}

/**
 * Fetches a single locale bundle (used when the user switches languages after
 * the initial load). Falls back to the static locale silently.
 */
export async function fetchLocaleBundle(lang: 'en' | 'ar'): Promise<Locale> {
  return fetchBundle<Locale>(`default-${lang}`, STATIC_LOCALES[lang]);
}

/** Reads stored language from localStorage — same key as I18nProvider. */
export function getStoredLang(): 'en' | 'ar' {
  try {
    const saved = localStorage.getItem('app-lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    // localStorage unavailable
  }
  return 'en';
}
