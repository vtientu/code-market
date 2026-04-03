let accessToken: string | null = null;

export const tokenService = {
  getAccessToken: () => accessToken,

  setAccessToken: (token: string) => {
    accessToken = token;
  },

  clear: () => (accessToken = null),

  // Chỉ riêng api gọi tới refresh token thì BE sẽ đọc từ headers của request
  refresh: async (): Promise<boolean> => {
    try {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) return false;

      const data = await response.json();
      tokenService.setAccessToken(data?.accessToken);

      return true;
    } catch {
      return false;
    }
  },
};
