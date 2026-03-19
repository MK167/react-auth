/**
 * @fileoverview Zustand authentication store.
 *
 * ## State
 *
 * - `user`         — the authenticated user object (`UserType | null`). Persisted
 *                    to `localStorage` so protected routes can do role checks
 *                    immediately after a page refresh without an API call.
 * - `accessToken`  — the current JWT access token (in-memory only). The
 *                    authoritative copy is the HttpOnly cookie managed by
 *                    `cookieService`.
 * - `featureFlags` — `Record<string, boolean>` of enabled features. Persisted
 *                    to `localStorage` under `'auth-feature-flags'`. Loaded from
 *                    the backend after login via `setFeatureFlags()`. Guards and
 *                    components read flags via `useAuthStore((s) => s.featureFlags)`.
 *
 * ## Why persist `user` but not `accessToken`?
 *
 * The access token is already persisted in a browser cookie by
 * `cookieService.setToken()`. The Axios request interceptor reads it from the
 * cookie on every request, so the token does not need to be in the Zustand store
 * — the store's `accessToken` field is a convenience for components that want to
 * react to token changes without subscribing to cookie events.
 *
 * Persisting `user` to `localStorage` (under `'auth-user'`) solves the problem
 * of `user` being `null` after a hard page refresh: the store is initialised
 * synchronously from `localStorage` before any component renders.
 *
 * ## Feature flags lifecycle
 *
 * 1. User logs in → `setAuth(user, token)` is called.
 * 2. The login handler optionally calls `setFeatureFlags(flags)` with flags
 *    returned by the backend (or a separate `/feature-flags` API call).
 * 3. `FeatureGuard`, `WhitelistGuard`, and `DeepLinkGuard` read flags from here.
 * 4. `logout()` clears flags alongside user/token data.
 *
 * ## Circular dependency note
 *
 * Do NOT import the `api` (Axios) instance from `src/api/axios.ts` into this
 * file. The Axios instance imports `useAuthStore.getState()` to call
 * `setAccessToken` and `logout` — importing `api` here would create a circular
 * module dependency that breaks Vite HMR and the production bundle.
 *
 * @module store/auth.store
 */

import type { UserType } from '@/types/auth.types';
import { cookieService } from '@/utils/cookie.service';
import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const USER_STORAGE_KEY         = 'auth-user';
const FEATURE_FLAGS_STORAGE_KEY = 'auth-feature-flags';

// ---------------------------------------------------------------------------
// Persistence helpers (lightweight, no middleware dependency)
// ---------------------------------------------------------------------------

function loadStoredUser(): UserType | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserType;
  } catch {
    return null;
  }
}

function persistUser(user: UserType): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Storage write failure is non-fatal
  }
}

function clearPersistedUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Non-fatal
  }
}

function loadStoredFeatureFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
    if (!raw) return defaultFeatureFlags();
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return defaultFeatureFlags();
  }
}

function persistFeatureFlags(flags: Record<string, boolean>): void {
  try {
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // Non-fatal
  }
}

function clearPersistedFeatureFlags(): void {
  try {
    localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY);
  } catch {
    // Non-fatal
  }
}

/**
 * Default feature flags for development. Enables the error playground so
 * developers can access it without a backend feature-flag API.
 *
 * In production, flags are overwritten by `setFeatureFlags()` after login.
 */
function defaultFeatureFlags(): Record<string, boolean> {
  if (import.meta.env.DEV) {
    return {
      errorPlayground: true,
      betaReports:     false,
      analyticsV2:     false,
      newCheckout:     false,
    };
  }
  return {};
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type AuthState = {
  /** Authenticated user — persisted to localStorage for refresh survival. */
  user: UserType | null;
  /** Current JWT access token (in-memory only; cookie is authoritative). */
  accessToken: string | null;
  /**
   * Feature flags. Keys are flag names; values are booleans.
   * Persisted to localStorage so flags survive page refresh.
   *
   * @example
   * ```ts
   * const { featureFlags } = useAuthStore();
   * if (featureFlags.analyticsV2) { ... }
   * ```
   */
  featureFlags: Record<string, boolean>;

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Called after a successful login. Persists the user to localStorage,
   * stores the access token in the cookie, and updates in-memory state.
   */
  setAuth: (user: UserType, accessToken: string) => void;

  /**
   * Updates the access token after a silent refresh. Does NOT update `user`.
   */
  setAccessToken: (accessToken: string) => void;

  /**
   * Replaces the entire feature flags map. Called after login when the backend
   * returns user-specific flags, or from the Error Playground for testing.
   */
  setFeatureFlags: (flags: Record<string, boolean>) => void;

  /**
   * Clears all auth state (user, token, flags) and removes persisted data.
   * Called on logout or when a silent token refresh fails.
   */
  logout: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Global authentication store. Subscribe in React components via
 * `useAuthStore()`, or access imperatively outside React via
 * `useAuthStore.getState()`.
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initialise synchronously from localStorage — no flicker on refresh.
  user:         loadStoredUser(),
  accessToken:  null,
  featureFlags: loadStoredFeatureFlags(),

  setAuth: (user, accessToken) => {
    cookieService.setToken(accessToken);
    persistUser(user);
    set({ user, accessToken });
  },

  setAccessToken: (accessToken) => {
    cookieService.setToken(accessToken);
    set({ accessToken });
  },

  setFeatureFlags: (flags) => {
    persistFeatureFlags(flags);
    set({ featureFlags: flags });
  },

  logout: () => {
    cookieService.removeToken();
    clearPersistedUser();
    clearPersistedFeatureFlags();
    set({ user: null, accessToken: null, featureFlags: defaultFeatureFlags() });
  },
}));
