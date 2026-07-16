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
  available: "bg-primary-50 text-primary-700",
  borrowed: "bg-brass-50 text-brass-700",
  unavailable: "bg-ink-100 text-ink-500",
  pending_approval: "bg-brass-50 text-brass-700",
};

export default function ResourceCard({ resource }) {
  const primaryImage = resource.images?.find((img) => img.is_primary) || resource.images?.[0];

  return (
    // <Link to={`/resources/${resource.id}`} className="index-card block pl-4 transition-shadow hover:shadow-lg">
    //   <div className="p-4">
    //     <div className="mb-3 flex items-start justify-between gap-2">
    //       <span className="rounded bg-ink-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
    //         {resource.category?.name}
    //       </span>
    //       <span className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[resource.status]}`}>
    //         {resource.status?.replace("_", " ")}
    //       </span>
    //     </div>

    //     {primaryImage ? (
    //       <img
    //         src={getImageUrl(primaryImage.image_url)}
    //         alt={resource.title}
    //         className="mb-3 h-36 w-full rounded-md object-cover"
    //       />
    //     ) : (
    //       <div className="mb-3 flex h-36 w-full items-center justify-center rounded-md bg-ink-50 font-display text-2xl text-ink-300">
    //         {resource.title.charAt(0)}
    //       </div>
    //     )}

    //     <h3 className="font-display text-base font-semibold text-ink-900 line-clamp-1">{resource.title}</h3>
    //     {resource.owner && (
    //       <p className="mt-0.5 text-xs text-ink-500">
    //         by <Link to={`/users/${resource.owner.id}`} className="font-medium hover:underline text-ink-900" onClick={(e) => e.stopPropagation()}>{resource.owner.full_name}</Link>
    //       </p>
    //     )}
        

    //     <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
    //       <span className="flex items-center gap-1">
    //         <Star className="h-3.5 w-3.5 fill-brass-500 text-brass-500" />
    //         {Number(resource.average_rating).toFixed(1)} · {resource.total_borrows} borrows
    //       </span>
    //       <span className="rounded bg-ink-50 px-2 py-0.5 font-medium">{CONDITION_LABEL[resource.condition]}</span>
    //     </div>

    //     {resource.pickup_location && (
    //       <div className="mt-2 flex items-center gap-1 text-xs text-ink-500">
    //         <MapPin className="h-3.5 w-3.5" />
    //         {resource.pickup_location}
    //       </div>
    //     )}

    //     <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
    //       <span className="text-slate-500 font-medium">Security Deposit:</span>
    //       <span className={`font-semibold ${resource.deposit_amount > 0 ? "text-primary-600" : "text-slate-600"}`}>
    //         {resource.deposit_amount > 0 ? `₹${resource.deposit_amount}` : "No deposit required"}
    //       </span>
    //     </div>
    //   </div>
    // </Link>
    <Link
  to={`/resources/${resource.id}`}
  className="group block overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md"
>
  {/* Image */}
  <div className="relative aspect-square w-full bg-white p-4">
    {primaryImage ? (
      <img
        src={getImageUrl(primaryImage.image_url)}
        alt={resource.title}
        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-ink-50 font-display text-3xl text-ink-300">
        {resource.title.charAt(0)}
      </div>
    )}

    <span className="absolute left-2 top-2 rounded bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
      {resource.category?.name}
    </span>

    <span
      className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[resource.status]}`}
    >
      {resource.status?.replace("_", " ")}
    </span>
  </div>

  {/* Details */}
  <div className="border-t border-slate-100 p-3">
    <h3 className="font-display text-sm font-medium text-ink-900 line-clamp-2 leading-snug">
      {resource.title}
    </h3>

    {resource.owner && (
      <p className="mt-1 text-xs text-ink-500">
        by{" "}
        <Link
          to={`/users/${resource.owner.id}`}
          className="font-medium text-ink-900 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {resource.owner.full_name}
        </Link>
      </p>
    )}

    {/* Rating badge, Flipkart-style pill */}
    <div className="mt-1.5 flex items-center gap-2">
      <span className="flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {Number(resource.average_rating).toFixed(1)}
        <Star className="h-3 w-3 fill-white text-white" />
      </span>
      <span className="text-xs text-ink-500">{resource.total_borrows} borrows</span>
      <span className="ml-auto rounded bg-ink-50 px-2 py-0.5 text-[10px] font-medium text-ink-500">
        {CONDITION_LABEL[resource.condition]}
      </span>
    </div>

    {resource.pickup_location && (
      <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-500">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-1">{resource.pickup_location}</span>
      </div>
    )}

    {/* Price row, Amazon/Flipkart price-emphasis style */}
    <div className="mt-2 flex items-baseline gap-1.5 border-t border-slate-100 pt-2">
      {resource.deposit_amount > 0 ? (
        <>
          <span className="text-base font-bold text-ink-900">₹{resource.deposit_amount}</span>
          <span className="text-[11px] text-ink-500">deposit</span>
        </>
      ) : (
        <span className="text-sm font-semibold text-green-600">No deposit required</span>
      )}
    </div>
  </div>
</Link>
  );
}
