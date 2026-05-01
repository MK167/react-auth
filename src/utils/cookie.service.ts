import Cookies from "js-cookie";

const TOKEN_KEY         = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const COOKIE_OPTS = {
  expires: 7,
  secure: import.meta.env.PROD,
  sameSite: "lax",
} as const;

/**
 * A service for managing authentication tokens using cookies.
 * Provides methods to set, get, and remove the access token and refresh token.
 *
 * Both tokens use the same cookie options:
 *   - 7-day expiry
 *   - Secure: enabled in production (HTTPS) only — Safari refuses to set Secure
 *     cookies over HTTP, so this is `false` in development to avoid silent drops
 *   - SameSite=Lax: allows cookies through top-level OAuth/Firebase redirects
 *     while still blocking cross-site POST requests
 *
 * In a production backend the refresh token would be an HttpOnly cookie set by
 * the server — this client-side approach is used for the mock-server dev workflow.
 */
export const cookieService = {
  setToken: (token: string) => {
    Cookies.set(TOKEN_KEY, token, COOKIE_OPTS);
  },

  getToken: () => {
    return Cookies.get(TOKEN_KEY);
  },

  removeToken: () => {
    Cookies.remove(TOKEN_KEY);
  },

  setRefreshToken: (token: string) => {
    Cookies.set(REFRESH_TOKEN_KEY, token, COOKIE_OPTS);
  },

  removeRefreshToken: () => {
    Cookies.remove(REFRESH_TOKEN_KEY);
  },
};
