import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  User,
  Package,
  FileText,
  HelpCircle,
  Search,
  Sparkles,
  Filter,
  ExternalLink,
  ShieldCheck,
  Calendar,
  MessageSquare
} from "lucide-react";
import api from "../api/client";
import { userApi, resourceApi, borrowApi } from "../api/endpoints";

import ResolutionCard from "../components/ResolutionCard";

const complaintApi = {
  create: (payload) => api.post("/complaints", payload),
  myComplaints: () => api.get("/complaints/my-complaints"),
};

const CATEGORIES = [
  { id: "dispute", label: "Borrowing / Item Dispute", icon: Package, description: "Late return, damaged item, or deposit issue with a transaction" },
  { id: "user_behavior", label: "Report User Behavior", icon: User, description: "Unresponsive, inappropriate conduct, or harassment" },
  { id: "resource_report", label: "Report Listing / Resource", icon: FileText, description: "Misleading details, fake item, or unsafe resource" },
  { id: "admin_support", label: "Platform Support / Admin Inquiry", icon: HelpCircle, description: "Technical issue, account help, or trust score appeal" },
  { id: "other", label: "Other Complaint", icon: AlertTriangle, description: "General concerns or unlisted issues" },
];

const STATUS_STYLE = {
  open: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  assigned: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const SEVERITY_STYLE = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse",
};

function ComplaintDetailsModal({ complaint, onClose }) {
  if (!complaint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 pr-8">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 font-extrabold flex-shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                {complaint.category || "General"}
              </span>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[complaint.severity] || SEVERITY_STYLE.medium}`}>
                Severity: {complaint.severity || "medium"}
              </span>
            </div>
            <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {complaint.subject}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[complaint.status] || "bg-slate-100 text-slate-600"}`}>
                <Clock className="h-3 w-3" />
                {complaint.status?.replace("_", " ")}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Filed on {new Date(complaint.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Context metadata (Against User, Resource, Borrow Request, Assigned Handler) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {complaint.against_user && (
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-3">
              <User className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Filed Against User</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{complaint.against_user.full_name}</span>
              </div>
            </div>
          )}

          {complaint.assigned_to && (
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Handler / Triage</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{complaint.assigned_to.full_name}</span>
              </div>
            </div>
          )}

          {complaint.resource && (
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-3">
              <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Linked Item / Resource</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{complaint.resource.title}</span>
              </div>
            </div>
          )}

          {complaint.borrow_request && (
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 sm:col-span-2">
              <Calendar className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Linked Borrow Request</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Status: {complaint.borrow_request.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Complaint Description & Evidence */}
        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1">Complaint Statement</h4>
            <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {complaint.evidence_url && (
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] mb-1">Evidence / Attachment URL</h4>
              <a 
                href={complaint.evidence_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:underline bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 px-3 py-1.5 rounded-xl font-semibold text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Evidence Attachment
              </a>
            </div>
          )}
        </div>

        {/* Structured Resolution Card */}
        {complaint.resolution_data ? (
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <ShieldCheck className="h-4 w-4" /> Structured Resolution Template
            </h4>
            <ResolutionCard resolutionData={complaint.resolution_data} />
          </div>
        ) : complaint.admin_response ? (
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <CheckCircle className="h-4 w-4" /> Official Response
            </h4>
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
              {complaint.admin_response}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-3">
            <Clock className="h-5 w-5 flex-shrink-0 text-amber-500 animate-pulse" />
            <div>
              <p className="font-bold">Under Investigation & Triage</p>
              <p className="text-[11px] opacity-80">Our platform resolution team is triaging your report. Updates will be posted here and automatically synced with your chat thread.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
          <button onClick={onClose} className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintsPage() {
  const [searchParams] = useSearchParams();
  const initialBorrowRequestId = searchParams.get("borrow_request_id") || "";
  const initialAgainstUserId = searchParams.get("against_user_id") || "";
  const initialResourceId = searchParams.get("resource_id") || "";
  const initialCategory = searchParams.get("category") || "dispute";
  const initialSubject = searchParams.get("subject") || "";

  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [userBorrows, setUserBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(initialCategory);
  const [form, setForm] = useState({
    subject: initialSubject,
    description: "",
    severity: "medium",
    evidence_url: "",
    borrow_request_id: initialBorrowRequestId,
    against_user_id: initialAgainstUserId,
    resource_id: initialResourceId,
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedComplaintForModal, setSelectedComplaintForModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = () => {
    setLoading(true);
    Promise.all([
      complaintApi.myComplaints(),
      userApi.listPublicDirectory(),
      resourceApi.list({ limit: 1000 }),
      borrowApi.myRequests(),
      borrowApi.incoming()
    ])
      .then(([compRes, userRes, resRes, myReqRes, incReqRes]) => {
        setComplaints(compRes.data || []);
        setUsers(userRes.data || []);
        setResources(resRes.data?.items || resRes.data || []);
        
        // Combine outgoing & incoming borrow requests
        const myReqs = myReqRes.data || [];
        const incReqs = incReqRes.data || [];
        const combined = [...myReqs, ...incReqs];
        setUserBorrows(combined);

        // If borrow_request_id passed, auto populate related resource & against user if available
        if (initialBorrowRequestId && combined.length > 0) {
          const match = combined.find(b => b.id === initialBorrowRequestId);
          if (match) {
            setForm(prev => ({
              ...prev,
              resource_id: match.resource_id || prev.resource_id,
              against_user_id: match.lender_id || match.borrower_id || prev.against_user_id
            }));
          }
        }
      })
      .catch((err) => {
        toast.error("Failed to load complaints & support data.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  // Handle borrow request selection change
  const handleBorrowRequestChange = (borrowId) => {
    const selectedBorrow = userBorrows.find(b => b.id === borrowId);
    if (selectedBorrow) {
      setForm(prev => ({
        ...prev,
        borrow_request_id: borrowId,
        resource_id: selectedBorrow.resource_id || prev.resource_id,
        against_user_id: selectedBorrow.lender_id || selectedBorrow.borrower_id || prev.against_user_id,
        subject: prev.subject || `Dispute for Borrow Request: ${selectedBorrow.resource?.title || "Item"}`
      }));
    } else {
      setForm(prev => ({ ...prev, borrow_request_id: borrowId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        category,
        severity: form.severity || "medium",
        subject: form.subject,
        description: form.description,
      };
      if (form.evidence_url) payload.evidence_url = form.evidence_url;
      if (form.borrow_request_id) payload.borrow_request_id = form.borrow_request_id;
      if (form.against_user_id) payload.against_user_id = form.against_user_id;
      if (form.resource_id) payload.resource_id = form.resource_id;

      await complaintApi.create(payload);
      toast.success("Complaint filed successfully. Our resolution team will triage it.");
      setForm({
        subject: "",
        description: "",
        severity: "medium",
        evidence_url: "",
        borrow_request_id: "",
        against_user_id: "",
        resource_id: "",
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not file complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      c.subject.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.against_user && c.against_user.full_name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const openCount = complaints.filter(c => c.status === "open" || c.status === "in_progress").length;
  const resolvedCount = complaints.filter(c => c.status === "resolved" || c.status === "closed").length;

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Complaints & Platform Support
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            File a dispute against a user/transaction or submit support tickets directly to administrators
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-xs flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Active</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{openCount}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Resolved</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{resolvedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Context pre-fill Banner if initialized via search params */}
      {(initialBorrowRequestId || initialAgainstUserId || initialResourceId) && (
        <div className="rounded-3xl border border-primary-500/20 bg-primary-500/10 p-4 text-xs text-primary-900 dark:text-primary-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Context Pre-filled: </span>
              {initialBorrowRequestId && <span>Linked to Borrow Request #{initialBorrowRequestId.slice(0, 8)}. </span>}
              {initialAgainstUserId && <span>Target user pre-selected. </span>}
              {initialResourceId && <span>Item listing pre-selected. </span>}
            </div>
          </div>
          <Link to="/complaints" className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline">
            Reset Form
          </Link>
        </div>
      )}

      {/* Filing Form Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-600" /> File a New Complaint / Report
          </h2>
          <p className="text-xs text-slate-400 mt-1">Select the category that best describes your inquiry</p>
        </div>

        {/* Category Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "border-primary-500 bg-primary-500/10 text-primary-900 dark:text-primary-100 shadow-xs ring-2 ring-primary-500/20"
                    : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isSelected ? "text-primary-600 dark:text-primary-400" : "text-slate-400"}`} />
                  <span className="font-bold text-xs">{cat.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 leading-snug">{cat.description}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Borrow Request Dropdown */}
          {userBorrows.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Link Active / Past Borrow Request (Optional)
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
                value={form.borrow_request_id}
                onChange={(e) => handleBorrowRequestChange(e.target.value)}
              >
                <option value="">-- None / General Complaint --</option>
                {userBorrows.map((b) => (
                  <option key={b.id} value={b.id}>
                    Request #{b.id.slice(0, 8)} - {b.resource?.title || "Item"} ({b.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User & Resource Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Filed Against User {category === "admin_support" && "(Optional)"}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
                value={form.against_user_id}
                onChange={(e) => setForm({ ...form, against_user_id: e.target.value })}
              >
                <option value="">-- None / Platform Issue --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Related Resource / Listing (Optional)
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
              >
                <option value="">-- None --</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Subject Header
            </label>
            <input
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={
                category === "dispute" ? "e.g. Item returned with damage / Unreturned item past due date" :
                category === "user_behavior" ? "e.g. Abusive behavior during pickup" :
                category === "resource_report" ? "e.g. Misleading description / Broken condition" :
                "e.g. Unable to verify phone number / System error"
              }
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          {/* Severity and Evidence Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Severity Level
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                <option value="low">Low (Minor inconvenience / Inquiry)</option>
                <option value="medium">Medium (Standard dispute / Delay)</option>
                <option value="high">High (Damaged item / Policy violation)</option>
                <option value="critical">Critical (Scam / Unreturned high-value item)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Evidence / Image Attachment URL (Optional)
              </label>
              <input
                type="url"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com/photo-proof.jpg"
                value={form.evidence_url}
                onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
              />
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Detailed Description
            </label>
            <textarea
              required
              minLength={10}
              rows={4}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
              placeholder="Provide exact details of what occurred, timeline, or error messages..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-3 text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? "Submitting Complaint..." : "File Complaint & Submit to Admin"}
          </button>
        </form>
      </div>

      {/* Complaints History Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
            Your Filed Complaints & Support Tickets
          </h2>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-[11px] font-bold">
              {["all", "open", "in_progress", "resolved", "closed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-lg px-2.5 py-1 transition-colors ${
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
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
        ) : filteredComplaints.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-xs text-slate-400 space-y-2">
            <AlertTriangle className="mx-auto h-6 w-6 text-slate-300" />
            <p className="font-bold">No complaints match your criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaintForModal(c)}
                className="group cursor-pointer rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3 transition-all hover:border-primary-400 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {c.category || "General"}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {c.subject}
                      </h3>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLE[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {c.against_user && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 font-bold">
                      <User className="h-3 w-3" /> Against: {c.against_user.full_name}
                    </span>
                  )}
                  {c.resource && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 font-bold">
                      <Package className="h-3 w-3" /> Item: {c.resource.title}
                    </span>
                  )}
                  {c.admin_response && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-bold">
                      <CheckCircle className="h-3 w-3" /> Admin Answered
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <span>Filed {new Date(c.created_at).toLocaleDateString()}</span>
                  <span className="text-primary-600 dark:text-primary-400 group-hover:underline flex items-center gap-0.5">
                    View Investigation Details <ArrowRight className="h-3 w-3" />
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
