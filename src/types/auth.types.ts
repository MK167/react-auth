export type UserType = {
  _id: string;
  email: string;
  username: string;
  role: string;
  /**
   * Fine-grained permission strings returned by the backend (optional).
   * Example: ['products:write', 'orders:read']
   * Falls back to role-based checks when absent.
   */
  permissions?: string[];
};

export type AuthResponse = {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: UserType;
  };
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  data: {
    user: UserType;
  };
}; 

export type ButtonLoadingState = "idle" | "register" | "login";