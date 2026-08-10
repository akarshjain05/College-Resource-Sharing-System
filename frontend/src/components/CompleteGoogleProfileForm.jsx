import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";



/**
 * Shown right after a brand-new Google sign-in returns status="needs_profile".
 * Google has already verified the person's identity (name/email/picture) --
 * this form only collects the campus-specific fields the app still needs, then
 * calls /auth/google/complete-profile to actually create the account.
 */
export default function CompleteGoogleProfileForm({ registrationToken, fullName, email, onDone, onCancel }) {
  const { completeGoogleProfile } = useAuth();

  const [submitting, setSubmitting] = useState(false);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await completeGoogleProfile({
        registration_token: registrationToken,
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



      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Finishing setup..." : "Finish creating account"}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary w-full">
        Cancel
      </button>
    </form>
  );
}