/**
 * @fileoverview Unit tests for cookieService.
 *
 * ## Why mock js-cookie?
 *
 * The cookie service wraps `js-cookie`, a third-party library. We mock it for
 * two reasons:
 *
 * 1. **Environment limitation** — jsdom doesn't fully implement the `Secure`
 *    cookie attribute (requires HTTPS). js-cookie silently drops cookies with
 *    `secure: true` in jsdom. Testing against the real library would always
 *    see `getToken()` return `undefined` regardless of what was set.
 *
 * 2. **Test isolation** — We want to assert that cookieService calls the
 *    correct js-cookie methods with the correct arguments, NOT that js-cookie
 *    itself works correctly (that's the library's own test responsibility).
 *
 * ## vi.mock() hoisting
 *
 * `vi.mock('@/some-module', factory)` is automatically hoisted to the top of
 * the file by Vitest's Babel/SWC transform — even if it appears after imports
 * in your source code. This means the mock is active BEFORE the module under
 * test (`cookie.service.ts`) loads, so when cookieService imports js-cookie,
 * it gets the mock version.
 *
 * ## vi.mocked()
 *
 * `vi.mocked(fn)` is a TypeScript helper that casts `fn` to `MockedFunction<typeof fn>`.
 * This enables `.mock.calls`, `.mockReturnValue()`, etc. without type errors.
 * It's equivalent to `(fn as MockedFunction<typeof fn>)` but shorter.
 */

import { describe, it, expect, vi } from 'vitest';
import Cookies from 'js-cookie';

// WHY vi.mock is placed here:
// Vitest hoists this call BEFORE any import is evaluated — so when
// cookie.service.ts is loaded below, it receives the mock Cookies object.
vi.mock('js-cookie', () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}));

// Import AFTER the mock declaration so we get the module that uses the mock.
import { cookieService } from '@/utils/cookie.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedSet    = vi.mocked(Cookies.set);
const mockedGet    = vi.mocked(Cookies.get);
const mockedRemove = vi.mocked(Cookies.remove);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cookieService', () => {
  /**
   * @group setToken
   * Verifies the access token is stored with the correct key and options.
   */
  describe('setToken', () => {
    it('calls Cookies.set with the accessToken key and the provided value', () => {
      // WHY: If the key changes, the Axios interceptor's getToken() call will
      //      return undefined and all authenticated requests will fail with 401.
      cookieService.setToken('my-jwt-token');
      expect(mockedSet).toHaveBeenCalledWith(
        'accessToken',
        'my-jwt-token',
        expect.objectContaining({ expires: 7 }),
      );
    });

    it('sets the cookie with a 7-day expiry', () => {
      // WHY: 7-day expiry is the designed session length. If someone changes
      //      this to 1 (day) or 7000 (ms instead of days), this test catches it.
      cookieService.setToken('token');
      expect(mockedSet).toHaveBeenCalledWith(
        'accessToken',
        'token',
        expect.objectContaining({ expires: 7 }),
      );
    });

    it('sets the cookie with secure: true and sameSite: strict', () => {
      // WHY: Security attributes prevent CSRF and man-in-the-middle theft.
      //      Removing them is a security regression — this test acts as a
      //      safety net for accidental removal.
      cookieService.setToken('token');
      expect(mockedSet).toHaveBeenCalledWith(
        'accessToken',
        'token',
        expect.objectContaining({ secure: true, sameSite: 'strict' }),
      );
    });
  });

  /**
   * @group getToken
   */
  describe('getToken', () => {
    it('calls Cookies.get with the accessToken key', () => {
      // WHY: Verifies the read uses the same key constant as the write.
      //      A typo like "acccessToken" would break auth silently.
      mockedGet.mockReturnValue('my-jwt-token' as unknown as { [key: string]: string });
      const token = cookieService.getToken();
      expect(mockedGet).toHaveBeenCalledWith('accessToken');
      expect(token).toBe('my-jwt-token');
    });

    it('returns undefined when no token is stored', () => {
      // WHY: getToken() must not throw when the cookie is absent — the Axios
      //      interceptor checks for undefined to skip the Authorization header.
      mockedGet.mockReturnValue(undefined as unknown as { [key: string]: string });
      expect(cookieService.getToken()).toBeUndefined();
    });
  });

  /**
   * @group removeToken
   */
  describe('removeToken', () => {
    it('calls Cookies.remove with the accessToken key', () => {
      // WHY: logout() calls removeToken(). If the key is wrong, the cookie
      //      persists after logout and the user stays "authenticated".
      cookieService.removeToken();
      expect(mockedRemove).toHaveBeenCalledWith('accessToken');
    });
  });

  /**
   * @group refreshToken
   * The refresh token uses a different key ('refreshToken') and the same
   * security options as the access token.
   */
  describe('setRefreshToken', () => {
    it('calls Cookies.set with the refreshToken key', () => {
      cookieService.setRefreshToken('refresh-jwt');
      expect(mockedSet).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-jwt',
        expect.objectContaining({ expires: 7 }),
      );
    });
  });

  describe('removeRefreshToken', () => {
    it('calls Cookies.remove with the refreshToken key', () => {
      cookieService.removeRefreshToken();
      expect(mockedRemove).toHaveBeenCalledWith('refreshToken');
    });
  });
});
