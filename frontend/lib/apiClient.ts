import { env } from "@/env";
import axios, { AxiosError } from "axios";

const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;

interface QueueItem {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

let failedQueue: QueueItem[] = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(null);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và không phải là request gọi api refresh chính nó
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh, đẩy request này vào hàng chờ
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi API Refresh. Lưu ý: Endpoint này ở Backend sẽ đọc Refresh Token
        // từ HttpOnly Cookie và Set-Cookie mới vào Header trả về.
        await apiClient.post("/auth/refresh-token");

        isRefreshing = false;
        processQueue(null);

        // Thực hiện lại request ban đầu với Cookie mới đã được trình duyệt cập nhật
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError as AxiosError);

        // Nếu refresh thất bại (thẻ hết hạn thực sự), điều hướng về login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
