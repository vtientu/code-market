"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/auth-api";
import { authKeys } from "@/features/auth/auth-keys";
import { tokenStore } from "@/lib/token-store";

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      queryClient.setQueryData(authKeys.me(), data.user);
      router.push("/");
    },
  });
};
