import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from "firebase/auth";

/**
 * Firebase configuration object. The values are loaded from environment variables
 * defined in the .env file at the root of the project. Make sure to create this
 * file and add the necessary Firebase configuration values before running the app.
 * Example .env file:
 * VITE_FIREBASE_API_KEY=your_api_key
 * VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
 * VITE_FIREBASE_PROJECT_ID=your_project_id
 * VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
 * VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
 * VITE_FIREBASE_APP_ID=your_app_id
 * Note: The VITE_ prefix is required for environment variables to be accessible in the client-side code when using Vite.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};


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
