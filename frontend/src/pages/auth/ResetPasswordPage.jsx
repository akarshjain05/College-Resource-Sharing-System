import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../../api/endpoints";
import PasswordInput from "../../components/PasswordInput";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
      navigate("/login");
    }
  }, [token, navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, new_password: newPassword });
      toast.success("Password reset successfully. You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not reset password. The link might be expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink-900">Set new password</h1>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <PasswordInput
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Confirm password</label>
              <PasswordInput
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Resetting..." : "Reset password"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">
          <Link to="/login" className="font-semibold text-forest-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
