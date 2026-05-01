/**
 * @fileoverview Unit tests for the Zustand authentication store.
 *
 * ## Why we mock cookieService, cart.store, and wishlist.store
 *
 * The auth store has three external dependencies:
 *
 * 1. **cookieService** — reads/writes browser cookies. jsdom's cookie support
 *    is limited (the `secure` attribute is silently dropped). Mocking lets us
 *    control what `getToken()` returns so we can test the stale-session
 *    detection branch deterministically.
 *
 * 2. **cart.store + wishlist.store** — `logout()` calls `clearCart()` and
 *    `clearItems()` as a side effect. Mocking prevents the persist middleware
 *    in those stores from writing to localStorage during auth tests.
 *
 * ## vi.hoisted — why it exists
 *
 * `vi.mock(factory)` is hoisted to the top of the file. But the factory
 * function cannot reference variables defined in the file body (they haven't
 * been declared yet at hoist-time). `vi.hoisted(() => vi.fn())` hoists a
 * value declaration alongside the mock so you can reference it inside the
 * factory AND later in the test body.
 *
 * ```ts
 * // Both of these are hoisted BEFORE any import is evaluated:
 * const mockClearCart = vi.hoisted(() => vi.fn());
 * vi.mock('@/store/cart.store', () => ({ useCartStore: { getState: () => ({ clearCart: mockClearCart }) } }));
 * ```
 *
 * ## setState — bypass the initialiser
 *
 * `resolveInitialAuthState()` runs at MODULE LOAD TIME. By the time tests run,
 * the store already has its initial state. We use `store.setState({})` to
 * override that initial state for each test, giving a clean slate.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock functions so they can be referenced in both vi.mock and tests
// ---------------------------------------------------------------------------

/**
 * `vi.hoisted` creates a value that is available inside `vi.mock` factory
 * functions even though those factories are hoisted before imports.
 */
const mockGetToken     = vi.hoisted(() => vi.fn<() => string | undefined>());
const mockSetToken     = vi.hoisted(() => vi.fn());
const mockRemoveToken  = vi.hoisted(() => vi.fn());
const mockRemoveRefreshToken = vi.hoisted(() => vi.fn());
const mockClearCart    = vi.hoisted(() => vi.fn());
const mockClearItems   = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks (hoisted automatically by Vitest)
// ---------------------------------------------------------------------------

vi.mock('@/utils/cookie.service', () => ({
  cookieService: {
    getToken:           mockGetToken,
    setToken:           mockSetToken,
    removeToken:        mockRemoveToken,
    setRefreshToken:    vi.fn(),
    removeRefreshToken: mockRemoveRefreshToken,
  },
}));

vi.mock('@/store/cart.store', () => ({
  useCartStore: {
    getState: () => ({ clearCart: mockClearCart }),
  },
}));

vi.mock('@/store/wishlist.store', () => ({
  useWishlistStore: {
    getState: () => ({ clearItems: mockClearItems }),
  },
}));

// Import AFTER mocks are declared
import { useAuthStore } from '@/store/auth.store';
import type { UserType } from '@/types/auth.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides?: Partial<UserType>): UserType {
  return {
    _id: 'user-001',
    email: 'user@example.com',
    username: 'testuser',
    role: 'CUSTOMER',
    ...overrides,
  };
}

function resetAuthStore() {
  // Reset to a known clean state before each test.
  // We use setState's replace mode (second arg = true) to fully reset.
  useAuthStore.setState({
    user: null,
    accessToken: null,
    featureFlags: {},
  });
  localStorage.clear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth store', () => {
  beforeEach(resetAuthStore);

  describe('initial state', () => {
    it('starts with user = null when no data is in localStorage', () => {
      // WHY: On first visit (no existing session), the store should have no user.
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('starts with accessToken = null', () => {
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('sets the user and accessToken in the store', () => {
      const user = makeUser();
      useAuthStore.getState().setAuth(user, 'jwt-token-abc');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.accessToken).toBe('jwt-token-abc');
    });

    it('calls cookieService.setToken with the provided access token', () => {
      // WHY: The token MUST be persisted to the cookie so the Axios interceptor
      //      can attach it to every subsequent request, even after a re-render.
      useAuthStore.getState().setAuth(makeUser(), 'my-jwt');
      expect(mockSetToken).toHaveBeenCalledWith('my-jwt');
    });

    it('persists the user to localStorage', () => {
      // WHY: localStorage persistence allows role checks to work immediately
      //      after a hard page refresh without an API round-trip.
      const user = makeUser({ username: 'persisted-user' });
      useAuthStore.getState().setAuth(user, 'token');

      const stored = JSON.parse(localStorage.getItem('auth-user') ?? 'null');
      expect(stored?.username).toBe('persisted-user');
    });
  });

  describe('setAccessToken', () => {
    it('updates the in-memory accessToken', () => {
      // WHY: After a silent token refresh, only the token changes — not the user.
      useAuthStore.getState().setAuth(makeUser(), 'old-token');
      useAuthStore.getState().setAccessToken('new-refreshed-token');

      expect(useAuthStore.getState().accessToken).toBe('new-refreshed-token');
    });

    it('calls cookieService.setToken with the new token', () => {
      useAuthStore.getState().setAccessToken('refreshed-jwt');
      expect(mockSetToken).toHaveBeenCalledWith('refreshed-jwt');
    });

    it('does NOT clear the user when updating the token', () => {
      // WHY: A token refresh must not log the user out!
      const user = makeUser();
      useAuthStore.getState().setAuth(user, 'old-token');
      useAuthStore.getState().setAccessToken('new-token');

      expect(useAuthStore.getState().user).toEqual(user);
    });
  });

  describe('setFeatureFlags', () => {
    it('updates the featureFlags in the store', () => {
      const flags = { realtimeChat: true, newCheckout: false };
      useAuthStore.getState().setFeatureFlags(flags);
      expect(useAuthStore.getState().featureFlags).toEqual(flags);
    });

    it('persists featureFlags to localStorage', () => {
      const flags = { analyticsV2: true };
      useAuthStore.getState().setFeatureFlags(flags);

      const stored = JSON.parse(
        localStorage.getItem('auth-feature-flags') ?? 'null',
      );
      expect(stored?.analyticsV2).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears user and accessToken from the store', () => {
      useAuthStore.getState().setAuth(makeUser(), 'jwt');
      useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('calls cookieService.removeToken', () => {
      // WHY: If the cookie is not removed, the Axios interceptor will keep
      //      sending the stale token, causing 401s on every request.
      useAuthStore.getState().logout();
      expect(mockRemoveToken).toHaveBeenCalled();
    });

    it('calls cookieService.removeRefreshToken', () => {
      useAuthStore.getState().logout();
      expect(mockRemoveRefreshToken).toHaveBeenCalled();
    });

    it('calls clearCart() to wipe client-side cart state', () => {
      // WHY: On logout, the cart must be cleared to prevent the next user
      //      on the same device from seeing the previous user's cart.
      useAuthStore.getState().logout();
      expect(mockClearCart).toHaveBeenCalled();
    });

    it('calls clearItems() to wipe client-side wishlist state', () => {
      useAuthStore.getState().logout();
      expect(mockClearItems).toHaveBeenCalled();
    });

    it('removes user from localStorage', () => {
      useAuthStore.getState().setAuth(makeUser(), 'jwt');
      useAuthStore.getState().logout();
      expect(localStorage.getItem('auth-user')).toBeNull();
    });
  });
});
