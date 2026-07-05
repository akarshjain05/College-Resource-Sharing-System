import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "faculty", label: "Faculty" },
  { value: "club", label: "Club / Department" },
];

/**
 * Shown right after a brand-new Google sign-in returns status="needs_profile".
 * Google has already verified the person's identity (name/email/picture) --
 * this form only collects the campus-specific fields the app still needs, then
 * calls /auth/google/complete-profile to actually create the account.
 */
export default function CompleteGoogleProfileForm({ registrationToken, fullName, email, onDone, onCancel }) {
  const { completeGoogleProfile } = useAuth();
  const [form, setForm] = useState({
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
      await completeGoogleProfile({
        registration_token: registrationToken,
        role: form.role,
        department: form.department || undefined,
        course: form.course || undefined,
        year_of_study: form.year_of_study ? Number(form.year_of_study) : undefined,
        student_id: form.student_id || undefined,
      });
      toast.success("Account created with Google — you're in!");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not finish setting up your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-forest-50 p-3 text-sm text-forest-900">
        Signing up as <strong>{fullName}</strong> ({email}) via Google. Just a few campus details left:
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
          <input
            type="number"
            min={1}
            max={6}
            className="input"
            value={form.year_of_study}
            onChange={update("year_of_study")}
          />
        </div>
        <div>
          <label className="label">Student ID</label>
          <input className="input" value={form.student_id} onChange={update("student_id")} />
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Finishing setup..." : "Finish creating account"}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary w-full">
        Cancel
      </button>
    </form>
  );
}