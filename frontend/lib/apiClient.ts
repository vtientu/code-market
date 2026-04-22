import { env } from "@/env";
import axios, { AxiosError } from "axios";
import { tokenStore } from "@/lib/token-store";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

interface BackendEnvelope<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
}

const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Auth endpoints should not trigger the refresh-retry flow on 401.
const AUTH_ENDPOINT_PATTERN = /\/auth\/(login|refresh|register|logout)(\b|\/|$)/;
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINT_PATTERN.test(url);

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

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap BE envelope: { success, statusCode, message, data } -> data
// Only unwrap when the shape matches to avoid corrupting non-enveloped payloads.
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as BackendEnvelope | undefined;
    if (
      body &&
      typeof body === "object" &&
      typeof body.success === "boolean" &&
      typeof body.statusCode === "number" &&
      "data" in body
    ) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post<{ accessToken: string }>("/auth/refresh");
        tokenStore.set(response.data.accessToken);

        isRefreshing = false;
        processQueue(null);

        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError as AxiosError);

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
