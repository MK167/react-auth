/**
 * Production build + mock API (Docker Compose).
 *
 * Same as `environment.prod.ts` except `apiSource: 'mock'` so Axios uses
 * relative `/api/v1` — nginx proxies that path to the mock-server container.
 *
 * Activated when `VITE_BUILD_PROFILE=docker-mock` at build time (see vite.config.ts).
 *
 * @module environments/environment.prod.docker
 */

import type { Environment } from './environment';

export const environment: Environment = {
  production: true,

  apiSource: 'mock',

  /** Unused in mock mode (base URL is `/api/v1`), kept for interface parity. */
  apiUrl: 'https://api.freeapi.app/api/v1',

  contentSource: 'backend',

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
