import { fetchClient } from "@/lib/fetchClient";
import type { LoginRequest, LoginResponse } from "@/features/auth/types/auth.types";

export const authApi = {
  login: (body: LoginRequest) =>
    fetchClient.post<LoginResponse>("/auth/login", body),

  logout: () => fetchClient.post<null>("/auth/logout", {}),
};
