import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div data-testid="auth-loading" className="animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
