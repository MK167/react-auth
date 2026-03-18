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
          className="w-full border border-gray-300 p-2.5 rounded-lg hover:bg-red-50 hover:border-red-400 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "google" ? <Spinner /> : <GoogleIcon />}
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("microsoft")}
          disabled={loading !== null}
          className="w-full border border-gray-300 p-2.5 rounded-lg hover:bg-green-50 hover:border-green-500 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "microsoft" ? <Spinner /> : <MicrosoftIcon />}
          Continue with Microsoft
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("facebook")}
          disabled={loading !== null}
          className="w-full border border-gray-300 p-2.5 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "facebook" ? <Spinner /> : <FacebookIcon />}
          Continue with Facebook
        </button>
      </div>
    </>
  );
};

export default SocialLogin;
