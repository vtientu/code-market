import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type UserRole = "BUYER" | "SELLER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
