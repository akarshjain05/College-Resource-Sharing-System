import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { userApi, authApi } from "../../api/endpoints";
import PasswordInput from "../../components/PasswordInput";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    department: user?.department || "",
    course: user?.course || "",
    year_of_study: user?.year_of_study || "",
    bio: user?.bio || "",
    skills: user?.skills || "",
    phone_number: user?.phone_number || "",
  });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_new_password: "" });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const isGoogleAccount = user?.auth_provider === "google";

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const updatePw = (field) => (e) => setPasswords((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.updateMyProfile(form);
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwords.new_password !== passwords.confirm_new_password) {
      toast.error("New passwords don't match.");
      return;
    }

    setChangingPw(true);
    try {
      await authApi.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success("Password changed");
      setPasswords({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not change password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">My profile</h1>

      <form onSubmit={handleSave} className="card space-y-4 p-6">
        <h2 className="font-display text-base font-semibold text-ink-900">Basic information</h2>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={update("full_name")} />
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
            <label className="label">Phone number</label>
            <input className="input" value={form.phone_number} onChange={update("phone_number")} />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea rows={3} className="input" value={form.bio} onChange={update("bio")} />
        </div>
        <div>
          <label className="label">Skills (comma-separated)</label>
          <input className="input" value={form.skills} onChange={update("skills")} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {isGoogleAccount ? (
        <div className="card p-6">
          <h2 className="font-display text-base font-semibold text-ink-900">Sign-in method</h2>
          <p className="mt-2 text-sm text-ink-500">
            This account signs in with Google — there's no separate CRSS password to manage. Manage your
            Google account's security directly through Google.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePasswordChange} className="card space-y-4 p-6">
          <h2 className="font-display text-base font-semibold text-ink-900">Change password</h2>
          <div>
            <label className="label">Current password</label>
            <PasswordInput
              required
              value={passwords.current_password}
              onChange={updatePw("current_password")}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <PasswordInput
              required
              minLength={8}
              value={passwords.new_password}
              onChange={updatePw("new_password")}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <PasswordInput
              required
              minLength={8}
              value={passwords.confirm_new_password}
              onChange={updatePw("confirm_new_password")}
              autoComplete="new-password"
            />
            {passwords.confirm_new_password.length > 0 && passwords.confirm_new_password !== passwords.new_password && (
              <p className="mt-1 text-xs text-red-600">Passwords don't match.</p>
            )}
          </div>
          <button type="submit" disabled={changingPw} className="btn-secondary w-full">
            {changingPw ? "Updating..." : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
