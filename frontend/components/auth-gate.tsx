"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBootstrapAuth } from "@/features/auth/use-bootstrap-auth";
import type { ReactNode } from "react";

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { ready, hasToken } = useBootstrapAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !hasToken) {
      router.replace("/login");
    }
  }, [ready, hasToken, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang tải...</p>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang chuyển hướng...</p>
      </div>
    );
  }

  return <>{children}</>;
};
