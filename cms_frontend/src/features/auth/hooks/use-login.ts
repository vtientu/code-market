import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth/api/auth-api";
import { authKeys } from "@/features/auth/keys/auth-keys";
import { tokenService } from "@/lib/tokenService";

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenService.setAccessToken(data.accessToken);
      queryClient.setQueryData(authKeys.me(), data.user);
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? "/";
      navigate(from, { replace: true });
    },
  });
};
