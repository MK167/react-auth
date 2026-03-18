import { z } from "zod";

// password pattern to require at least one uppercase letter, one lowercase letter, one number, and one special character and be at least 6 characters long
// regx  = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .lowercase("Username must be in lowercase")
    .nonempty("Username is required"),
  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .nonempty("Password is required")
    .regex(
      passwordPattern,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
  gender: z.string().nonempty("Gender is required"),
  country: z.string().nonempty("Country is required"),
  bio: z.string().optional(),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
