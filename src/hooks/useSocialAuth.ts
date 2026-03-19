import { useState } from "react";
import {
  signInWithPopup,
  type OAuthProvider,
  type AuthProvider,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  facebookProvider,
  microsoftProvider,
} from "@/config/firebase";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate } from "react-router-dom";
import type { UserType } from "@/types/auth.types";
import { useCartMerge } from "@/hooks/useCartMerge";
import { useWishlistSync } from "@/hooks/useWishlistSync";
import { prefetchAdminDashboard } from "@/utils/prefetch";

/**
 * @fileoverview useSocialAuth — custom hook for Firebase-based social authentication.
 *
 * ## Social Login Redirect Flow
 *
 * After a successful Firebase `signInWithPopup` call the hook:
 * 1. Extracts the Firebase user and ID token (used as the access token).
 * 2. Constructs a local `UserType` object so the Zustand auth store has a
 *    consistent user shape regardless of login method (email or social).
 * 3. Calls `setAuth(user, accessToken)` — this persists the user to
 *    `localStorage` AND stores the token in a cookie so subsequent API
 *    requests are authenticated.
 * 4. Navigates to the role-appropriate landing page:
 *    - `ADMIN` / `MANAGER` → `/admin/products`
 *    - `CUSTOMER` (default for social users) → `/user/home`
 *
 * ## Why role-based navigation is required
 *
 * The application enforces RBAC through `RoleGuard` at the route level.
 * Redirecting directly to the role-correct landing page prevents an extra
 * guard round-trip and gives instant feedback about which dashboard the
 * user has access to. Without this redirect the user remains on the login
 * page with no visual feedback despite being authenticated.
 *
 * ## Social users and the CUSTOMER role
 *
 * Firebase social auth does not provide a backend-assigned role. All social
 * login users are treated as `CUSTOMER` (the same role new email registrants
 * receive) so they can access `/user/home` and the ecommerce routes guarded
 * by `RoleGuard(['CUSTOMER','ADMIN','MANAGER'])`.
 *
 * @module hooks/useSocialAuth
 */

/** Supported social authentication providers. */
type SocialProvider = "google" | "facebook" | "microsoft";

/**
 * Mapping of social provider names to their corresponding Firebase Auth
 * providers. Keyed lookup avoids a switch/if-else chain in the handler.
 */
const providerMap: Record<SocialProvider, AuthProvider | OAuthProvider> = {
  google: googleProvider,
  facebook: facebookProvider,
  microsoft: microsoftProvider,
};

/**
 * Custom hook that encapsulates social authentication via Firebase
 * `signInWithPopup`, updates the Zustand auth store, and triggers
 * role-based navigation after a successful login.
 *
 * @returns
 * - `handleSocialLogin(providerName)` — initiates the popup flow for the
 *   given provider; must be called from a user gesture (button click).
 * - `loading` — the currently in-flight provider name, or `null`.
 * - `error` — human-readable error string from the last failed attempt, or
 *   `null` if no error has occurred.
 */
export function useSocialAuth() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mergeGuestCartWithServer } = useCartMerge();
  const { syncWishlistAfterLogin } = useWishlistSync();

  /**
   * Initiates the Firebase popup login for the given social provider.
   *
   * On success:
   * 1. Persists the user and token via `setAuth`.
   * 2. Navigates to the role-appropriate landing page with `replace: true`
   *    so the login page is removed from the browser history stack — pressing
   *    the back button after login will not return the user to the login form.
   *
   * On failure:
   * - User-cancelled popup (`auth/popup-closed-by-user`,
   *   `auth/cancelled-popup-request`) is treated as a no-op; no error is
   *   shown because the user intentionally dismissed the window.
   * - All other errors surface a human-readable message via `setError`.
   *
   * @param providerName - The social provider to authenticate with.
   */
  const handleSocialLogin = async (providerName: SocialProvider) => {
    try {
      setError(null);
      setLoading(providerName);

      const provider = providerMap[providerName];
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const accessToken = await firebaseUser.getIdToken();

      // Social login users receive the CUSTOMER role so they can access
      // the ecommerce routes protected by RoleGuard(['CUSTOMER','ADMIN','MANAGER']).
      const user: UserType = {
        _id: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        username:
          firebaseUser.displayName ??
          firebaseUser.email?.split("@")[0] ??
          firebaseUser.uid,
        role: "CUSTOMER",
      };

      setAuth(user, accessToken);

      // Fire-and-forget: merge guest localStorage cart and sync wishlist
      // to the server in the background — navigation is not delayed.
      void mergeGuestCartWithServer();
      void syncWishlistAfterLogin();

      // Start downloading the admin dashboard chunk for staff users.
      if (user.role === "ADMIN" || user.role === "MANAGER") {
        prefetchAdminDashboard();
      }

      // Navigate to the role-appropriate landing page.
      // replace: true removes the login route from history so the back
      // button does not return an already-authenticated user to the form.
      if (user.role === "ADMIN" || user.role === "MANAGER") {
        navigate("/admin/products", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // User-dismissed popups are not errors — stay silent.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      const message = (err as { message?: string })?.message ?? "";
      console.error(`[SocialAuth] ${providerName} error (${code}):`, message);
      setError(`Login failed (${code ?? "unknown"}). Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  return { handleSocialLogin, loading, error };
}
