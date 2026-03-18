import { loginApi } from "@/api/auth.api";
import ErrorNotification from "@/components/auth/common/error-notification/ErrorNotification";
import Divider from "@/components/auth/Divider";
import SocialLogin from "@/components/auth/social-media-auth/SocialLogin";
import { loginSchema, type LoginFormValues } from "@/schemas/login.schema";
import { useAuthStore } from "@/store/auth.store";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function Login() {
  /**
   * State and form management for the login component. It uses the `useAuthStore` to manage authentication state and `useForm` from `react-hook-form` for form handling, including validation with `zodResolver`. The `serverError` state is used to capture and display any errors that occur during the login process.
   * @returns A TSX element representing the login form, including social login options, email and password fields, and error handling for server errors.
   * @throws Will set the server error state if the login API call fails, providing feedback to the user about the failure reason.
   */
  const { setAuth } = useAuthStore();

  /**
   * State to capture and display any errors that occur during the login process. It is initialized to `null` and updated with an error message if the login API call fails. This allows the component to provide feedback to the user about why the login attempt was unsuccessful.
   * @type {string | null} - The server error message, which can be a string describing the error or `null` if there is no error.
   * @default null - The initial state of `serverError` is set to `null`, indicating that there are no errors when the component first renders.
   * @example
   * Example of setting a server error after a failed login attempt
   * setServerError("Invalid email or password");
   */
  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * Form management using `react-hook-form` with validation handled by `zodResolver`. The form is initialized with default values for the email and password fields, and the validation schema is defined by `loginSchema`. The form state includes error handling and submission status, allowing for a responsive user experience during the login process.
   * @type {UseFormReturn<LoginFormValues>} - The return type of `useForm` which includes methods for registering form fields, handling form submission, and accessing form state such as errors and submission status.
   * @default - The form is initialized with default values for email and password set to empty strings.
   * @example
   * Example of using the `register` method to connect an input field to the form state:
   * <input {...register("email")} />
   * Example of handling form submission with `handleSubmit`:
   * <form onSubmit={handleSubmit(onSubmit)}>
   *   ...
   * </form>
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    criteriaMode: "all",
  });

  /**
   * Handles the form submission for user login. It calls the login API with the form data and updates the authentication state on success. If an error occurs, it captures and displays the error message.
   * @param data - The form values containing the user's email and password.
   * @returns A TSX element representing the login form.
   * @throws Will set the server error state if the login API call fails, providing feedback to the user about the failure reason.
   */
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);
      const response = await loginApi(data);
      setAuth(response.data.user, response.data.accessToken);
      console.info("Login successful:", response.data);
    } catch (error: unknown) {
      setServerError(
        (typeof error === "object" &&
          error !== null &&
          "response" in error &&
          (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message) ||
          "An unknown error occurred",
      );
    }
  };

  /**
   *
   * Render the login form with social login options, email and password fields, and error handling for server errors. The form is styled using Tailwind CSS classes and includes accessibility features such as ARIA attributes for error messages. The submit button is disabled while the form is submitting to prevent multiple submissions, and a loading spinner is displayed during the submission process.
   *
   */
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* SERVER ERROR */}
        <ErrorNotification serverError={serverError} text="Backend Error:" />

        <h1 className="text-xl font-semibold text-center mb-6">
          Welcome back!
        </h1>

        {/* SOCIAL */}
        <SocialLogin />

        {/* DIVIDER */}
        <Divider />

        {/* EMAIL */}
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">Email</label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />

            <input
              {...register("email")}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="w-full border border-gray-300 rounded-lg p-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="name@example.com"
              autoComplete="off"
            />
          </div>

          {/* FIXED ERROR HEIGHT */}
          <div className="h-5 mt-1">
            {errors.email && (
              <p id="email-error" className="text-red-500 text-xs">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* PASSWORD */}
        <div className="mb-2">
          <label className="text-sm font-medium block mb-1">Password</label>

          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />

            <input
              type="password"
              {...register("password")}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="w-full border border-gray-300 rounded-lg p-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your password"
              autoComplete="off"
            />
          </div>

          <div className="h-5 mt-1">
            {errors.password && (
              <p id="password-error" className="text-red-500 text-xs">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {/* FORGOT */}
        <div className="text-right mb-5">
          <a className="text-xs text-gray-500 hover:text-black cursor-pointer">
            Forgot password?
          </a>
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white rounded-lg p-2.5 font-medium 
          hover:bg-gray-900 transition 
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {isSubmitting ? "Signing in..." : "Continue"}
        </button>

        {/* REGISTER */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Don’t have an account?
          <span className="text-black ml-1 cursor-pointer hover:underline">
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
}
