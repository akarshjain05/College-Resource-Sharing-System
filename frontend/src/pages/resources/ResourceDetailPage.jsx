import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Star,
  MapPin,
  Shield,
  Trash2,
  Edit3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Wallet,
  CreditCard,
  Heart,
  Clock
} from "lucide-react";
import { resourceApi, borrowApi, reviewApi, categoryApi, wishlistApi, getImageUrl } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import AvailabilityCalendar from "../../components/AvailabilityCalendar";
import NotFoundPage from "../errors/NotFoundPage";



export default function ResourceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Dates state
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null, error: null });
  const [bookings, setBookings] = useState([]);
  const [submittingBorrow, setSubmittingBorrow] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);


  const load = () => {
    setLoading(true);

    // Actual database resource load
    Promise.all([resourceApi.get(id), reviewApi.listForResource(id), resourceApi.getAvailability(id)])
      .then(([resResp, revResp, availResp]) => {
        setResource(resResp.data);
        setReviews(revResp.data);
        setBookings(availResp.data);
      })
      .catch((err) => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
        if (resource) setIsWishlisted(resource.is_wishlisted);
      });
  };

  useEffect(() => {
    if (resource) setIsWishlisted(resource.is_wishlisted);
  }, [resource]);

  useEffect(() => {
    load();
  }, [id]);

  if (notFound) {
    return <NotFoundPage message="This item doesn't exist or has been removed." />;
  }

  if (loading || !resource) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-3xl" />
          <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  const sDate = selectedDateRange.start;
  const eDate = selectedDateRange.end || selectedDateRange.start;

  const daysCount = sDate && eDate
    ? Math.max(1, Math.ceil((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1)
    : 0;

  // Simple pricing model based on daily_price with fallback to deposit
  const dailyPrice = resource.daily_price || 0;
  const rentAmount = daysCount * dailyPrice;
  const securityDeposit = resource.deposit_amount;
  const totalAmount = rentAmount + securityDeposit;

  const handleBorrowRequest = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to request items");
      navigate("/login", { state: { from: { pathname: `/resources/${id}` } } });
      return;
    }

    const startDate = selectedDateRange.start;
    const endDate = selectedDateRange.end || selectedDateRange.start;

    if (!startDate) {
      toast.error("Please select a date range");
      return;
    }

    if (selectedDateRange.error) {
      toast.error(selectedDateRange.error);
      return;
    }

    setSubmittingBorrow(true);

    // Format dates for backend in local timezone (YYYY-MM-DD)
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formattedStart = formatLocalDate(startDate);
    const formattedEnd = formatLocalDate(endDate);

    try {
      await borrowApi.create({
        resource_id: resource.id,
        requested_start_date: formattedStart,
        requested_end_date: formattedEnd,
        purpose: "I need this item for a few days."
      });
      toast.success("Borrow request sent to owner!");
      navigate("/my-bookings");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmittingBorrow(false);
    }
  };

  const isOwner = resource.owner?.id === user?.id;

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error("Please login to wishlist items");
      navigate("/login", { state: { from: { pathname: `/resources/${id}` } } });
      return;
    }
    try {
      if (isWishlisted) {
        await wishlistApi.remove(resource.id);
        setIsWishlisted(false);
      } else {
        await wishlistApi.add(resource.id);
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch (err) {
      toast.error("Failed to update wishlist");
    }
  };

  const formatAvgResponseTime = (seconds) => {
    if (seconds == null) return "No response data";
    if (seconds < 3600) return "Usually responds within an hour";
    if (seconds < 86400) return `Usually responds within ${Math.round(seconds / 3600)} hours`;
    return `Usually responds in ${Math.round(seconds / 86400)} days`;
  };

  // Dynamic Rating calculations from real reviews
  const totalReviewsCount = reviews.length > 0 ? reviews.length : (resource.reviews_count || 0);
  const calculatedAvgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : (resource.average_rating || "0.0");

  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, percentage: `${percentage}%` };
  });

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Back to explore */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Explore
      </button>

      {/* Main split details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Media Gallery, Desc, Reviews (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Gallery showcase */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-6 shadow-sm">
            <div className="relative aspect-video w-full rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800">
              {resource.images?.[0]?.image_url && (
                resource.images[0].image_url.startsWith("/") ||
                resource.images[0].image_url.startsWith("http") ||
                resource.images[0].image_url.startsWith("data:")
              ) ? (
                <img
                  src={getImageUrl(resource.images[0].image_url)}
                  alt={resource.title}
                  className="h-full w-full object-contain rounded-2xl"
                />
              ) : (
                <span className="text-8xl select-none">{resource.images?.[0]?.image_url || "🛠️"}</span>
              )}

              {/* Floating rating overlay */}
              <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-xl border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-1.5 shadow-sm flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{calculatedAvgRating}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">({totalReviewsCount} reviews)</span>
              </div>

              <button
                onClick={handleWishlistToggle}
                className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm transition-all ${isWishlisted
                  ? "bg-red-50 dark:bg-red-950/20 text-red-500 shadow-sm border border-red-100 dark:border-red-900/50"
                  : "bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-500 hover:shadow-sm border border-slate-200 dark:border-slate-800"
                  }`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Title & Stats */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-primary-50 dark:bg-primary-950/20 px-2.5 py-1 text-xs font-bold text-primary-600 dark:text-primary-400 uppercase">
                  {resource.category?.name || "Tools"}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {resource.total_borrows || 0} bookings completed
                </span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {resource.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>{resource.pickup_location || "Campus Location"}</span>
              </div>
            </div>
          </div>

          {/* Owner details card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-base shadow-sm">
                {(resource.owner?.full_name?.charAt(0) || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-none">Listed by Owner</p>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1">{resource.owner?.full_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{resource.pickup_location?.split("away")[0]} away</p>
                  {resource.owner?.avg_response_seconds != null && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatAvgResponseTime(resource.owner?.avg_response_seconds)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/users/${resource.owner?.roll_no || resource.owner?.id}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm active:scale-95"
              >
                View Profile
              </Link>
              <Link
                to={`/complaints?resource_id=${resource.id}&against_user_id=${resource.owner?.id}&category=resource_report&subject=${encodeURIComponent(`Report Listing: ${resource.title}`)}`}
                className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 transition-all shadow-xs active:scale-95 flex items-center gap-1"
                title="Report this listing to platform admin"
              >
                <Shield className="h-3.5 w-3.5" /> Report
              </Link>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Description</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {resource.description}
            </p>
          </div>

          {/* Reviews & Rating breakdown card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Reviews & Ratings</h3>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {totalReviewsCount} {totalReviewsCount === 1 ? "review" : "reviews"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-4 md:pb-0 md:pr-4">
                <span className="font-display text-5xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {calculatedAvgRating}
                </span>
                <div className="flex justify-center gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4.5 w-4.5 ${i < Math.round(Number(calculatedAvgRating)) ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-800"}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-2.5">
                  Overall Rating <br />({totalReviewsCount} {totalReviewsCount === 1 ? "review" : "reviews"})
                </p>
              </div>

              <div className="md:col-span-8 space-y-2">
                {ratingCounts.map((row) => (
                  <div key={row.stars} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <span className="w-3 text-right">{row.stars}★</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: row.percentage }} />
                    </div>
                    <span className="w-6 text-slate-400 dark:text-slate-500 text-right">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List of comments */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {reviews.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No reviews yet for this item. Borrow it to leave the first review!
                </div>
              ) : (
                <>
                  {displayedReviews.map((rev) => (
                    <div key={rev.id} className="space-y-2 border-b border-slate-50 dark:border-slate-850 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {(rev.reviewer?.full_name?.charAt(0) || "U").toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{rev.reviewer?.full_name || "Neighbor User"}</h4>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-800"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-650 dark:text-slate-350 pl-10 leading-relaxed">
                        {rev.comment || "Great item and smooth transaction!"}
                      </p>
                    </div>
                  ))}

                  {reviews.length > 3 && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => setShowAllReviews(!showAllReviews)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-xs font-bold text-primary-600 dark:text-primary-400 transition-all shadow-xs active:scale-95"
                      >
                        {showAllReviews ? "Show Less" : `Show All Reviews (${reviews.length})`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Request/Booking Widget & Sidebar Controls */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          {/* Regular Borrow Form (using your friend's wrapper styling, but main's logic) */}
          {!isOwner && resource.status !== "unavailable" && (
            <form onSubmit={handleBorrowRequest} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg space-y-5">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Request to Borrow</h3>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Deposit-backed transaction</p>
              </div>

              {/* Date selections */}
              <div className="space-y-2.5">
                <label className="label">Select Dates</label>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                  <AvailabilityCalendar
                    bookings={bookings}
                    selectedRange={selectedDateRange}
                    onSelectRange={setSelectedDateRange}
                    maxDays={resource.max_borrow_days}
                    availableFrom={resource.available_from}
                    availableTo={resource.available_to}
                    quantity={resource.quantity}
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span>Total Days</span>
                  <span className="text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-lg text-[11px]">{daysCount} days</span>
                </div>
              </div>

              {/* Price Details breakdown */}
              <div className="space-y-2.5 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Price Details</h3>

                <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>₹{dailyPrice} x {daysCount} days</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹{rentAmount}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="inline-flex items-center gap-1">
                      Security Deposit <span className="text-[9px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1 py-0.5 rounded">Refundable</span>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹{securityDeposit}</span>
                  </div>

                  <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-2" />

                  <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                    <span>Total Amount</span>
                    <span className="text-primary-600 dark:text-primary-400">₹{totalAmount}</span>
                  </div>
                </div>
              </div>



              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submittingBorrow}
                className="w-full btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3.5 text-xs font-bold shadow-md shadow-primary-600/10 transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-98 disabled:opacity-50"
              >
                {submittingBorrow ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Safety instructions */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/30 p-4.5 flex gap-2.5 text-slate-500 dark:text-slate-400">
            <Shield className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-300">Safety Guarantee:</span> Deposit is held securely in escrow. It will be returned in full once the owner confirms the item is returned in working condition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}