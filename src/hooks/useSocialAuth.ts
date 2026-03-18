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
import type { UserType } from "@/types/auth.types";


/**
 * Custom hook to handle social authentication with Google, Facebook, and Microsoft.
 * Provides a unified interface for initiating social logins and managing loading/error states.
 *
 * @returns An object containing the `handleSocialLogin` function, `loading` state, and `error` message.
 * - `handleSocialLogin(providerName: SocialProvider)`: Function to initiate login with the specified provider.
 * - `loading`: Indicates which provider is currently loading (or null if none).
 * - `error`: Contains any error message from the last login attempt.
 * 
 */
type SocialProvider = "google" | "facebook" | "microsoft";


/**
 * Mapping of social provider names to their corresponding Firebase Auth providers.
 * This allows for dynamic selection of the provider based on user interaction.
 */
const providerMap: Record<SocialProvider, AuthProvider | OAuthProvider> = {
  google: googleProvider,
  facebook: facebookProvider,
  microsoft: microsoftProvider,
};

/**
 * Custom hook to handle social authentication with Google, Facebook, and Microsoft.
 * Provides a unified interface for initiating social logins and managing loading/error states.
 *
 * @returns An object containing the `handleSocialLogin` function, `loading` state, and `error` message.
 * - `handleSocialLogin(providerName: SocialProvider)`: Function to initiate login with the specified provider.
 * - `loading`: Indicates which provider is currently loading (or null if none).
 * - `error`: Contains any error message from the last login attempt.
 * 
 */
export function useSocialAuth() {
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);


  /**
   * Initiates the social login process for the specified provider.
   * @param providerName The name of the social provider to use for login.
   * @returns A promise that resolves when the login process is complete.
   * Handles errors gracefully, setting an appropriate error message if the login fails (except for user-initiated cancellations).
   * 
   */
  const handleSocialLogin = async (providerName: SocialProvider) => {
    try {
      setError(null);
      setLoading(providerName);

      const provider = providerMap[providerName];
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const accessToken = await firebaseUser.getIdToken();

      const user: UserType = {
        _id: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        username:
          firebaseUser.displayName ??
          firebaseUser.email?.split("@")[0] ??
          firebaseUser.uid,
        role: "USER",
      };

      setAuth(user, accessToken);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
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
