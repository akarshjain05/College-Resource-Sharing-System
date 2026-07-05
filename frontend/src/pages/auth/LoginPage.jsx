import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookMarked } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import CompleteGoogleProfileForm from "../../components/CompleteGoogleProfileForm";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleSignup, setGoogleSignup] = useState(null); // { registrationToken, fullName, email }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const errorCode = err.response?.data?.error_code;
      if (errorCode === "GOOGLE_ACCOUNT_NO_PASSWORD") {
        toast.error("This account uses Google Sign-In. Use the button below instead.");
      } else {
        toast.error(err.response?.data?.detail || "Could not sign in. Check your credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setGoogleSubmitting(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.status === "needs_profile") {
        // First time this Google account has been seen -- no CRSS account exists
        // yet, so collect the last few campus details before creating one.
        setGoogleSignup({
          registrationToken: result.registration_token,
          fullName: result.full_name,
          email: result.email,
        });
      } else {
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest-700">
            <BookMarked className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Campus Resource Sharing</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in with your campus email to continue.</p>
        </div>

        <div className="card space-y-5 p-6">
          {googleSignup ? (
            <CompleteGoogleProfileForm
              registrationToken={googleSignup.registrationToken}
              fullName={googleSignup.fullName}
              email={googleSignup.email}
              onDone={() => navigate("/dashboard")}
              onCancel={() => setGoogleSignup(null)}
            />
          ) : (
            <>
              <div className="relative">
                <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
                {googleSubmitting && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-ink-100" />
                <span className="text-xs font-medium uppercase tracking-wide text-ink-300">or</span>
                <div className="h-px flex-1 bg-ink-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="email">Campus email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="input"
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <PasswordInput
                    id="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <Link to="/forgot-password" className="mt-1 inline-block text-xs text-forest-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </>
          )}
        </div>

        {!googleSignup && (
          <p className="mt-6 text-center text-sm text-ink-500">
            New to campus sharing?{" "}
            <Link to="/register" className="font-semibold text-forest-700 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}