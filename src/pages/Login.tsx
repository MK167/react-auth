import { loginApi } from "@/api/auth.api";
import ErrorNotification from "@/components/auth/common/error-notification/ErrorNotification";
import Divider from "@/components/auth/Divider";
import SocialLogin from "@/components/auth/social-media-auth/SocialLogin";
import { loginSchema, type LoginFormValues } from "@/schemas/login.schema";
import { useAuthStore } from "@/store/auth.store";
import { useCartMerge } from "@/hooks/useCartMerge";
import { useWishlistSync } from "@/hooks/useWishlistSync";
import { prefetchAdminDashboard } from "@/utils/prefetch";
import { useI18n } from "@/i18n/i18n.context";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates and returns a safe redirect destination from the `targetUrl`
 * query param or the legacy `state.from` pattern.
 *
 * Security rules:
 * - Must be a relative path (starts with `/`)
 * - Cannot loop back to `/login` or `/register`
 * - URL-decoded to handle `encodeURIComponent` from ProtectedRoute
 */
function resolveRedirectTarget(
  targetUrlParam: string | null,
  stateFrom: string | undefined,
): string | null {
  // 1. Try ?targetUrl= query param (new pattern from ProtectedRoute)
  if (targetUrlParam) {
    try {
      const decoded = decodeURIComponent(targetUrlParam);
      if (
        decoded.startsWith('/') &&
        decoded !== '/login' &&
        decoded !== '/register'
      ) {
        return decoded;
      }
    } catch {
      // Malformed URL encoding — ignore and fall through
    }
  }

  // 2. Try state.from (legacy pattern, kept for backwards compat)
  if (stateFrom && stateFrom !== '/login' && stateFrom !== '/register') {
    return stateFrom;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { mergeGuestCartWithServer } = useCartMerge();
  const { syncWishlistAfterLogin } = useWishlistSync();
  const { t } = useI18n();

  const [serverError, setServerError] = useState<string | null>(null);

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

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);
      const response = await loginApi(data);
      const user = response.data.user;
      setAuth(user, response.data.accessToken);

      void mergeGuestCartWithServer();
      void syncWishlistAfterLogin();

      if (user.role === "ADMIN" || user.role === "MANAGER") {
        prefetchAdminDashboard();
      }

      // ── Resolve post-login destination ──────────────────────────────────
      // Priority: ?targetUrl= (deep link) > state.from (legacy) > role default

      const targetUrlParam = searchParams.get('targetUrl');
      const stateFrom = (location.state as { from?: { pathname?: string } } | null)
        ?.from?.pathname;

      const redirectTarget = resolveRedirectTarget(targetUrlParam, stateFrom);

      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
      } else if (user.role === "ADMIN" || user.role === "MANAGER") {
        navigate("/admin/products", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
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

  return (
    <form
      className="w-full max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* SERVER ERROR */}
      <ErrorNotification serverError={serverError} text={t('auth.login.backendError')} />

      <h1 className="text-xl font-semibold text-center mb-6 text-gray-900 dark:text-white">
        {t('auth.login.title')}
      </h1>

      {/* SOCIAL */}
      <SocialLogin />

      {/* DIVIDER */}
      <Divider />

      {/* EMAIL */}
      <div className="mb-4">
        <label className="text-sm font-medium block mb-1 text-gray-700 dark:text-gray-300">
          {t('auth.login.email')}
        </label>
        <div className="relative">
          <Mail
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            {...register("email")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 ps-9 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="name@example.com"
            autoComplete="off"
          />
        </div>
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
        <label className="text-sm font-medium block mb-1 text-gray-700 dark:text-gray-300">
          {t('auth.login.password')}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="password"
            {...register("password")}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 ps-9 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="••••••••"
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
      <div className="text-end mb-5">
        <a className="text-xs text-gray-500 hover:text-black dark:hover:text-white cursor-pointer">
          {t('auth.login.forgotPassword')}
        </a>
      </div>

      {/* BUTTON */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-black dark:bg-indigo-600 text-white rounded-lg p-2.5 font-medium
        hover:bg-gray-900 dark:hover:bg-indigo-700 transition
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
      >
        {isSubmitting && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {isSubmitting ? t('auth.login.signingIn') : t('auth.login.continue')}
      </button>

      {/* REGISTER */}
      <p className="text-center text-xs text-gray-500 mt-6">
        {t('auth.login.noAccount')}{" "}
        <Link
          to="/register"
          className="text-black dark:text-indigo-400 font-medium hover:underline"
        >
          {t('auth.login.signUp')}
        </Link>
      </p>
    </form>
  );
}
