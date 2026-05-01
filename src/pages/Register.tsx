/**
 * @fileoverview Register page — new user account creation form.
 *
 * ## Layout container design decisions
 *
 * This component returns the form card directly (no outer full-screen
 * wrapper). The centering and background are handled by `AuthLayout`, which
 * renders its `<main>` with `flex items-center justify-center` and the
 * app-wide background colour.
 *
 * Using `max-w-md` (448 px) instead of the narrower `max-w-sm` (384 px)
 * gives the six-field registration form the breathing room it needs: radio
 * groups and select dropdowns feel cramped at the smaller width. Login, which
 * has only two fields, stays at `max-w-sm` so both cards are sized to their
 * content rather than being uniform.
 *
 * ## Responsive width strategy
 *
 * `w-full max-w-md` lets the card fill the viewport on small screens while
 * capping at 448 px on wider ones. Combined with `px-4` on the AuthLayout
 * `<main>`, the card always has 16 px gutters on mobile.
 *
 * ## Accessibility considerations
 *
 * Every input is rendered by `InputElement` which sets `id`, `htmlFor`,
 * `aria-invalid`, and `aria-describedby` automatically. The submit button is
 * disabled during submission and an animated spinner provides a visual
 * in-progress cue for users who cannot rely on colour alone.
 *
 * ## Loading UX improvements
 *
 * The component tracks two sequential async steps — `"register"` (POST to
 * `/users/register`) and `"login"` (POST to `/users/login`) — via the
 * `authStep` state. The button label changes for each step so the user
 * always knows what the app is doing without needing to watch the network tab.
 *
 * @module pages/Register
 */

import { loginApi, registerApi } from "@/api/auth.api";
import ErrorNotification from "@/components/auth/common/error-notification/ErrorNotification";
import InputElement from "@/components/form/input/FormInputControl";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/schemas/register.schema";
import { useAuthStore } from "@/store/auth.store";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { ButtonLoadingState } from "@/types/auth.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

const initialValue: RegisterFormValues = {
  username: "",
  email: "",
  password: "",
  gender: "",
  country: "",
  bio: "",
};

/**
 * Registration page rendered inside `AuthLayout` at `/register`.
 *
 * Returns the form card directly — centering and background are provided by
 * `AuthLayout` so no wrapper div is needed here.
 */
export default function Register() {
  usePageMeta('Create Account', 'Create a free ShopHub account and start shopping today.');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [authStep, setAuthStep] = useState<ButtonLoadingState>("idle");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: initialValue,
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    criteriaMode: "all",
  });

  /**
   * Two-step submit handler:
   * 1. Registers the new account.
   * 2. Immediately logs in so the user has a valid session without a second
   *    form submission.
   * 3. Persists auth state and navigates to `/user/home`.
   *
   * New accounts always receive the `CUSTOMER` role, so the user landing
   * page is always the ecommerce home — no role check is needed here.
   *
   * @param data - Validated form values from `react-hook-form`.
   */
  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setServerError("");
      // Step 1 — create the account
      setAuthStep("register");
      const response = await registerApi(data);

      if (response.statusCode === 200) {
        // Step 2 — sign in immediately after registration
        setAuthStep("login");
        const loginRes = await loginApi({
          email: data.email,
          password: data.password,
        });
        // Step 3 — persist session and navigate
        setAuth(loginRes.data.user, loginRes.data.accessToken);
        navigate("/", { replace: true });
      }
    } catch (error: unknown) {
      setAuthStep("idle");
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

  const isLoading = authStep !== "idle";

  /**
   * Dynamic button label mirrors the current async step so the user always
   * has feedback without relying on colour or the spinner alone.
   */
  const buttonText =
    authStep === "register"
      ? "Creating account..."
      : authStep === "login"
        ? "Signing in..."
        : "Register";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm"
    >
      {/* SERVER ERROR */}
      <ErrorNotification serverError={serverError} text="Backend Error:" />

      <h1 className="text-xl font-semibold text-center mb-6 text-gray-900 dark:text-white">
        Create your account
      </h1>

      <InputElement
        name="username"
        label="Username"
        placeholder="JohnDoe"
        register={register}
        error={errors.username?.message}
      />

      <InputElement
        name="email"
        label="Email"
        type="email"
        placeholder="name@example.com"
        register={register}
        error={errors.email?.message}
      />

      <InputElement
        name="password"
        label="Password"
        type="password"
        register={register}
        error={errors.password?.message}
      />

      <InputElement
        name="gender"
        label="Gender"
        type="radio"
        options={[
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ]}
        register={register}
        error={errors.gender?.message}
      />

      <InputElement
        name="country"
        label="Country"
        type="select"
        options={[
          { label: "Egypt", value: "eg" },
          { label: "USA", value: "us" },
          { label: "Germany", value: "de" },
        ]}
        register={register}
        error={errors.country?.message}
      />

      <InputElement
        name="bio"
        label="Bio"
        type="textarea"
        placeholder="Tell us about yourself"
        register={register}
        error={errors.bio?.message}
      />

      {/*
       * The button is disabled while loading to prevent duplicate submissions.
       * `flex items-center justify-center gap-2` keeps the spinner and label
       * horizontally centred regardless of label length.
       */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-black dark:bg-indigo-600 text-white rounded-lg p-2.5 font-medium
        hover:bg-gray-900 dark:hover:bg-indigo-700 transition
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {buttonText}
      </button>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-black dark:text-indigo-400 font-medium hover:underline"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
