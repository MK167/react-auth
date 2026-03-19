/**
 * @fileoverview English locale — re-exports from default-en.ts.
 *
 * The canonical source of truth moved to `default-en.ts` so that the same
 * object can be served over the network by the mock server AND imported
 * statically as a build-time fallback.
 *
 * @module i18n/locales/en
 */

export { defaultEn as en } from './default-en';
export type { Locale } from './default-en';
