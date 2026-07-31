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



export default function ResourceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [resource, setResource] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dates state
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null, error: null });
  const [bookings, setBookings] = useState([]);
  const [submittingBorrow, setSubmittingBorrow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [isWishlisted, setIsWishlisted] = useState(false);
  


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
        toast.error("Could not fetch resource details.");
        navigate("/");
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

  // Simple pricing model based on deposit
  const dailyPrice = Math.floor(resource.deposit_amount * 0.05); // 5% of deposit per day
  const rentAmount = daysCount * dailyPrice;
  const securityDeposit = resource.deposit_amount;
  const totalAmount = rentAmount + securityDeposit;

  const handleBorrowRequest = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to request items");
      navigate("/login");
      return;
    }
    
    if (!selectedDateRange.start || !selectedDateRange.end) {
      toast.error("Please select a complete date range");
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

    const formattedStart = formatLocalDate(selectedDateRange.start);
    const formattedEnd = formatLocalDate(selectedDateRange.end);

    try {
      await borrowApi.create({
        resource_id: resource.id,
        requested_start_date: formattedStart,
        requested_end_date: formattedEnd,
        purpose: "I need this item for a few days."
      });
      toast.success("Borrow request sent to owner!");
      navigate("/borrow-requests");
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



  return (
    <div className="space-y-6">
      {/* Back to explore */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Explore
      </button>

      {/* Main split details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Media Gallery, Desc, Reviews (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Gallery showcase */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden p-6 shadow-sm">
            <div className="relative aspect-video w-full rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
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
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200/80 px-3.5 py-1.5 shadow-sm flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-slate-800">{resource.average_rating}</span>
                <span className="text-[10px] text-slate-400 font-semibold">({resource.reviews_count} reviews)</span>
              </div>
              
              <button 
                onClick={handleWishlistToggle}
                className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm transition-all ${
                  isWishlisted 
                    ? "bg-red-50 text-red-500 shadow-sm border border-red-100" 
                    : "bg-white/80 text-slate-500 hover:bg-white hover:text-red-500 hover:shadow-sm border border-slate-200"
                }`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Title & Stats */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-600 uppercase">
                  {resource.category?.name || "Tools"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {resource.total_borrows || 45} bookings completed
                </span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-slate-900 leading-tight">
                {resource.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{resource.pickup_location || "Koramangala, Bengaluru"}</span>
              </div>
            </div>
          </div>

          {/* Owner details card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-base shadow-sm">
                {resource.owner?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium leading-none">Listed by Owner</p>
                <h3 className="font-bold text-slate-800 text-sm mt-1">{resource.owner?.full_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-slate-400 font-semibold">{resource.pickup_location?.split("away")[0]} away</p>
                  {resource.owner?.avg_response_seconds != null && (
                    <>
                      <span className="text-slate-300">•</span>
                      <p className="text-[10px] text-primary-600 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatAvgResponseTime(resource.owner?.avg_response_seconds)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Link
              to={`/users/${resource.owner?.id}`}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-all shadow-sm active:scale-95"
            >
              View Profile
            </Link>
          </div>

          {/* Description */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {resource.description}
            </p>
          </div>



          {/* Reviews & Overall score card (Screen 6) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reviews & Trust Score</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                <span className="font-display text-5xl font-extrabold text-slate-900 leading-none">
                  {resource.average_rating}
                </span>
                <div className="flex justify-center gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                  Overall Rating <br />({resource.reviews_count} reviews)
                </p>
              </div>
              
              <div className="md:col-span-8 space-y-2">
                {[
                  { stars: 5, count: 11, percentage: "73%" },
                  { stars: 4, count: 3, percentage: "20%" },
                  { stars: 3, count: 1, percentage: "7%" },
                  { stars: 2, count: 0, percentage: "0%" },
                ].map((row) => (
                  <div key={row.stars} className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
                    <span className="w-3 text-right">{row.stars}★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: row.percentage }} />
                    </div>
                    <span className="w-5 text-slate-400 text-right">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List of comments */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {reviews.map((rev) => (
                <div key={rev.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {rev.reviewer?.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{rev.reviewer?.full_name}</h4>
                        <p className="text-[9px] text-slate-400 font-medium">12 Aug 2026</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-600 pl-9 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Request/Booking Widget & Sidebar Controls */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          
          {/* Owner Info Box (from main) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Shared by</p>
            <Link 
              to={`/users/${resource.owner.id}`} 
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-100 font-bold text-forest-700">
                {resource.owner.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-display text-base font-semibold text-ink-900 group-hover:text-forest-700 transition-colors">
                  {resource.owner.full_name}
                </p>
                <p className="text-sm text-ink-500">{resource.owner.department || "Campus member"}</p>
                {resource.owner.avg_response_seconds != null && (
                  <p className="text-[10px] text-primary-600 font-semibold flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {formatAvgResponseTime(resource.owner.avg_response_seconds)}
                  </p>
                )}
              </div>
            </Link>
            
            <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between text-xs">
              <span className="text-ink-500 font-medium">Security Deposit:</span>
              <span className={`font-semibold ${resource.deposit_amount > 0 ? "text-forest-700" : "text-ink-600"}`}>
                {resource.deposit_amount > 0 ? `₹${resource.deposit_amount}` : "No deposit required"}
              </span>
            </div>
          </div>

          {/* Regular Borrow Form (using your friend's wrapper styling, but main's logic) */}
          {!isOwner && resource.status === "available" && (
            <form onSubmit={handleBorrowRequest} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg space-y-5">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900">Request to Borrow</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Deposit-backed transaction</p>
              </div>

              {/* Date selections */}
              <div className="space-y-2.5">
                <label className="label">Select Dates</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <AvailabilityCalendar 
                    bookings={bookings}
                    selectedRange={selectedDateRange}
                    onSelectRange={setSelectedDateRange}
                    maxDays={resource.max_borrow_days}
                    availableFrom={resource.available_from}
                    availableTo={resource.available_to}
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span>Total Days</span>
                  <span className="text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-lg text-[11px]">{daysCount} days</span>
                </div>
              </div>

              {/* Price Details breakdown */}
              <div className="space-y-2.5 bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Price Details</h3>
                
                <div className="space-y-2 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>₹{dailyPrice} x {daysCount} days</span>
                    <span className="font-bold text-slate-800">₹{rentAmount}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="inline-flex items-center gap-1">
                      Security Deposit <span className="text-[9px] font-bold text-primary-600 bg-primary-50 px-1 py-0.5 rounded">Refundable</span>
                    </span>
                    <span className="font-bold text-slate-800">₹{securityDeposit}</span>
                  </div>
                  
                  <div className="h-px bg-slate-200/80 my-2" />
                  
                  <div className="flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-primary-600">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="label">Payment Method</label>
                
                <div className="space-y-2">
                  {/* UPI */}
                  <label className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    paymentMethod === "upi"
                      ? "border-primary-600 bg-primary-50/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-primary-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">UPI Method</p>
                        <p className="text-[10px] text-slate-400 font-semibold">.... 8567@paytm</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_opt"
                      value="upi"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                      className="h-4.5 w-4.5 text-primary-600 focus:ring-primary-500"
                    />
                  </label>

                  {/* Wallet */}
                  <label className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    paymentMethod === "wallet"
                      ? "border-primary-600 bg-primary-50/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Wallet className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">My Wallet Balance</p>
                        <p className="text-[10px] text-slate-400 font-semibold">₹320 available</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_opt"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                      className="h-4.5 w-4.5 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
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
                    <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded text-[10px]">Pay ₹{totalAmount}</span>
                  </>
                )}
              </button>
            </form>
          )}


          {/* Safety instructions */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4.5 flex gap-2.5 text-slate-500">
            <Shield className="h-4.5 w-4.5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-medium">
              <span className="font-bold text-slate-700">Safety Guarantee:</span> Deposit is held securely in escrow. It will be returned in full once the owner confirms the item is returned in working condition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
