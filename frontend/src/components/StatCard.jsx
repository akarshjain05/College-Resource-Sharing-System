export default function StatCard({ label, value, icon: Icon, accent = "forest" }) {
  const accentClasses = {
    forest: "bg-forest-50 text-forest-700",
    brass: "bg-brass-50 text-brass-700",
    ink: "bg-ink-100 text-ink-700",
  };

  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-ink-900">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      </div>
    </div>
  );
}
