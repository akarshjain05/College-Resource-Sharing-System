import React from "react";
import { CheckCircle2, DollarSign, RefreshCw, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";

export default function ResolutionCard({ resolutionData, className = "" }) {
  if (!resolutionData) return null;

  let parsed = null;
  if (typeof resolutionData === "string") {
    try {
      parsed = JSON.parse(resolutionData);
    } catch (e) {
      parsed = { action_taken: "resolved", notes: resolutionData };
    }
  } else if (typeof resolutionData === "object") {
    parsed = resolutionData;
  }

  if (!parsed) return null;

  const action = (parsed.action_taken || "resolved").toString().toLowerCase();
  const amount = parsed.amount || 0;
  const notes = parsed.notes || "";
  const dateStr = parsed.resolved_at ? new Date(parsed.resolved_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

  if (action === "refund_issued" || action === "refund") {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 space-y-2 text-slate-800 dark:text-slate-100 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
            <DollarSign className="h-4 w-4 bg-emerald-200 dark:bg-emerald-800 rounded-full p-0.5" />
            <span>Refund Issued</span>
          </div>
          {amount > 0 && (
            <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
              ₹{amount}
            </span>
          )}
        </div>
        {notes && <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">{notes}</p>}
        {dateStr && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold text-right">Resolved: {dateStr}</p>}
      </div>
    );
  }

  if (action === "replacement_provided" || action === "replacement") {
    return (
      <div className={`rounded-2xl border border-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/30 p-4 space-y-2 text-slate-800 dark:text-slate-100 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
            <RefreshCw className="h-4 w-4 bg-indigo-200 dark:bg-indigo-800 rounded-full p-0.5" />
            <span>Replacement Provided</span>
          </div>
        </div>
        {notes && <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">{notes}</p>}
        {dateStr && <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold text-right">Resolved: {dateStr}</p>}
      </div>
    );
  }

  if (action === "warning_issued" || action === "warning") {
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-2 text-slate-800 dark:text-slate-100 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 bg-amber-200 dark:bg-amber-800 rounded-full p-0.5" />
            <span>Policy Warning Issued</span>
          </div>
        </div>
        {notes && <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">{notes}</p>}
        {dateStr && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-right">Resolved: {dateStr}</p>}
      </div>
    );
  }

  if (action === "dismissed") {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-100/90 dark:bg-slate-800/40 p-4 space-y-2 text-slate-700 dark:text-slate-300 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-extrabold text-xs uppercase tracking-wider">
            <XCircle className="h-4 w-4 bg-slate-300 dark:bg-slate-700 rounded-full p-0.5" />
            <span>Complaint Dismissed</span>
          </div>
        </div>
        {notes && <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{notes}</p>}
        {dateStr && <p className="text-[10px] text-slate-400 font-semibold text-right">Resolved: {dateStr}</p>}
      </div>
    );
  }

  // Generic Resolution Card Fallback
  return (
    <div className={`rounded-2xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-2 text-slate-800 dark:text-slate-100 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4 bg-blue-200 dark:bg-blue-800 rounded-full p-0.5" />
          <span>Complaint Resolved ({action.replace("_", " ")})</span>
        </div>
      </div>
      {notes && <p className="text-xs text-blue-900 dark:text-blue-200 font-medium">{notes}</p>}
      {dateStr && <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold text-right">Resolved: {dateStr}</p>}
    </div>
  );
}
