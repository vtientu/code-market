import { HttpError } from "@/lib/httpError";
import { tokenService } from "@/lib/tokenService";

interface RequestOptions extends RequestInit {
  // Accept any plain object — runtime guard (`isValidParam`) filters out null/undefined/NaN.
  // Typed query interfaces shouldn't need an index signature to satisfy this.
  params?: Record<string, unknown>;
  _retry?: boolean;
}

const BASE_URL = import.meta.env.VITE_API_URL;
if (!BASE_URL) throw new Error("VITE_API_URL is not defined");

// Auth endpoints should not trigger the refresh-retry flow on 401.
const AUTH_ENDPOINT_PATTERN = /^\/auth\/(login|refresh|register|logout)(\b|\/|$)/;
const isAuthEndpoint = (endpoint: string) => AUTH_ENDPOINT_PATTERN.test(endpoint);

// Fn dựng URL với params
export const buildUrl = (
  endpoint: string,
  params?: RequestOptions["params"],
) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  const isValidParam = (value: unknown): boolean =>
    value != null &&
    value.toString().trim() !== "" &&
    !(typeof value === "number" && isNaN(value));

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (isValidParam(value)) url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const buildHeaders = (init: RequestInit = {}) => {
  return {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...init.headers,
    ...(tokenService.getAccessToken()
      ? { Authorization: `Bearer ${tokenService.getAccessToken()}` }
      : {}),
  };
};

const request = async <T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { params, _retry = false, ...init } = options;

  const response = await fetch(buildUrl(endpoint, params), {
    ...init,
    headers: buildHeaders(init),
    credentials: "include",
  });

  if (response.status === 401 && !_retry && !isAuthEndpoint(endpoint)) {
    const refreshed = await tokenService.refresh();

    if (refreshed) {
      return request<T>(endpoint, { ...options, _retry: true });
    }

    tokenService.clear();
    window.location.href = "/login";
    throw new HttpError(401, "Phiên đăng nhập hết hạn");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => {})) as {
      message?: string;
    };

    throw new HttpError(response.status, body?.message ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;

  // Backend wraps responses in { success, statusCode, message, data }.
  // Unwrap defensively — fall back to raw body if envelope shape is missing.
  const body = (await response.json()) as
    | { success?: boolean; statusCode?: number; data?: T }
    | T;
  if (
    body &&
    typeof body === "object" &&
    "data" in (body as object) &&
    typeof (body as { success?: unknown }).success === "boolean" &&
    typeof (body as { statusCode?: unknown }).statusCode === "number"
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
};

export const fetchClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "GET",
    }),
  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
