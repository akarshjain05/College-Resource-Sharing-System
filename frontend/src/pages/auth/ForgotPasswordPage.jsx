import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../../api/endpoints";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink-900">Reset your password</h1>
        <div className="card p-6">
          {sent ? (
            <p className="text-sm text-ink-700">
              If an account exists for <span className="font-semibold">{email}</span>, a reset link has been sent.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Campus email</label>
                <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
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
