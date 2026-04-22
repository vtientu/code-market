"use client";

import { useEffect, useRef, useState } from "react";
import { tokenStore } from "@/lib/token-store";
import apiClient from "@/lib/apiClient";

// Bootstraps auth on mount: if no in-memory token, try the refresh cookie once.
// Returns { ready, hasToken } so consumers can react to the final auth state.
export const useBootstrapAuth = () => {
  const bootstrapped = useRef(false);
  const initialToken = typeof window !== "undefined" && !!tokenStore.get();
  const [ready, setReady] = useState(initialToken);
  const [hasToken, setHasToken] = useState(initialToken);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (tokenStore.get()) {
      setHasToken(true);
      setReady(true);
      return;
    }

    apiClient
      .post<{ accessToken: string }>("/auth/refresh")
      .then((res) => {
        tokenStore.set(res.data.accessToken);
        setHasToken(true);
      })
      .catch(() => {
        setHasToken(false);
      })
      .finally(() => setReady(true));
  }, []);

  return { ready, hasToken };
};
