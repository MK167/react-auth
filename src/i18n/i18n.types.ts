import { createContext } from "react";

/** The two supported language codes. */
export type Lang = "en" | "ar";

/** Writing direction derived from the language. */
export type Dir = "ltr" | "rtl";

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
  translate: (key: string, fallback?: string) => string;
  /**
   * Switches the active language. Persists to localStorage and updates the
   * `dir` and `lang` attributes on `<html>` immediately.
   *
   * @param language - The target language code.
   */
  setLang: (language: Lang) => void;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
