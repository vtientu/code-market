import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth-gate";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
