import { useSocialAuth } from "@/hooks/useSocialAuth";
import { FacebookIcon } from "lucide-react";
import { GoogleIcon } from "../common/icons/GoogleIcon";
import { MicrosoftIcon } from "../common/icons/Microsoft";
import { Spinner } from "../common/spinner/Spinner";
import ErrorNotification from "../common/error-notification/ErrorNotification";

const SocialLogin = () => {
  const { handleSocialLogin, loading, error } = useSocialAuth();

  return (
    <>
      {/* Server Error */}
      <ErrorNotification serverError={error} />
      <div className="space-y-3 mb-5">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          disabled={loading !== null}
          className="w-full border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-400 dark:hover:border-red-500 transition text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700"
        >
          {loading === "google" ? <Spinner /> : <GoogleIcon />}
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("microsoft")}
          disabled={loading !== null}
          className="w-full border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-500 dark:hover:border-green-600 transition text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700"
        >
          {loading === "microsoft" ? <Spinner /> : <MicrosoftIcon />}
          Continue with Microsoft
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("facebook")}
          disabled={loading !== null}
          className="w-full border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-500 dark:hover:border-blue-600 transition text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700"
        >
          {loading === "facebook" ? <Spinner /> : <FacebookIcon />}
          Continue with Facebook
        </button>
      </div>
    </>
  );
};

export default SocialLogin;
