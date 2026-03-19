/**
 * @fileoverview Internationalisation (i18n) context — language switching with
 * full Arabic RTL and English LTR support.
 *
 * ## Internationalisation architecture
 *
 * This module uses the same **React Context** pattern as `theme.context.tsx`:
 * - Context is preferred over Zustand for pure UI concerns (language, theme).
 * - Tree-scoped, avoids prop-drilling, no external library needed.
 * - Locale files are plain TypeScript objects — no JSON loader or bundler
 *   plugin required. TypeScript enforces that all locales satisfy `Locale`
 *   (the shape of `en.ts`) at compile time.
 *
 * ## RTL layout implications
 *
 * When the language is set to Arabic (`'ar'`), this provider:
 * 1. Sets `document.documentElement.dir = 'rtl'` — the browser automatically
 *    mirrors block layout, flex direction, and text alignment.
 * 2. Sets `document.documentElement.lang = 'ar'` — screen readers use Arabic
 *    phoneme rules; search engines understand the content language.
 * 3. Tailwind's `rtl:` variant (`rtl:pr-4`, `rtl:text-right`) can be used
 *    in component files for fine-grained RTL overrides where the automatic
 *    mirroring is insufficient (e.g. icon placement, padding adjustments).
 *
 * ## Route prefix language strategy
 *
 * The current implementation derives language from **global context state**
 * (stored in localStorage). An alternative is URL-prefix routing:
 *
 * ```
 * /en/products   ← English
 * /ar/products   ← Arabic
 * ```
 *
 * To enable URL-prefix routing:
 *
 * STEP 1 — Wrap UserLayout routes with an optional lang prefix in AppRouter:
 * ```tsx
 * // In AppRouter.tsx, change:
 * <Route element={<UserLayout />}>
 * // To:
 * <Route path="/:lang?" element={<UserLayout />}>
 * ```
 *
 * STEP 2 — Read the :lang param in UserLayout and sync it to the context:
 * ```tsx
 * const { lang: urlLang } = useParams<{ lang?: string }>();
 * const { setLang } = useI18n();
 * useEffect(() => {
 *   if (urlLang === 'ar' || urlLang === 'en') setLang(urlLang);
 * }, [urlLang, setLang]);
 * ```
 *
 * STEP 3 — Update all `navigate()` and `<NavLink to>` calls to include the lang:
 * ```tsx
 * navigate(`/${lang}/products`);
 * // or create a <LangLink> wrapper:
 * function LangLink({ to, ...props }: LinkProps) {
 *   const { lang } = useI18n();
 *   return <NavLink to={`/${lang}${to}`} {...props} />;
 * }
 * ```
 *
 * STEP 4 — Add a default redirect:
 * ```tsx
 * // In AppRouter, add a top-level redirect:
 * <Route path="/" element={<Navigate to={`/${defaultLang}`} replace />} />
 * ```
 *
 * **Note**: URL-prefix routing conflicts with root-level routes unless every
 * route is also prefixed. The above approach is documented but not activated
 * to keep the existing clean URL structure intact.
 *
 * ## Translation function `t(key)`
 *
 * Keys are dot-notation paths into the locale object:
 * ```ts
 * t('nav.home')        // → 'Home' | 'الرئيسية'
 * t('home.hero.title') // → "Discover products you'll love" | 'اكتشف...'
 * ```
 *
 * If a key is not found the key string itself is returned as a fallback,
 * making missing translations visible during development without crashing.
 *
 * ## Accessibility requirements
 *
 * - `lang` attribute on `<html>` ensures correct TTS language selection.
 * - `dir` attribute ensures correct reading order for screen readers.
 * - Keyboard navigation (Tab, arrow keys) is automatically mirrored by the
 *   browser when `dir="rtl"` is set — no JS changes needed.
 * - Cart item count announcements in `UserLayout` use `aria-label` with the
 *   translated count — update those calls to `t('nav.cart')` as well.
 *
 * @module i18n/i18n.context
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The two supported language codes. */
export type Lang = "en" | "ar";

/** Writing direction derived from the language. */
export type Dir = "ltr" | "rtl";

/** Map of language codes to their locale objects. */
const LOCALES: Record<Lang, typeof en> = { en, ar };

/** The direction associated with each supported language. */
const LANG_DIR: Record<Lang, Dir> = {
  en: "ltr",
  ar: "rtl",
};

/** Shape of the value exposed by `I18nContext`. */
export type I18nContextValue = {
  /** Currently active language code ('en' | 'ar'). */
  lang: Lang;
  /** Writing direction for the active language ('ltr' | 'rtl'). */
  dir: Dir;
  /**
   * Translates a dot-notation key to the active locale string.
   *
   * @param key      - Dot-separated path into the locale object (e.g. 'nav.home').
   * @param fallback - Optional fallback string if the key is not found.
   *                   Defaults to the key string itself.
   * @returns        The translated string.
   */
  t: (key: string, fallback?: string) => string;
  /**
   * Switches the active language. Persists to localStorage and updates the
   * `dir` and `lang` attributes on `<html>` immediately.
   *
   * @param language - The target language code.
   */
  setLang: (language: Lang) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const I18nContext = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "app-lang";

function loadStoredLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch {
    // localStorage unavailable (private browsing with restrictions)
  }
  return "en"; // English is the default language
}

/**
 * Resolves a dot-notation key path into the locale object.
 *
 * @param locale - The locale object to traverse.
 * @param path   - Dot-separated key (e.g. 'home.hero.title').
 * @param fallback - Value to return if path is not found.
 * @returns The resolved string or the fallback.
 */
function resolve(
  locale: Record<string, unknown>,
  path: string,
  fallback: string,
): string {
  const keys = path.split(".");
  let current: unknown = locale;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return fallback;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : fallback;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * `I18nProvider` must wrap the entire application tree (add it in `App.tsx`
 * alongside `ThemeProvider`).
 *
 * On mount it reads the stored language preference from `localStorage` and
 * immediately applies the `dir` and `lang` attributes to `<html>` to prevent
 * layout direction flash (equivalent to theme FOUC prevention).
 *
 * @example
 * ```tsx
 * // App.tsx
 * function App() {
 *   return (
 *     <I18nProvider>
 *       <ThemeProvider>
 *         <AppRouter />
 *       </ThemeProvider>
 *     </I18nProvider>
 *   );
 * }
 * ```
 */
export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadStoredLang);

  // Apply lang + dir to <html> whenever language changes.
  // Done in useEffect so SSR-safe (no document access at render time).
  useEffect(() => {
    const dir = LANG_DIR[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Non-fatal
    }
  }, [lang]);

  const setLang = useCallback((language: Lang) => {
    setLangState(language);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const locale = LOCALES[lang] as Record<string, unknown>;
      return resolve(locale, key, fallback ?? key);
    },
    [lang],
  );

  const dir = LANG_DIR[lang];

  return (
    <I18nContext.Provider value={{ lang, dir, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides access to the active language, direction, translation function,
 * and the language setter.
 *
 * **Usage:**
 * ```tsx
 * function MyComponent() {
 *   const { t, lang, setLang, dir } = useI18n();
 *   return (
 *     <div dir={dir}>
 *       <h1>{t('home.hero.title')}</h1>
 *       <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
 *         {t('nav.language')}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @throws If called outside of an `I18nProvider` tree.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an <I18nProvider>");
  }
  return ctx;
}
