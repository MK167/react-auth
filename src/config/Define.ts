import { createApiInstance } from "@/api/axios";

/**
 * The base URL for all API requests. This is typically the root URL of your backend server.
 * By centralizing it here, you can easily change the API endpoint for different environments (development, staging, production) without having to modify individual API calls throughout the app.
 */

export const authUrl = createApiInstance(import.meta.env.VITE_LOGIN_AUTH_URL);