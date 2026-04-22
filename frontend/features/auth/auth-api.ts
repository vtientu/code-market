import apiClient from "@/lib/apiClient";
import type { LoginInput, LoginResponse } from "@/features/auth/auth-types";

export const authApi = {
  login: (input: LoginInput) =>
    apiClient.post<LoginResponse>("/auth/login", input).then((r) => r.data),

  logout: () => apiClient.post<null>("/auth/logout").then((r) => r.data),
};
