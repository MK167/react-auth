import type { UserType } from "@/types/auth.types";
import { cookieService } from "@/utils/cookie.service";
import { create } from "zustand";

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

/**
 * useAuthStore is a Zustand store that manages the authentication state of the application.
 * It provides a way to set the current user and access token, as well as a logout function
 * that clears the authentication state and removes the token from cookies.
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  accessToken: null,

  // Actions
  setAuth: (user, accessToken) => {
    cookieService.setToken(accessToken);
    set({ user, accessToken });
  },

  setAccessToken: (accessToken) => {
    cookieService.setToken(accessToken);
    set({ accessToken });
  },

  logout: () => {
    cookieService.removeToken();
    set({ user: null, accessToken: null });
  },
}));
