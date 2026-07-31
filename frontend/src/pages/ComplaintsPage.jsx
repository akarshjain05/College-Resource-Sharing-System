import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, X, CheckCircle, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import api from "../api/client";
import { userApi, resourceApi } from "../api/endpoints";

const complaintApi = {
  create: (payload) => api.post("/complaints", payload),
  myComplaints: () => api.get("/complaints/my-complaints"),
};

const STATUS_STYLE = {
  open: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  in_progress: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  resolved: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  closed: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700",
};

function ComplaintDetailsModal({ complaint, onClose }) {
  if (!complaint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 pr-8">
          <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 font-extrabold flex-shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{complaint.subject}</h2>
            <span className={`mt-1 inline-block rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[complaint.status] || "bg-slate-100 text-slate-600"}`}>
              {complaint.status?.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-700 dark:text-slate-300">Complaint Description</h4>
          <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
            {complaint.description}
          </p>
        </div>

        {complaint.admin_response ? (
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Admin Official Response
            </h4>
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 text-emerald-900 dark:text-emerald-200 font-medium">
              {complaint.admin_response}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3.5 text-xs text-slate-400 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Under admin investigation. An update will be posted shortly.</span>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
          <button onClick={onClose} className="btn-secondary !py-2 !px-4 text-xs">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintsPage() {
  const [searchParams] = useSearchParams();
  const borrowRequestId = searchParams.get("borrow_request_id");

  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: "", description: "", borrow_request_id: borrowRequestId || "", against_user_id: "", resource_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [selectedComplaintForModal, setSelectedComplaintForModal] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      complaintApi.myComplaints(),
      userApi.listPublicDirectory(),
      resourceApi.list({ limit: 1000 })
    ]).then(([compRes, userRes, resRes]) => {
      setComplaints(compRes.data || []);
      setUsers(userRes.data || []);
      setResources(resRes.data?.items || resRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.borrow_request_id) delete payload.borrow_request_id;
      if (!payload.against_user_id) delete payload.against_user_id;
      if (!payload.resource_id) delete payload.resource_id;

      await complaintApi.create(payload);
      toast.success("Complaint filed. An admin will review it shortly.");
      setForm({ subject: "", description: "", borrow_request_id: borrowRequestId || "", against_user_id: "", resource_id: "" });
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
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Complaints & Support</h1>
        <p className="mt-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
          File a dispute or check admin responses on past complaints
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
          <input
            required
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
            placeholder="e.g. Unreturned Item / Damaged Equipment"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Against User (Optional)</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
              value={form.against_user_id}
              onChange={(e) => setForm({ ...form, against_user_id: e.target.value })}
            >
              <option value="">-- None --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Resource (Optional)</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
              value={form.resource_id}
              onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
            >
              <option value="">-- None --</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            required
            minLength={10}
            rows={4}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none min-h-[90px]"
            placeholder="Explain what happened in detail..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-xs font-bold shadow-sm">
          {submitting ? "Submitting..." : "File Complaint"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-display text-base font-extrabold text-slate-900 dark:text-white">Your Complaints</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
        ) : complaints.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-slate-300" />
            You haven't filed any complaints.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaintForModal(c)}
                className="group cursor-pointer rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2 transition-all hover:border-primary-400"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{c.subject}</p>
                  <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{c.description}</p>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span>Click card for admin resolution details</span>
                  <span className="text-primary-600 dark:text-primary-400 group-hover:underline flex items-center gap-0.5">
                    View Details <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Complaint Details Modal */}
      {selectedComplaintForModal && (
        <ComplaintDetailsModal
          complaint={selectedComplaintForModal}
          onClose={() => setSelectedComplaintForModal(null)}
        />
      )}
    </div>
  );
}
