/**
 * @fileoverview Development environment configuration.
 *
 * ## Angular-style environments pattern
 *
 * All environment-specific values are hardcoded here — no `import.meta.env.*`
 * needed at runtime. Vite swaps this file with `environment.prod.ts` during
 * production builds via the `resolve.alias` entry in `vite.config.ts`.
 *
 * ```
 * vite dev    → @/environments/environment → environment.ts    (this file)
 * vite build  → @/environments/environment → environment.prod.ts
 * ```
 *
 * To change a value: edit this file directly and restart the dev server.
 * No `.env` files needed — this file IS the dev environment config.
 *
 * ## Usage
 *
 * ```ts
 * import { environment } from '@/environments/environment';
 *
 * if (environment.production) { ... }
 * console.log(environment.apiUrl);
 * ```
 *
 * @module environments/environment
 */

// ---------------------------------------------------------------------------
// Environment interface — shared shape for all environments
// ---------------------------------------------------------------------------

/** Typed shape shared by all environment variants. */
export interface Environment {
  /** True only in production builds. False in development. */
  production: boolean;

  /** API request routing strategy. */
  apiSource: 'mock' | 'real';

  /** Base URL for the auth/ecommerce backend. */
  apiUrl: string;

  /** Content bundle strategy — 'backend' reads from be-default-* endpoints. */
  contentSource: 'local' | 'backend';

  /** Base URL for the mock json-server (development only). */
  mockServerUrl: string;

  /** Firebase project configuration. */
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

// ---------------------------------------------------------------------------
// Development environment
// ---------------------------------------------------------------------------

/**
 * Active development configuration.
 * Vite replaces this export with `environment.prod.ts` during `vite build`.
 */
export const environment: Environment = {
  production: false,

  /** Proxy /api/v1/* to the json-server mock backend via vite.config.ts. */
  apiSource: 'mock',

  apiUrl: 'https://api.freeapi.app/api/v1',

  /**
   * 'backend' → fetch locale/error bundles from /content/be-default-*
   * Network tab signal: "be-default-ar" confirms backend mode is active.
   */
  contentSource: 'backend',

  mockServerUrl: 'http://localhost:3001',

  firebase: {
    apiKey:            'AIzaSyDEjiPV80n5Kj-JFv4QB2YP6nX5akbStqE',
    authDomain:        'react-auth-bf4ca.firebaseapp.com',
    projectId:         'react-auth-bf4ca',
    storageBucket:     'react-auth-bf4ca.firebasestorage.app',
    messagingSenderId: '377369672730',
    appId:             '1:377369672730:web:a8cf8c08bcb17cf44aa5a3',
  },
};
