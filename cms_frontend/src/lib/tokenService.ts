let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error("VITE_API_URL is not defined");

export const tokenService = {
  getAccessToken: () => accessToken,

  setAccessToken: (token: string) => {
    accessToken = token;
  },

  clear: () => {
    accessToken = null;
  },

  refresh: (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        if (!response.ok) return false;

        const body = (await response.json()) as { data?: { accessToken?: string } };
        const token = body?.data?.accessToken;
        if (token) tokenService.setAccessToken(token);
        return !!token;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },
};
