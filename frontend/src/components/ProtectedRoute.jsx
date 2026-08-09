import { Navigate, useLocation, Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock } from "lucide-react";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Lock className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">Account Required</h2>
        <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
          Please sign in or create an account to access this page and unlock all features of the platform.
        </p>
        <div className="flex gap-4">
          <Link to="/login" state={{ from: location }} className="btn-primary px-8 py-3">
            Sign In
          </Link>
          <Link to="/register" state={{ from: location }} className="btn-secondary px-8 py-3">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  if (requireAdmin && user.role !== "admin") return <Navigate to="/403" replace />;

  return children || <Outlet />;
}
