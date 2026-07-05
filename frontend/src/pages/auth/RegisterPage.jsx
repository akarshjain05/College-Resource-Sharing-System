import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookMarked } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/PasswordInput";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import CompleteGoogleProfileForm from "../../components/CompleteGoogleProfileForm";

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

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      await register(payload);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Please try again.");
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
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Google sign-up failed. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest-700">
            <BookMarked className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Join your campus network</h1>
          <p className="mt-1 text-sm text-ink-500">Lend what you're not using. Borrow what you need.</p>
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
              <div>
                <div className="relative">
                  <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
                  {googleSubmitting && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-ink-400">
                  We'll ask for a couple of campus details next — no password needed.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-ink-100" />
                <span className="text-xs font-medium uppercase tracking-wide text-ink-300">or continue with campus email</span>
                <div className="h-px flex-1 bg-ink-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Full name</label>
                  <input required className="input" value={form.full_name} onChange={update("full_name")} />
                </div>
                <div>
                  <label className="label">Campus email</label>
                  <input required type="email" className="input" value={form.email} onChange={update("email")} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={form.password}
                    onChange={update("password")}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={form.confirm_password}
                    onChange={update("confirm_password")}
                    autoComplete="new-password"
                  />
                  {form.confirm_password.length > 0 && form.confirm_password !== form.password && (
                    <p className="mt-1 text-xs text-red-600">Passwords don't match.</p>
                  )}
                </div>
                <div>
                  <label className="label">I am a</label>
                  <select className="input" value={form.role} onChange={update("role")}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Department</label>
                    <input className="input" value={form.department} onChange={update("department")} />
                  </div>
                  <div>
                    <label className="label">Course</label>
                    <input className="input" value={form.course} onChange={update("course")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Year of study</label>
                    <input type="number" min={1} max={6} className="input" value={form.year_of_study} onChange={update("year_of_study")} />
                  </div>
                  <div>
                    <label className="label">Student ID</label>
                    <input className="input" value={form.student_id} onChange={update("student_id")} />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? "Creating account..." : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>

        {!googleSignup && (
          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-forest-700 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}