import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { userApi, authApi } from "../../api/endpoints";
import PasswordInput from "../../components/PasswordInput";
import { User, Lock, ArrowLeft, Save, ShieldCheck, Mail } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    department: user?.department || "",
    course: user?.course || "",
    year_of_study: user?.year_of_study || "",
    bio: user?.bio || "",
    skills: Array.isArray(user?.skills) ? user.skills.join(", ") : (user?.skills || ""),
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
      toast.success("Profile updated successfully!");
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
      toast.success("Password updated successfully!");
      setPasswords({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not change password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-300">
      {/* Back Link & Header */}
      <div className="flex items-center justify-between">
        <Link
          to={user?.id ? `/users/${user.id}` : "/resources"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Public Profile
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2.5xl font-black text-slate-900 dark:text-white tracking-tight">
            Account & Profile Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Update your public profile details, campus info, and login security.
          </p>
        </div>
      </div>

      {/* Form Card 1: Basic Information */}
      <form onSubmit={handleSave} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 space-y-5 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">Basic Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              value={form.full_name}
              onChange={update("full_name")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input
                type="email"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-semibold cursor-not-allowed outline-none"
                value={user?.email || ""}
                disabled
                readOnly
                title="Email address cannot be modified"
              />
              <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Department</label>
            <input
              type="text"
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              value={form.department}
              onChange={update("department")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Course / Degree</label>
            <input
              type="text"
              placeholder="e.g. B.Tech / M.Tech"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              value={form.course}
              onChange={update("course")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Year of Study</label>
            <input
              type="number"
              min={1}
              max={6}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              value={form.year_of_study}
              onChange={update("year_of_study")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Phone Number</label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              value={form.phone_number}
              onChange={update("phone_number")}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Bio / Introduction</label>
          <textarea
            rows={3}
            placeholder="Tell neighbors what resources you often lend or borrow..."
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
            value={form.bio}
            onChange={update("bio")}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Skills & Interests (comma-separated)</label>
          <input
            type="text"
            placeholder="e.g. Photography, Robotics, Gaming, Coding"
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            value={form.skills}
            onChange={update("skills")}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Saving Changes..." : "Save Profile Changes"}</span>
        </button>
      </form>

      {/* Form Card 2: Security & Password */}
      {isGoogleAccount ? (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">Sign-in Security</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            This account signs in securely using Google OAuth — there is no separate password stored in our system. Manage your security directly from your Google Account settings.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePasswordChange} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">Update Password</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Current Password</label>
            <PasswordInput
              required
              value={passwords.current_password}
              onChange={updatePw("current_password")}
              autoComplete="current-password"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">New Password</label>
              <PasswordInput
                required
                minLength={8}
                value={passwords.new_password}
                onChange={updatePw("new_password")}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <PasswordInput
                required
                minLength={8}
                value={passwords.confirm_new_password}
                onChange={updatePw("confirm_new_password")}
                autoComplete="new-password"
              />
              {passwords.confirm_new_password.length > 0 && passwords.confirm_new_password !== passwords.new_password && (
                <p className="mt-1.5 text-xs text-rose-500 font-bold">Passwords do not match.</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPw}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2"
          >
            <Lock className="h-4 w-4" />
            <span>{changingPw ? "Updating Password..." : "Update Password"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
