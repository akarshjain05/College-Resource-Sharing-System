import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ShieldAlert,
  User,
  Package,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  MessageSquare,
  Sparkles,
  Award
} from "lucide-react";
import api from "../../api/client";

import ResolutionCard from "../../components/ResolutionCard";

const adminComplaintApi = {
  list: () => api.get("/complaints"),
  update: (id, payload) => api.put(`/complaints/${id}`, payload),
};

const STATUS_OPTIONS = ["open", "assigned", "in_progress", "resolved", "closed"];

const STATUS_BADGE = {
  open: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  assigned: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const PRESET_RESPONSES = [
  { label: "Full Refund (₹200)", action: "refund_issued", amount: 200, response: "Refund issued for rental fee & deposit.", penalty: 0 },
  { label: "Item Replacement", action: "replacement_provided", amount: 0, response: "Replacement item provided to borrower.", penalty: 0 },
  { label: "Official Warning (-5)", action: "warning_issued", amount: 0, response: "Official warning issued for policy violation.", penalty: 5 },
  { label: "Dismissed Complaint", action: "dismissed", amount: 0, response: "Complaint dismissed following investigation.", penalty: 0 },
];

function ComplaintRow({ complaint, onUpdate }) {
  const [status, setStatus] = useState(complaint.status);
  const [response, setResponse] = useState(complaint.admin_response || "");
  const [resolutionAction, setResolutionAction] = useState("");
  const [resolutionAmount, setResolutionAmount] = useState("");
  const [penalty, setPenalty] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(complaint.status);
    setResponse(complaint.admin_response || "");
    setPenalty("");
    if (complaint.resolution_data) {
      try {
        const parsed = JSON.parse(complaint.resolution_data);
        setResolutionAction(parsed.action_taken || "");
        setResolutionAmount(parsed.amount ? parsed.amount.toString() : "");
      } catch (e) {}
    } else {
      setResolutionAction("");
      setResolutionAmount("");
    }
  }, [complaint]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(complaint.id, { 
        status, 
        admin_response: response,
        resolution_action: resolutionAction || null,
        resolution_amount: resolutionAmount ? parseFloat(resolutionAmount) : null,
        resolution_notes: response,
        trust_score_penalty: penalty ? parseInt(penalty, 10) : null 
      });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    setResolutionAction(preset.action);
    setResolutionAmount(preset.amount ? preset.amount.toString() : "");
    setResponse(preset.response);
    if (preset.penalty > 0) {
      setPenalty(preset.penalty.toString());
    }
    setStatus("resolved");
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {complaint.category || "General"}
            </span>
            {complaint.severity && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                {complaint.severity}
              </span>
            )}
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {complaint.subject}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Filed by <strong className="text-slate-800 dark:text-slate-200">{complaint.filed_by?.full_name}</strong></span>
            <span>•</span>
            <span>{new Date(complaint.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${STATUS_BADGE[status] || "bg-slate-100"}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target User & Linked Resource Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        {complaint.against_user && (
          <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-2.5">
            <User className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Reported User</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{complaint.against_user.full_name}</span>
            </div>
          </div>
        )}

        {complaint.resource && (
          <div className="p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-center gap-2.5">
            <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Linked Resource</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{complaint.resource.title}</span>
            </div>
          </div>
        )}

        {complaint.borrow_request && (
          <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2.5 sm:col-span-2 md:col-span-1">
            <Calendar className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Borrow Request</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">#{complaint.borrow_request.id.slice(0, 8)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Body */}
      <div className="space-y-1.5 text-xs">
        <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">User Complaint Statement</label>
        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
          {complaint.description}
        </p>
      </div>

      {/* Structured Resolution Action Selector */}
      <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Structured Resolution Template Generator
          </span>
          <div className="flex gap-2">
            {PRESET_RESPONSES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-primary-500/10 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Resolution Action Type</label>
            <select
              value={resolutionAction}
              onChange={(e) => setResolutionAction(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 font-bold outline-none text-xs"
            >
              <option value="">-- Manual Text Only --</option>
              <option value="refund_issued">Refund Issued (Emerald Card)</option>
              <option value="replacement_provided">Replacement Provided (Indigo Card)</option>
              <option value="warning_issued">Warning Issued (Amber Card)</option>
              <option value="dismissed">Dismissed (Slate Card)</option>
            </select>
          </div>

          {resolutionAction === "refund_issued" && (
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Refund Amount (₹)</label>
              <input
                type="number"
                value={resolutionAmount}
                onChange={(e) => setResolutionAmount(e.target.value)}
                placeholder="200"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 font-bold outline-none text-xs"
              />
            </div>
          )}
        </div>

        {/* Live Preview of Resolution Card */}
        {resolutionAction && (
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Live Template Card Preview:</span>
            <ResolutionCard
              resolutionData={{
                action_taken: resolutionAction,
                amount: parseFloat(resolutionAmount || 0),
                notes: response || "Official resolution notes",
                resolved_at: new Date().toISOString()
              }}
            />
          </div>
        )}
      </div>

      {/* Admin Official Response & Trust Score Penalty Form */}
      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            Admin Official Response (Visible to user and synced to Chat)
          </label>
          <textarea
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500 min-h-[70px]"
            rows={2}
            placeholder="Write official resolution details or action taken..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {complaint.against_user_id ? (
            <div className="flex items-center gap-2 text-xs">
              <Award className="h-4 w-4 text-amber-500" />
              <label className="font-bold text-slate-700 dark:text-slate-300">Trust Score Penalty:</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                value={penalty}
                onChange={(e) => setPenalty(e.target.value)}
              />
              <span className="text-[10px] text-slate-400">Deducts points from {complaint.against_user?.full_name}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">No specific target user for penalty</span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {saving ? "Saving Resolution..." : "Save Resolution & Sync Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const load = () => {
    setLoading(true);
    adminComplaintApi
      .list()
      .then(({ data }) => setComplaints(data || []))
      .catch(() => toast.error("Could not fetch complaints"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpdate = async (id, payload) => {
    try {
      await adminComplaintApi.update(id, payload);
      toast.success("Complaint resolution saved successfully");
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || "Could not update complaint.");
      toast.error(typeof msg === 'string' ? msg : "An unexpected error occurred");
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch =
      !q ||
      (c.subject || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.filed_by && (c.filed_by.full_name || "").toLowerCase().includes(q)) ||
      (c.against_user && (c.against_user.full_name || "").toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const openCount = complaints.filter((c) => c.status === "open").length;
  const inProgressCount = complaints.filter((c) => c.status === "in_progress").length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved" || c.status === "closed").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
              Admin Complaints & Disputes Portal
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Review user reports, issue official responses, apply trust score penalties, and manage dispute resolution.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 shadow-xs">
            <span className="block text-[10px] text-amber-500 font-bold uppercase">Open</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">{openCount}</span>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 shadow-xs">
            <span className="block text-[10px] text-blue-500 font-bold uppercase">In Progress</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">{inProgressCount}</span>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 shadow-xs">
            <span className="block text-[10px] text-emerald-500 font-bold uppercase">Resolved</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by subject or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs font-bold">
          {["all", "open", "in_progress", "resolved", "closed"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filterStatus === st
                  ? "bg-primary-600 text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {st === "all" ? "All" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      ) : filteredComplaints.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-xs text-slate-400 space-y-2">
          <AlertTriangle className="mx-auto h-6 w-6 text-slate-300" />
          <p className="font-bold">No complaints found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((c) => (
            <ComplaintRow key={c.id} complaint={c} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
