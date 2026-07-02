import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookMarked } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "club", label: "Club / Department" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    department: "",
    course: "",
    year_of_study: "",
    student_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
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
            <input
              required
              type="password"
              minLength={8}
              className="input"
              value={form.password}
              onChange={update("password")}
            />
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

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-forest-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
