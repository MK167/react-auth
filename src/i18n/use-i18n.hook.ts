import { useContext } from "react";
import { I18nContext, type I18nContextValue } from "./i18n.types";

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
