/**
 * @fileoverview Production environment configuration.
 *
 * ## File replacement (Angular-style)
 *
 * This file is never imported directly. Vite's `resolve.alias` in
 * `vite.config.ts` replaces `@/environments/environment` with this file
 * during `vite build`. In the dev server (`vite dev`), the alias points to
 * `environment.ts` instead.
 *
 * ## Updating production values
 *
 * Edit the `environment` object below and run `vite build`.
 * No `.env.production` file is needed — this file IS the production config.
 *
 * @module environments/environment.prod
 */

import type { Environment } from './environment';

/**
 * Production environment configuration.
 *
 * Consumers import `@/environments/environment` — Vite resolves this to
 * the current file during production builds automatically.
 */
export const environment: Environment = {
  production: true,

  apiSource: 'real',

  /** Replace with your actual production API base URL. */
  apiUrl: 'https://api.freeapi.app/api/v1',

  contentSource: 'backend',

  /** Not used in production — present for interface completeness. */
  mockServerUrl: '',

  firebase: {
    apiKey:            'AIzaSyDEjiPV80n5Kj-JFv4QB2YP6nX5akbStqE',
    authDomain:        'react-auth-bf4ca.firebaseapp.com',
    projectId:         'react-auth-bf4ca',
    storageBucket:     'react-auth-bf4ca.firebasestorage.app',
    messagingSenderId: '377369672730',
    appId:             '1:377369672730:web:a8cf8c08bcb17cf44aa5a3',
  },
};
