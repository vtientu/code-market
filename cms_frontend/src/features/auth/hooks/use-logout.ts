import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth/api/auth-api";
import { tokenService } from "@/lib/tokenService";

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const clearSession = () => {
    tokenService.clear();
    queryClient.clear();
    navigate("/login");
  };

  return useMutation({
    mutationFn: authApi.logout,
    // Always clear local session, even if BE logout fails (network error, etc.)
    onSuccess: clearSession,
    onError: clearSession,
  });
};
