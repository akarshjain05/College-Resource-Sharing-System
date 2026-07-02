import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client";

const adminComplaintApi = {
  list: () => api.get("/complaints"),
  update: (id, payload) => api.put(`/complaints/${id}`, payload),
};

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

function ComplaintRow({ complaint, onUpdate }) {
  const [status, setStatus] = useState(complaint.status);
  const [response, setResponse] = useState(complaint.admin_response || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(complaint.id, { status, admin_response: response });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-900">{complaint.subject}</p>
          <p className="text-xs text-ink-500">Filed by {complaint.filed_by.full_name}</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input !w-40 text-xs">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-ink-600">{complaint.description}</p>
      <textarea
        className="input"
        rows={2}
        placeholder="Admin response (visible to the user who filed this)"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
      />
      <button onClick={handleSave} disabled={saving} className="btn-secondary">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminComplaintApi.list().then(({ data }) => setComplaints(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpdate = async (id, payload) => {
    try {
      await adminComplaintApi.update(id, payload);
      toast.success("Complaint updated");
      load();
    } catch (err) {
      toast.error("Could not update complaint.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Complaints</h1>
      {loading ? (
        <div className="h-32 animate-pulse rounded-lg bg-ink-100" />
      ) : complaints.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">No complaints filed yet.</div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintRow key={c.id} complaint={c} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
