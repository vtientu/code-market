import { Navigate } from "react-router-dom";
import { tokenService } from "@/lib/tokenService";
import { LoginForm } from "@/features/auth/components/login-form";
import { useBootstrapAuth } from "@/features/auth/hooks/use-bootstrap-auth";

const Login = () => {
  const { ready } = useBootstrapAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (tokenService.getAccessToken()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground">
            Nhập thông tin đăng nhập của bạn
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
