import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { BookMarked, Share2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import CompleteGoogleProfileForm from "../../components/CompleteGoogleProfileForm";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/resources";
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
      navigate(from, { replace: true });
    } catch (err) {
      const errorCode = err.response?.data?.error_code;
      if (errorCode === "GOOGLE_ACCOUNT_NO_PASSWORD") {
        toast.error("This account uses Google Sign-In. Use the button below instead.");
      } else if (err.response?.status === 429) {
        toast.error("Too many attempts. Please try again later.");
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
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Split screen layout */}
      <div className="grid w-full grid-cols-1 lg:grid-cols-2">
        
        {/* Left Column: Visual branding and features (hidden on mobile) */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-forest-900 via-forest-800 to-primary-900 p-12 text-white lg:flex">
          {/* Animated Glowing Orbs */}
          <div className="absolute top-1/4 left-1/4 h-72 w-72 animate-pulse rounded-full bg-primary-500/10 blur-3xl duration-[6000ms]"></div>
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-forest-400/10 blur-3xl duration-[8000ms] delay-1000"></div>
          
          {/* Top Logo and Title */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md">
              <BookMarked className="h-5 w-5 text-brass-300" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Campus Resource Sharing
            </span>
          </div>

          {/* Middle Pitch / Feature List */}
          <div className="relative z-10 my-auto max-w-lg space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-brass-300 uppercase backdrop-blur-md border border-white/15">
                <Sparkles className="h-3.5 w-3.5" /> SVNIT Exclusive Hub
              </span>
              <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
                Share Resources.<br />
                <span className="bg-gradient-to-r from-brass-300 to-emerald-300 bg-clip-text text-transparent">Save Costs.</span><br />
                Build Community.
              </h2>
              <p className="text-base text-slate-300">
                A secure collaborative space where SVNIT students, faculty, and clubs share assets, books, and equipment seamlessly.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">Borrow & Lend Items</h4>
                  <p className="mt-1 text-sm text-slate-300">Share textbooks, lab coats, calculators, or sports items with ease.</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300 border border-primary-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">Verified Network</h4>
                  <p className="mt-1 text-sm text-slate-300">Login is restricted to verified campus emails and secure credentials.</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass-500/20 text-brass-300 border border-brass-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">Campus Needs & Wanted Requests</h4>
                  <p className="mt-1 text-sm text-slate-300">Ask for items you need, or see what others are actively looking for.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats / branding */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
            <span>© 2026 SVNIT Campus Sharing</span>
            <span className="flex items-center gap-1.5">
              Made with <span className="text-red-500">♥</span> for SVNITians
            </span>
          </div>
        </div>

        {/* Right Column: Authentication form */}
        <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-12 xl:px-16 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-md space-y-8">
            
            {/* Header for Mobile/Tablet */}
            <div className="flex flex-col items-center text-center lg:hidden">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700 shadow-md">
                <BookMarked className="h-6 w-6 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Campus Resource Sharing</h1>
              <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">Sign in with your campus email to continue.</p>
            </div>

            {/* Title for Desktop */}
            <div className="hidden lg:block space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 dark:text-white">Welcome Back!</h1>
              <p className="text-sm text-ink-500 dark:text-slate-400">Please sign in to your SVNIT account.</p>
            </div>

            {/* Form Card Container */}
            <div className="card overflow-hidden border border-slate-200/60 dark:border-slate-800/80 p-6 sm:p-8 shadow-premium bg-white dark:bg-slate-900 transition-all duration-300 hover:shadow-2xl">
              {googleSignup ? (
                <CompleteGoogleProfileForm
                  registrationToken={googleSignup.registrationToken}
                  fullName={googleSignup.fullName}
                  email={googleSignup.email}
                  onDone={() => navigate(from, { replace: true })}
                  onCancel={() => setGoogleSignup(null)}
                />
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
                    {googleSubmitting && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70 dark:bg-slate-900/70">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">or continue with email</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="label text-slate-700 dark:text-slate-300" htmlFor="email">Campus email</label>
                      <input
                        id="email"
                        type="email"
                        required
                        className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="you@svnit.ac.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="label mb-0 text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
                        <Link to="/forgot-password" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <PasswordInput
                        id="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-sm font-semibold rounded-xl tracking-wide shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50">
                      {submitting ? "Signing in..." : "Sign in to account"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {!googleSignup && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                New to campus sharing?{" "}
                <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                  Create an account
                </Link>
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}