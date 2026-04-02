import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const onGlobalError = (error: unknown) => {
  const status = (error as any)?.response?.status;
  if (status === 401) return; // Axios interceptor xử lý
  const message = (error as Error)?.message ?? "Đã có lỗi xảy ra";
  toast.error(message);
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onGlobalError,
  }),
  mutationCache: new MutationCache({ onError: onGlobalError }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 phút – tránh refetch quá nhiều
      gcTime: 1000 * 60 * 10, // 10 phút – giữ cache sau khi unmount
      retry: (failureCount, error: any) => {
        if (error?.response?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
