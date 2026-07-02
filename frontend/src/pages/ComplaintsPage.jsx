import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import api from "../api/client";

const complaintApi = {
  create: (payload) => api.post("/complaints", payload),
  myComplaints: () => api.get("/complaints/my-complaints"),
};

const STATUS_STYLE = {
  open: "bg-brass-50 text-brass-700",
  in_progress: "bg-forest-50 text-forest-700",
  resolved: "bg-ink-100 text-ink-700",
  closed: "bg-ink-100 text-ink-500",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    complaintApi.myComplaints().then(({ data }) => setComplaints(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await complaintApi.create(form);
      toast.success("Complaint filed. An admin will review it shortly.");
      setForm({ subject: "", description: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not file complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Complaints & support</h1>
        <p className="mt-1 text-sm text-ink-500">
          Something go wrong with a borrow? Let campus admins know.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Subject</label>
          <input required className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            required
            minLength={10}
            rows={4}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Submitting..." : "File complaint"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Your complaints</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-ink-100" />
        ) : complaints.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-500">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-ink-300" />
            You haven't filed any complaints.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-900">{c.subject}</p>
                  <span className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-600">{c.description}</p>
                {c.admin_response && (
                  <p className="mt-2 rounded bg-forest-50 p-2 text-sm text-forest-900">
                    <strong>Admin response:</strong> {c.admin_response}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
