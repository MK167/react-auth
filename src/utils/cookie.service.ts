import Cookies from "js-cookie";

const TOKEN_KEY = "accessToken";

/**
 * A service for managing authentication tokens using cookies. 
 * Provides methods to set, get, and remove the token with secure and strict settings.
 */
export const cookieService = {
  setToken: (token: string) => {
    Cookies.set(TOKEN_KEY, token, {
      expires: 1,
      secure: true,
      sameSite: "strict",
    });
  },

  getToken: () => {
    return Cookies.get(TOKEN_KEY);
  },

  removeToken: () => {
    Cookies.remove(TOKEN_KEY);
  },
};
