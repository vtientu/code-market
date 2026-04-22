export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "BUYER" | "SELLER" | "ADMIN";
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
