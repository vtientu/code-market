import { isHttpError } from "@/lib/httpError";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const onGlobalError = (error: unknown) => {
  if (isHttpError(error)) {
    if (error.status === 401) return;
    toast.error(error.message);
  }

  if (error instanceof Error) {
    toast.error(error.message);
    return;
  }

  toast.error("Đã có lỗi xảy ra");
};

const retryFn = (failureCount: number, error: unknown): boolean => {
  if (isHttpError(error) && error.status < 500) return false;
  return failureCount < 2;
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onGlobalError,
  }),
  mutationCache: new MutationCache({ onError: onGlobalError }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 phút – tránh refetch quá nhiều
      gcTime: 1000 * 60 * 10, // 10 phút – giữ cache sau khi unmount
      retry: retryFn,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
