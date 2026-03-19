/**
 * @fileoverview Axios instance factory — API source switching.
 *
 * ## API source strategy
 *
 * | apiSource | Base URL                         | Traffic routed to         |
 * |-----------|----------------------------------|---------------------------|
 * | `mock`    | `/api/v1`                        | Vite proxy → json-server  |
 * | `real`    | `environment.apiUrl`             | Real backend              |
 *
 * In mock mode, Vite's `server.proxy` config forwards all `/api/v1/*`
 * requests to `http://localhost:3001` (the json-server mock backend).
 * Set `VITE_API_SOURCE=mock` in `.env.local` for local development.
 *
 * @module config/Define
 */

import { createApiInstance } from '@/api/base/axios';
import { environment } from '@/environments/environment';

/**
 * Base path used for all API calls in mock mode.
 * Vite proxies this path to the json-server at localhost:3001.
 */
const MOCK_API_BASE = '/api/v1';

const AUTH_BASE = environment.apiSource === 'mock'
  ? MOCK_API_BASE
  : (environment.apiUrl || MOCK_API_BASE);

/**
 * Axios instance used by all API modules.
 * In mock mode → `/api/v1/…` (Vite-proxied to json-server).
 * In real mode → `environment.apiUrl/…` (production backend).
 */
export const authUrl = createApiInstance(AUTH_BASE);
