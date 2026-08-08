import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookMarked, Share2, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import CompleteGoogleProfileForm from "../../components/CompleteGoogleProfileForm";
import VerificationCodeInput from "../../components/VerificationCodeInput";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "club", label: "Club / Department" },
];

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "student",
    department: "",
    course: "",
    year_of_study: "",
    student_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleSignup, setGoogleSignup] = useState(null); // { registrationToken, fullName, email }
  const [otpSignup, setOtpSignup] = useState(null); // { challengeId, email, expiresIn }

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const campusEmailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?(svnit\.ac\.in)$/i;
    if (!campusEmailRegex.test(form.email.trim())) {
      toast.error("Please use an official campus email address (@svnit.ac.in)");
      return;
    }

    if (form.password !== form.confirm_password) {
      toast.error("Passwords don't match.");
      return;
    }


    setSubmitting(true);
    try {
      const payload = {
        ...form,
        year_of_study: form.year_of_study ? Number(form.year_of_study) : undefined,
      };
      const res = await register(payload);
      if (res && res.challenge_id) {
        toast.success("Verification code sent to your email!");
        setOtpSignup({
          challengeId: res.challenge_id,
          email: form.email,
          expiresIn: res.expires_in || 600,
        });
      } else {
        toast.success("Account created! Please sign in.");
        navigate("/login");
      }
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        let msg = "Registration failed. Please try again.";
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          msg = detail;
        } else if (Array.isArray(detail)) {
          msg = detail.map(d => d.msg).join(", ");
        }
        toast.error(msg);
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
        setGoogleSignup({
          registrationToken: result.registration_token,
          fullName: result.full_name,
          email: result.email,
        });
      } else {
        toast.success("Welcome back!");
        navigate("/resources");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Google sign-up failed. Please try again.");
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
                Lend what you have.<br />
                <span className="bg-gradient-to-r from-brass-300 to-emerald-300 bg-clip-text text-transparent">Borrow what you need.</span><br />
                Join the Network.
              </h2>
              <p className="text-base text-slate-300">
                Help build a sustainable sharing economy within the SVNIT community. Save money, share knowledge, and collaborate.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">Save on Expenses</h4>
                  <p className="mt-1 text-sm text-slate-300">No need to buy resources for one-time lab sessions or semester-only courses.</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300 border border-primary-500/20">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">Promote Sustainability</h4>
                  <p className="mt-1 text-sm text-slate-300">Reduce waste by putting unused tools, books, and sports gear to active campus use.</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass-500/20 text-brass-300 border border-brass-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">Trust & Security</h4>
                  <p className="mt-1 text-sm text-slate-300">Strictly private for SVNIT. Meet, exchange, and return within campus grounds.</p>
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

        {/* Right Column: Registration form */}
        <div className="flex flex-col items-center px-4 py-12 sm:px-6 lg:px-12 xl:px-16 bg-slate-50 dark:bg-slate-950 overflow-y-auto lg:h-screen">
          <div className="w-full max-w-md space-y-6 my-auto">
            
            {/* Header for Mobile/Tablet */}
            <div className="flex flex-col items-center text-center lg:hidden">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700 shadow-md">
                <BookMarked className="h-6 w-6 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Campus Resource Sharing</h1>
              <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">Join your campus network today.</p>
            </div>

            {/* Title for Desktop */}
            <div className="hidden lg:block space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 dark:text-white">Create an Account</h1>
              <p className="text-sm text-ink-500 dark:text-slate-400">Enter your details to register as student, faculty, or club.</p>
            </div>

            {/* Form Card Container */}
            <div className="card overflow-hidden border border-slate-200/60 dark:border-slate-800/80 p-6 sm:p-8 shadow-premium bg-white dark:bg-slate-900 transition-all duration-300 hover:shadow-2xl">
              {otpSignup ? (
                <VerificationCodeInput
                  email={otpSignup.email}
                  initialChallengeId={otpSignup.challengeId}
                  initialExpiresIn={otpSignup.expiresIn}
                  onVerified={() => navigate("/resources")}
                  onCancel={() => setOtpSignup(null)}
                />
              ) : googleSignup ? (
                <CompleteGoogleProfileForm
                  registrationToken={googleSignup.registrationToken}
                  fullName={googleSignup.fullName}
                  email={googleSignup.email}
                  onDone={() => navigate("/resources")}
                  onCancel={() => setGoogleSignup(null)}
                />
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="relative">
                      <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
                      {googleSubmitting && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70 dark:bg-slate-900/70">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-center text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                      We'll ask for campus details next — no password needed.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">or register with campus email</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="label text-slate-700 dark:text-slate-300">Full name</label>
                      <input required className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={form.full_name} onChange={update("full_name")} placeholder="Your Full Name" />
                    </div>
                    <div>
                      <label className="label text-slate-700 dark:text-slate-300">Campus email</label>
                      <input
                        required
                        type="email"
                        className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        value={form.email}
                        onChange={update("email")}
                        placeholder="student@svnit.ac.in"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-slate-700 dark:text-slate-300">Password</label>
                        <PasswordInput
                          required
                          minLength={12}
                          value={form.password}
                          onChange={update("password")}
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="label text-slate-700 dark:text-slate-300">Confirm password</label>
                        <PasswordInput
                          required
                          minLength={12}
                          value={form.confirm_password}
                          onChange={update("confirm_password")}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    {form.confirm_password.length > 0 && form.confirm_password !== form.password && (
                      <p className="text-xs text-red-500">Passwords don't match.</p>
                    )}

                    <div>
                      <label className="label text-slate-700 dark:text-slate-300">I am a</label>
                      <select className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={form.role} onChange={update("role")}>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-slate-700 dark:text-slate-300">Department</label>
                        <input className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={form.department} onChange={update("department")} placeholder="e.g. COED" />
                      </div>
                      <div>
                        <label className="label text-slate-700 dark:text-slate-300">Course</label>
                        <input className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={form.course} onChange={update("course")} placeholder="e.g. B.Tech" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-slate-700 dark:text-slate-300">Year of study</label>
                        <input type="number" min={1} max={6} className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={form.year_of_study} onChange={update("year_of_study")} placeholder="e.g. 3" />
                      </div>
                      <div>
                        <label className="label text-slate-700 dark:text-slate-300">Student ID</label>
                        <input className="input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" value={form.student_id} onChange={update("student_id")} placeholder="e.g. U22CO001" />
                      </div>
                    </div>

                    <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-sm font-semibold rounded-xl tracking-wide shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 mt-2">
                      {submitting ? "Creating account..." : "Create Account"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {!googleSignup && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 pb-4">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}