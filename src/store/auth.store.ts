/**
 * @fileoverview Zustand authentication store.
 *
 * ## State
 *
 * - `user` — the authenticated user object (`UserType | null`). Persisted to
 *   `localStorage` so that protected routes can perform role-based redirects
 *   immediately after a page refresh without requiring an additional API call.
 * - `accessToken` — the current JWT access token. NOT persisted to
 *   localStorage; it lives only in memory for this tab's lifetime. The
 *   authoritative copy is the HttpOnly cookie managed by `cookieService`.
 *
 * ## Why persist `user` but not `accessToken`?
 *
 * The access token is already persisted in a browser cookie by
 * `cookieService.setToken()` (called inside `setAuth` and `setAccessToken`).
 * The Axios request interceptor reads it from the cookie on every request, so
 * the token does not need to be in the Zustand store at all — the store's
 * `accessToken` field is just a convenience for components that want to react
 * to token changes without subscribing to cookie events.
 *
 * Persisting `user` to `localStorage` (under the key `'auth-user'`) solves the
 * problem of `user` being `null` after a hard page refresh: the store is
 * initialised synchronously from `localStorage` before any component renders,
 * so `ProtectedRoute` and `RoleGuard` can read `user.role` immediately.
 *
 * ## Circular dependency note
 *
 * Do NOT import the `api` (Axios) instance from `src/api/axios.ts` into this
 * file. The Axios instance imports `useAuthStore.getState()` to call
 * `setAccessToken` and `logout` inside its response interceptor — importing
 * `api` here would create a circular module dependency that breaks Vite's HMR
 * and the production bundle.
 *
 * @module store/auth.store
 */

import type { UserType } from '@/types/auth.types';
import { cookieService } from '@/utils/cookie.service';
import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Persistence helpers (lightweight, no middleware dependency)
// ---------------------------------------------------------------------------

const USER_STORAGE_KEY = 'auth-user';

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

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

/**
 * AuthState defines the shape of the authentication state in our application.
 * It includes the current user, access token, and actions to set authentication
 * and logout.
 */
type AuthState = {
  user: UserType | null;
  accessToken: string | null;

  setAuth: (user: UserType, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * useAuthStore is a Zustand store that manages the authentication state of the application.
 * It provides a way to set the current user and access token, as well as a logout function
 * that clears the authentication state and removes the token from cookies.
 *
 * The `user` object is additionally persisted to `localStorage` so that
 * `ProtectedRoute` and `RoleGuard` can perform role checks immediately after
 * a page refresh without waiting for an API call.
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initialise user from localStorage (synchronous — no flicker on refresh)
  user: loadStoredUser(),
  accessToken: null,

  setAuth: (user, accessToken) => {
    cookieService.setToken(accessToken);
    persistUser(user);
    set({ user, accessToken });
  },

  setAccessToken: (accessToken) => {
    cookieService.setToken(accessToken);
    set({ accessToken });
  },

  logout: () => {
    cookieService.removeToken();
    clearPersistedUser();
    set({ user: null, accessToken: null });
  },
}));
