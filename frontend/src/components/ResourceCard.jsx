import { Link } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { getImageUrl } from "../api/endpoints";

const CONDITION_LABEL = {
  new: "New",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

const STATUS_STYLE = {
  available: "bg-forest-50 text-forest-700",
  borrowed: "bg-brass-50 text-brass-700",
  unavailable: "bg-ink-100 text-ink-500",
  pending_approval: "bg-brass-50 text-brass-700",
};

export default function ResourceCard({ resource }) {
  const primaryImage = resource.images?.find((img) => img.is_primary) || resource.images?.[0];

  return (
    <Link to={`/resources/${resource.id}`} className="index-card block pl-4 transition-shadow hover:shadow-lg">
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="rounded bg-ink-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {resource.category?.name}
          </span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[resource.status]}`}>
            {resource.status?.replace("_", " ")}
          </span>
        </div>

        {primaryImage ? (
          <img
            src={getImageUrl(primaryImage.image_url)}
            alt={resource.title}
            className="mb-3 h-36 w-full rounded-md object-cover"
          />
        ) : (
          <div className="mb-3 flex h-36 w-full items-center justify-center rounded-md bg-ink-50 font-display text-2xl text-ink-300">
            {resource.title.charAt(0)}
          </div>
        )}

        <h3 className="font-display text-base font-semibold text-ink-900 line-clamp-1">{resource.title}</h3>
        <p className="mt-1 text-sm text-ink-500 line-clamp-2">{resource.description}</p>

        <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-brass-500 text-brass-500" />
            {Number(resource.average_rating).toFixed(1)} · {resource.total_borrows} borrows
          </span>
          <span className="rounded bg-ink-50 px-2 py-0.5 font-medium">{CONDITION_LABEL[resource.condition]}</span>
        </div>

        {resource.pickup_location && (
          <div className="mt-2 flex items-center gap-1 text-xs text-ink-500">
            <MapPin className="h-3.5 w-3.5" />
            {resource.pickup_location}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-ink-50 pt-3 text-xs">
          <span className="text-ink-500 font-medium">Security Deposit:</span>
          <span className={`font-semibold ${resource.deposit_amount > 0 ? "text-forest-700" : "text-ink-600"}`}>
            {resource.deposit_amount > 0 ? `₹${resource.deposit_amount}` : "No deposit required"}
          </span>
        </div>
      </div>
    </Link>
  );
}
