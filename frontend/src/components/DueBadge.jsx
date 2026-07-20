import { differenceInCalendarDays } from "date-fns";

export default function DueBadge({ endDate, status, className = "" }) {
  if (!["approved", "active"].includes(status)) return null;

  const days = differenceInCalendarDays(new Date(endDate), new Date());
  
  let toneClass = "bg-forest-50 text-forest-700 border-forest-200";
  let text = `${days}d left`;

  if (days < 0) {
    toneClass = "bg-red-50 text-red-600 border-red-200";
    text = `Overdue by ${Math.abs(days)}d`;
  } else if (days === 0) {
    toneClass = "bg-red-50 text-red-600 border-red-200";
    text = "Due today";
  } else if (days <= 3) {
    toneClass = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClass} ${className}`}>
      {text}
    </span>
  );
}
