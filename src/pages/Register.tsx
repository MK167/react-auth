import { loginApi, registerApi } from "@/api/auth.api";
import ErrorNotification from "@/components/auth/common/error-notification/ErrorNotification";
import InputElement from "@/components/form/input/FormInputControl";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/schemas/register.schema";
import { useAuthStore } from "@/store/auth.store";
import type { ButtonLoadingState } from "@/types/auth.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

const initialValue: RegisterFormValues = {
  username: "",
  email: "",
  password: "",
  gender: "",
  country: "",
  bio: "",
};

export default function Register() {
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

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setServerError("");
      // 1️⃣ register
      setAuthStep("register");
      const response = await registerApi(data);

      if (response.statusCode === 200) {
        // 2️⃣ login after register
        setAuthStep("login");
        const loginRes = await loginApi({
          email: data.email,
          password: data.password,
        });
        // 3️⃣ save session
        setAuth(loginRes.data.user, loginRes.data.accessToken);
        // 4️⃣ redirect
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

  const buttonText =
    authStep === "register"
      ? "Creating account..."
      : authStep === "login"
        ? "Signing in..."
        : "Register";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
      >
        {/* SERVER ERROR */}
        <ErrorNotification serverError={serverError} text="Backend Error:" />

        <h1 className="text-xl font-semibold text-center mb-6">
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white rounded-lg p-2.5 font-medium 
          hover:bg-gray-900 transition 
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
        >
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {buttonText}
        </button>

        <p className="text-center text-xs text-gray-500 mt-6">
          Already have an account?
          <span className="text-black ml-1 cursor-pointer hover:underline">
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
