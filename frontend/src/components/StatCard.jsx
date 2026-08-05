import { Link } from "react-router-dom";
import { Info } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, accent = "primary", to, infoTooltip }) {
  const accentClasses = {
    primary: "bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-900/50",
    forest: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    brass: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    indigo: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50",
    ink: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  const selectedAccent = accentClasses[accent] || accentClasses.primary;

  const Content = (
    <div className={`flex items-center gap-4 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all ${to ? "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer" : ""}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${selectedAccent}`}>
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2.5xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</p>
          {infoTooltip && (
            <div className="group relative inline-flex">
              <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help" />
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 z-[100]">
                <div className="rounded-xl bg-slate-900 dark:bg-white px-3 py-2 text-[10px] font-medium text-white dark:text-slate-900 shadow-xl text-center leading-relaxed whitespace-normal break-words">
                  {infoTooltip}
                </div>
                <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900 dark:bg-white"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{Content}</Link> : Content;
}
