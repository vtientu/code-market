import { Navigate, Outlet, useLocation } from "react-router-dom";
import { tokenService } from "@/lib/tokenService";
import { useBootstrapAuth } from "@/features/auth/hooks/use-bootstrap-auth";

export const ProtectedRoute = () => {
  const { ready } = useBootstrapAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!tokenService.getAccessToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
