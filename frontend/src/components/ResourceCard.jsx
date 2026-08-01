import { Link } from "react-router-dom";
import { useState } from "react";
import { Star, MapPin, Heart } from "lucide-react";
import { getImageUrl, wishlistApi, resourceApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const CONDITION_LABEL = {
  new: "New",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

export default function ResourceCard({ resource, onWishlistUpdate }) {
  const { user } = useAuth();
  const primaryImage = resource.images?.find((img) => img.is_primary) || resource.images?.[0];
  const [isWishlisted, setIsWishlisted] = useState(resource.is_wishlisted || false);
  const [status, setStatus] = useState(resource.status || "available");

  const isOwner = Boolean(user?.id && (resource.owner?.id === user.id || resource.owner_id === user.id));
  const isAvailable = status === "available";

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to wishlist items");
      return;
    }

    try {
      if (isWishlisted) {
        await wishlistApi.remove(resource.id);
        setIsWishlisted(false);
        if (onWishlistUpdate) onWishlistUpdate(resource.id, false);
      } else {
        await wishlistApi.add(resource.id);
        setIsWishlisted(true);
        if (onWishlistUpdate) onWishlistUpdate(resource.id, true);
        toast.success("Added to wishlist");
      }
    } catch (err) {
      toast.error("Failed to update wishlist");
    }
  };

  const handleStatusToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newStatus = isAvailable ? "unavailable" : "available";
    setStatus(newStatus); // Optimistic UI update

    try {
      await resourceApi.update(resource.id, { status: newStatus });
      toast.success(newStatus === "available" ? "Item published to campus!" : "Item unpublished!");
    } catch (err) {
      setStatus(status); // Rollback
      toast.error(err.response?.data?.detail || "Failed to update publish status");
    }
  };

  return (
    <Link
      to={`/resources/${resource.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
    >
      {/* Image Container */}
      <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center">
        {primaryImage &&
        (primaryImage.image_url.startsWith("/") ||
          primaryImage.image_url.startsWith("http") ||
          primaryImage.image_url.startsWith("data:")) ? (
          <img
            src={getImageUrl(primaryImage.image_url)}
            alt={resource.title}
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md font-display text-5xl select-none text-slate-400">
            {primaryImage ? primaryImage.image_url : resource.title.charAt(0)}
          </div>
        )}

        {/* Category Pill */}
        <span className="absolute left-3 top-3 rounded-lg bg-slate-900/70 text-white backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
          {resource.category?.name || "Resource"}
        </span>

        {/* Owner Publish Toggle Switch OR Wishlist Button */}
        {isOwner ? (
          <div
            className={`absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 px-2 py-1 shadow-sm backdrop-blur-sm border border-slate-200/60 dark:border-slate-800 cursor-pointer select-none transition-all ${
              status === "borrowed" ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
            }`}
            onClick={handleStatusToggle}
            onMouseDown={(e) => e.stopPropagation()}
            title={isAvailable ? "Item is Published (Visible to others)" : "Item is Unpublished (Draft)"}
          >
            <button
              type="button"
              disabled={status === "borrowed"}
              tabIndex={-1}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAvailable ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-[9px] font-extrabold uppercase tracking-wider ${isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
              {isAvailable ? "Published" : "Draft"}
            </span>
          </div>
        ) : (
          <button
            onClick={handleWishlistToggle}
            className={`absolute right-3 top-3 p-2 rounded-full backdrop-blur-sm transition-all ${
              isWishlisted
                ? "bg-red-50 dark:bg-red-950/60 text-red-500 shadow-sm"
                : "bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-red-500 hover:shadow-sm"
            }`}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      {/* Details Section */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-2">
        <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {resource.title}
        </h3>

        {resource.owner && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            by{" "}
            <Link
              to={`/users/${resource.owner.id}`}
              className="font-bold text-slate-800 dark:text-slate-200 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {resource.owner.full_name}
            </Link>
          </p>
        )}

        {/* Rating badge & Borrows */}
        <div className="flex items-center gap-2 pt-1">
          <span className="flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
            {Number(resource.average_rating || 5).toFixed(1)}
            <Star className="h-3 w-3 fill-white text-white" />
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{resource.total_borrows || 0} borrows</span>
          <span className="ml-auto rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 capitalize">
            {CONDITION_LABEL[resource.condition] || resource.condition}
          </span>
        </div>

        {resource.pickup_location && (
          <div className="flex items-center gap-1 text-xs text-slate-400 pt-0.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
            <span className="line-clamp-1">{resource.pickup_location}</span>
          </div>
        )}

        {/* Price / Deposit Footer */}
        <div className="flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2 text-xs">
          {resource.deposit_amount > 0 ? (
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">₹{resource.deposit_amount}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">deposit</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">No deposit required</span>
          )}
        </div>
      </div>
    </Link>
  );
}
