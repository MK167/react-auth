import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { environment } from "@/environments/environment";

/**
 * Firebase configuration loaded from the typed environment object.
 * All values are sourced from `VITE_FIREBASE_*` variables in the `.env` files.
 * See `src/environments/environment.ts` for the full variable reference.
 */
const firebaseConfig = environment.firebase;


/**
 * Initialize Firebase app with the provided configuration. This creates a singleton instance of the Firebase app that can be used throughout the application.
 * The authentication providers (Google, Facebook, Microsoft) are also set up here for easy access in the authentication logic of the app.
 */
const app = initializeApp(firebaseConfig);


/**
 * Export the Firebase authentication instance and the authentication providers for use in other parts of the application. This allows you to easily integrate Firebase authentication into your app's login flow, enabling users to sign in with their Google, Facebook, or Microsoft accounts.
 * The auth instance is used to manage user authentication state, while the providers are used to initiate the sign-in process with the respective third-party services.
 * Make sure to handle the authentication logic (e.g., sign-in, sign-out, error handling) in your components or services where you use these exports.
 */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const microsoftProvider = new OAuthProvider("microsoft.com");
microsoftProvider.addScope("email");
microsoftProvider.addScope("profile");
microsoftProvider.setCustomParameters({
  prompt: "select_account",
  tenant: "common", // accepts both personal and work/school Microsoft accounts
});
