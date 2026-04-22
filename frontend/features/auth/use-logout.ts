"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/auth-api";
import { tokenStore } from "@/lib/token-store";

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Always clear local session, even if BE logout fails (network/refresh-cookie expired).
  const clearSession = () => {
    tokenStore.clear();
    queryClient.clear();
    router.push("/login");
  };

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: clearSession,
    onError: clearSession,
  });
};
