import { HttpError } from "@/lib/httpError";
import { tokenService } from "@/lib/tokenService";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  _retry?: boolean;
}

const BASE_URL = import.meta.env.VITE_API_URL;

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
    credentials: "same-origin",
  });

  if (response.status === 401 && !_retry) {
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

  return response.json() as Promise<T>;
};

export const fetchClient = {
  get: <T>(endpoint: string, options: RequestOptions) =>
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
