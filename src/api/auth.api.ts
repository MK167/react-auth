import type { LoginFormValues } from "@/schemas/login.schema";
import type { AuthResponse, RegisterResponse } from "@/types/auth.types";
import type { RegisterFormValues } from "@/schemas/register.schema";
import { authUrl } from "@/config/Define";

/**
 * Logs in a user with the provided credentials.
 *
 * @param {LoginFormValues} payload - The login form values containing email and password.
 * @returns {Promise<AuthResponse>} A promise that resolves to the authentication response containing the token and user information.
 */
export const loginApi = async (
  payload: LoginFormValues,
): Promise<AuthResponse> => {
  const response = await authUrl.post<AuthResponse>("/users/login", payload);
  return response.data;
};

/**
 *
 * @param {RegisterFormValues} payload - The registration form values containing full name, email, password, and gender.
 * @returns {Promise<RegisterResponse>} A promise that resolves to the registration response containing the user information upon successful registration.
 * @throws Will throw an error if the registration API call fails, which can be caught and handled by the caller to provide feedback to the user.
 * @example
 * Example of using the `registerApi` function to register a new user:
 * const registrationData: RegisterFormValues = {
 *   fullName: "John Doe",
 *   email: "john.doe@example.com",
 *   password: "secure@Password123",
 *   gender: "male"
 * };
 */
export const registerApi = async (
  payload: RegisterFormValues,
): Promise<RegisterResponse> => {
  const response = await authUrl.post<RegisterResponse>(
    "/users/register",
    payload,
  );
  return response.data;
};
