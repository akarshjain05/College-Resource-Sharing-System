import { Link } from "react-router-dom";
import { Info } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, accent = "forest", to, infoTooltip }) {
  const accentClasses = {
    forest: "bg-forest-50 text-forest-700",
    brass: "bg-brass-50 text-brass-700",
    ink: "bg-ink-100 text-ink-700",
  };

  const Content = (
    <div className={`card flex items-center gap-4 p-5 ${to ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold text-ink-900">{value}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500 truncate">{label}</p>
          {infoTooltip && (
            <div className="group relative inline-flex" title={infoTooltip}>
              <Info className="h-3.5 w-3.5 text-ink-300 hover:text-ink-500 cursor-help" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{Content}</Link> : Content;
}
