import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X, RotateCcw, Ban, Calendar, User, ShieldAlert, Star, BellRing } from "lucide-react";
import { borrowApi } from "../../api/endpoints";
import DueBadge from "../../components/DueBadge";

const STATUS_STYLE = {
  requested: "bg-brass-50 text-brass-700",
  approved: "bg-forest-50 text-forest-700",
  active: "bg-forest-100 text-forest-800",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-ink-100 text-ink-500",
  returned: "bg-ink-100 text-ink-700",
  return_requested: "bg-brass-50 text-brass-700",
  damaged: "bg-red-50 text-red-600",
  late: "bg-red-50 text-red-600",
};

function RequestCard({ request, isIncoming, onAction }) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [actionType, setActionType] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(request.requested_end_date);
  end.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  const hoursSinceRequested = request.created_at ? Math.floor((new Date() - new Date(request.created_at)) / (1000 * 60 * 60)) : 0;
  const canNudge = !isIncoming && request.status === "requested" && hoursSinceRequested >= 24;

  const handleActionClick = (action) => {
    if (action === "return" || action === "confirm_return") {
      setActionType(action);
      setShowRating(true);
    } else {
      onAction(action, request.id);
    }
  };

  const submitRatingAction = () => {
    // Pass the rating and review up via onAction
    onAction(actionType, request.id, rating, review);
    setShowRating(false);
  };

  return (
    <div className="index-card p-4 pl-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-ink-900">{request.resource.title}</p>
          <p className="text-xs text-ink-500">
            {isIncoming ? (
              <>Requested by <Link to={`/users/${request.borrower.id}`} className="hover:underline text-ink-900 font-medium">{request.borrower.full_name}</Link></>
            ) : (
              <>Owned by <Link to={`/users/${request.lender.id}`} className="hover:underline text-ink-900 font-medium">{request.lender.full_name}</Link></>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[request.status]}`}>
            {request.status.replace("_", " ")}
          </span>
          {(request.status === "active" || request.status === "late") && (
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              daysRemaining < 0 || request.status === "late" ? "bg-red-100 text-red-700" :
              daysRemaining === 0 ? "bg-orange-100 text-orange-700" :
              daysRemaining <= 2 ? "bg-yellow-100 text-yellow-700" : "bg-forest-100 text-forest-700"
            }`}>
              {daysRemaining < 0 || request.status === "late" ? `Overdue by ${Math.abs(daysRemaining)} day(s)` :
               daysRemaining === 0 ? "Due today" :
               `${daysRemaining} days remaining`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
        <span>{request.requested_start_date} → {request.requested_end_date}</span>
        <DueBadge endDate={request.requested_end_date} status={request.status} />
      </div>
      {request.purpose && <p className="mt-1 text-sm text-ink-700">{request.purpose}</p>}

      {showRating ? (
        <div className="mt-3 rounded bg-ink-50 p-3">
          <p className="text-xs font-semibold text-ink-900 mb-2">
            {actionType === "return" ? "Rate the lender & item:" : "Rate the borrower:"}
          </p>
          <div className="flex flex-col gap-2 mb-3">
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="input !w-24 text-xs !py-1">
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
            <textarea
              className="input text-xs"
              placeholder="Leave a written review (optional)"
              rows={2}
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={submitRatingAction} className="btn-primary !py-1 !px-3 text-xs">
              Submit
            </button>
            <button onClick={() => setShowRating(false)} className="btn-secondary !py-1 !px-3 text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {isIncoming && request.status === "requested" && (
            <>
              <button onClick={() => handleActionClick("approve")} className="btn-primary !py-1.5 !px-3 text-xs">
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => handleActionClick("reject")} className="btn-secondary !py-1.5 !px-3 text-xs">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {!isIncoming && request.status === "requested" && (
            <>
              {canNudge && (
                <button onClick={() => handleActionClick("nudge")} className="btn-secondary !py-1.5 !px-3 text-xs">
                  <BellRing className="h-3.5 w-3.5" /> Nudge Owner
                </button>
              )}
              <button onClick={() => handleActionClick("cancel")} className="btn-secondary !py-1.5 !px-3 text-xs">
                <Ban className="h-3.5 w-3.5" /> Cancel
              </button>
            </>
          )}
          {!isIncoming && request.status === "approved" && (
            <span className="text-xs font-semibold text-brass-700">Waiting for owner to hand over</span>
          )}
          {isIncoming && request.status === "approved" && (
            <button onClick={() => handleActionClick("handover")} className="btn-primary !py-1.5 !px-3 text-xs">
              <Check className="h-3.5 w-3.5" /> Mark as Handed Over
            </button>
          )}
          {!isIncoming && request.status === "active" && (
            <button onClick={() => handleActionClick("return")} className="btn-brass !py-1.5 !px-3 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Return Resource
            </button>
          )}
          {!isIncoming && ["active", "returned", "damaged", "late"].includes(request.status) && (
            <a href={`/complaints?borrow_request_id=${request.id}`} className="btn-secondary !py-1.5 !px-3 text-xs text-red-600">
              File Complaint
            </a>
          )}
          {!isIncoming && request.status === "return_requested" && (
            <span className="text-xs font-semibold text-brass-700">Return pending confirmation</span>
          )}
          {isIncoming && request.status === "return_requested" && (
            <button onClick={() => handleActionClick("confirm_return")} className="btn-primary !py-1.5 !px-3 text-xs">
              <Check className="h-3.5 w-3.5" /> Confirm Return
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BorrowRequestsPage() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status");

  const [tab, setTab] = useState("borrowing"); // "borrowing" (my requests) or "lending" (incoming)
  const [subTab, setSubTab] = useState("upcoming"); // "upcoming", "ongoing", "completed", "cancelled"
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review states
  const [reviewingId, setReviewingId] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");

  const loadBookingsList = () => {
    setLoading(true);
    
    Promise.all([
      borrowApi.myRequests().catch(() => ({ data: [] })),
      borrowApi.incoming().catch(() => ({ data: [] }))
    ])
      .then(([myReqsResp, incomingReqsResp]) => {
        // Map database requests to match structure
        const dbMyReqs = (myReqsResp.data || []).map(r => ({
          id: r.id,
          resource: {
            id: r.resource.id,
            title: r.resource.title,
            image_placeholder: "🛠️",
          },
          requested_start_date: r.requested_start_date,
          requested_end_date: r.requested_end_date,
          total_amount: (r.deposit_paid || 0) + (r.resource?.deposit_amount || 0),
          status: r.status,
          lender: { full_name: r.lender?.full_name || "Unknown" },
          borrower: { full_name: "You" },
        }));

        const dbIncomingReqs = (incomingReqsResp.data || []).map(r => ({
          id: r.id,
          resource: {
            id: r.resource.id,
            title: r.resource.title,
            image_placeholder: "🛠️",
          },
          requested_start_date: r.requested_start_date,
          requested_end_date: r.requested_end_date,
          total_amount: (r.deposit_paid || 0) + (r.resource?.deposit_amount || 0),
          status: r.status,
          lender: { full_name: "You" },
          borrower: { full_name: r.borrower?.full_name || "Unknown" },
        }));

        setBookings({
          borrowing: dbMyReqs,
          lending: dbIncomingReqs
        });
      })
      .catch((err) => {
        console.error("Failed to load bookings:", err);
        toast.error("Failed to load bookings");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Keep your friend's load function if they renamed it
    // (If it says it's undefined later, change this back to load() )
    if (typeof loadBookingsList === 'function') {
      loadBookingsList();
    } else {
      load();
    }
  }, []);

  // 1. Keep your friend's function name so their UI buttons don't break, 
  // but hook it up to the real database API!
  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      if (newStatus === "approved" || newStatus === "approve") await borrowApi.approve(bookingId);
      if (newStatus === "rejected" || newStatus === "reject") await borrowApi.reject(bookingId, "Not available right now");
      if (newStatus === "nudge") {
        await borrowApi.nudge(bookingId);
        toast.success("Nudge sent successfully!");
        return;
      }
      if (newStatus === "active" || newStatus === "handover") await borrowApi.handover(bookingId);
      if (newStatus === "cancelled" || newStatus === "cancel") await borrowApi.cancel(bookingId);
      if (newStatus === "return_requested" || newStatus === "return") await borrowApi.returnItem(bookingId, null, 5, ""); 
      if (newStatus === "returned" || newStatus === "confirm_return") await borrowApi.confirmReturn(bookingId, 5, "");
      
      toast.success("Updated successfully");
      if (typeof loadBookingsList === 'function') loadBookingsList();
      else load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  // 2. Keep the original handleAction from main just in case any buttons still rely on it
  const handleAction = async (action, id, rating, review) => {
    try {
      if (action === "approve") await borrowApi.approve(id);
      if (action === "reject") await borrowApi.reject(id, "Not available right now");
      if (action === "nudge") {
        await borrowApi.nudge(id);
        toast.success("Nudge sent successfully!");
        return;
      }
      if (action === "handover") await borrowApi.handover(id);
      if (action === "cancel") await borrowApi.cancel(id);
      if (action === "return") await borrowApi.returnItem(id, null, rating, review);
      if (action === "confirm_return") await borrowApi.confirmReturn(id, rating, review);
      
      toast.success("Updated successfully");
      if (typeof loadBookingsList === 'function') loadBookingsList();
      else load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };


  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewingId) return;

    // Update status in localStorage
    const local = JSON.parse(localStorage.getItem("share_neighbour_bookings") || "[]");
    const idx = local.findIndex(b => b.id === reviewingId);
    if (idx !== -1) {
      local[idx].status = "returned";
      localStorage.setItem("share_neighbour_bookings", JSON.stringify(local));
    }

    toast.success("Thank you for your rating!");
    setReviewingId(null);
    setCommentInput("");
    loadBookingsList();
  };

  // Status mapping for SubTabs
  // Upcoming: requested, pending, approved
  // Ongoing: active
  // Completed: returned, confirmed_return
  // Cancelled: cancelled, rejected
  const getFilteredBookings = () => {
    const list = bookings[tab] || [];
    
    return list.filter(b => {
      const status = b.status.toLowerCase();
      if (subTab === "upcoming") {
        return ["requested", "pending", "approved"].includes(status);
      }
      if (subTab === "ongoing") {
        return ["active", "ongoing"].includes(status);
      }
      if (subTab === "completed") {
        return ["returned", "confirmed_return"].includes(status);
      }
      if (subTab === "cancelled") {
        return ["cancelled", "rejected"].includes(status);
      }
      return true;
    });
  };

  const activeList = getFilteredBookings();

  // Style helper for card status pills matching design
  const getStatusBadge = (status) => {
    const st = status.toLowerCase();
    if (st === "requested") return <span className="rounded-lg bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Requested</span>;
    if (st === "approved") return <span className="rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Approved</span>;
    if (st === "pending") return <span className="rounded-lg bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Pending</span>;
    if (st === "active" || st === "ongoing") return <span className="rounded-lg bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Active</span>;
    if (st === "returned") return <span className="rounded-lg bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Completed</span>;
    return <span className="rounded-lg bg-red-50 text-red-600 border border-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">My Bookings</h1>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Manage borrowing & lending orders</p>
      </div>

      {/* Main role tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1.5 w-fit border border-slate-200/40">
        <button
          onClick={() => { setTab("borrowing"); setSubTab("upcoming"); }}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
            tab === "borrowing"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Items I'm Borrowing
        </button>
        <button
          onClick={() => { setTab("lending"); setSubTab("upcoming"); }}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
            tab === "lending"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Items I'm Lending
        </button>
      </div>

      {/* Status sub-tabs matching mockup (Upcoming, Ongoing, Completed, Cancelled) */}
      <div className="flex border-b border-slate-200 gap-1.5">
        {[
          { key: "upcoming", label: "Upcoming" },
          { key: "ongoing", label: "Ongoing" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" }
        ].map(st => (
          <button
            key={st.key}
            onClick={() => setSubTab(st.key)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all capitalize -mb-px ${
              subTab === st.key
                ? "border-primary-600 text-primary-600 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Bookings Card List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No bookings in this tab</p>
          <p className="mt-1 text-xs text-slate-400">Borrow something or list an item to get started!</p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            Explore Nearby Items
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((book) => (
            <div
              key={book.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Card Header (Item and Status Badge) */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {book.resource.image_placeholder || "🪜"}
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-extrabold text-slate-900 leading-tight">
                      {book.resource.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                      {tab === "borrowing" ? `Lender: ${book.lender?.full_name}` : `Borrower: ${book.borrower?.full_name}`}
                    </p>
                  </div>
                </div>
                {getStatusBadge(book.status)}
              </div>

              {/* Booking specifications */}
              <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between gap-2 text-xs font-medium text-slate-600 border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lending Window</p>
                  <p className="text-slate-800 font-bold">
                    {new Date(book.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} →{" "}
                    {new Date(book.requested_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="space-y-1 sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3.5">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Amount</p>
                  <p className="text-primary-600 font-extrabold">₹{book.total_amount}</p>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex flex-wrap gap-2 justify-end border-t border-slate-100 pt-3">
                {/* Borrower Actions */}
                {tab === "borrowing" && book.status === "requested" && (
                  <button
                    onClick={() => handleStatusChange(book.id, "cancelled")}
                    className="btn-secondary !py-2 text-xs"
                  >
                    <Ban className="h-3.5 w-3.5" /> Cancel Request
                  </button>
                )}
                {tab === "borrowing" && book.status === "approved" && (
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Waiting for owner to hand over
                  </span>
                )}
                {tab === "borrowing" && (book.status === "active" || book.status === "ongoing") && (
                  <button
                    onClick={() => setReviewingId(book.id)}
                    className="btn-primary !bg-brass-500 hover:!bg-brass-700 !py-2 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Return Item
                  </button>
                )}

                {/* Lender Actions */}
                {tab === "lending" && book.status === "requested" && (
                  <>
                    <button
                      onClick={() => handleStatusChange(book.id, "approved")}
                      className="btn-primary !py-2 text-xs"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(book.id, "rejected")}
                      className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 !py-2 text-xs"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </>
                )}
                {tab === "lending" && book.status === "approved" && (
                  <button
                    onClick={() => handleStatusChange(book.id, "active")}
                    className="btn-primary !py-2 text-xs"
                  >
                    <Check className="h-3.5 w-3.5" /> Mark as Handed Over
                  </button>
                )}
                {tab === "lending" && (book.status === "active" || book.status === "ongoing") && (
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Item is currently with borrower
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog Box Popup */}
      {reviewingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-900">Return & Rate Item</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Tell us about your experience</p>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="label">Rating Stars</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRatingInput(star)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star className={`h-8 w-8 ${star <= ratingInput ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Write a Review</label>
                <textarea
                  required
                  placeholder="e.g. Drill works great, owner helpful..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2 text-xs font-bold shadow-sm"
                >
                  Submit & Return
                </button>
                <button
                  type="button"
                  onClick={() => setReviewingId(null)}
                  className="btn-secondary !py-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
