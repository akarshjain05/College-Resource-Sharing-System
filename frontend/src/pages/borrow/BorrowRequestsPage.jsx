import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X, RotateCcw, MessageCircle, AlertCircle, MapPin, BellRing, Ban, Calendar, User, Star } from "lucide-react";
import { borrowApi } from "../../api/endpoints";
import DueBadge from "../../components/DueBadge";
import ChatThread from "../../components/ChatThread";
import { chatEventBus } from "../../utils/chatEventBus";

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

// Removed dead RequestCard component

export default function BorrowRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial tab based on search params URL query
  const getInitialTab = () => {
    const pTab = searchParams.get("tab");
    if (pTab === "incoming" || pTab === "lending") return "lending";
    return "borrowing";
  };

  const [tab, setTab] = useState(getInitialTab); // "borrowing" (my requests) or "lending" (incoming)
  const [subTab, setSubTab] = useState("upcoming"); // "upcoming", "ongoing", "completed", "cancelled"
  const [bookings, setBookings] = useState({ borrowing: [], lending: [] });
  const [loading, setLoading] = useState(true);

  // Review & Modal states
  const [selectedBookingForModal, setSelectedBookingForModal] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // "return" or "confirm_return"
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [openChatId, setOpenChatId] = useState(null);

  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const urlId = searchParams.get("id");
    if (urlId && bookings.borrowing.length > 0 && !autoOpenedRef.current) {
      const foundBorrowing = bookings.borrowing.find(b => b.id === urlId);
      if (foundBorrowing) {
        autoOpenedRef.current = true;
        setTab("borrowing");
        setSelectedBookingForModal(foundBorrowing);
        const status = foundBorrowing.status.toLowerCase();
        if (["requested", "pending", "approved"].includes(status)) setSubTab("upcoming");
        else if (["active", "ongoing", "return_requested", "late"].includes(status)) setSubTab("ongoing");
        else if (["returned", "confirmed_return", "damaged"].includes(status)) setSubTab("completed");
        else if (["cancelled", "rejected"].includes(status)) setSubTab("cancelled");
      } else if (bookings.lending.length > 0) {
        const foundLending = bookings.lending.find(b => b.id === urlId);
        if (foundLending) {
          autoOpenedRef.current = true;
          setTab("lending");
          setSelectedBookingForModal(foundLending);
          const status = foundLending.status.toLowerCase();
          if (["requested", "pending", "approved"].includes(status)) setSubTab("upcoming");
          else if (["active", "ongoing", "return_requested", "late"].includes(status)) setSubTab("ongoing");
          else if (["returned", "confirmed_return", "damaged"].includes(status)) setSubTab("completed");
          else if (["cancelled", "rejected"].includes(status)) setSubTab("cancelled");
        }
      }
    }
  }, [bookings, searchParams]);

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
          lender: { id: r.lender?.id, full_name: r.lender?.full_name || "Unknown" },
          borrower: { id: r.borrower?.id, full_name: "You" },
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
          lender: { id: r.lender?.id, full_name: "You" },
          borrower: { id: r.borrower?.id, full_name: r.borrower?.full_name || "Unknown" },
        }));

        setBookings({
          borrowing: dbMyReqs,
          lending: dbIncomingReqs
        });

        const targetId = searchParams.get("id");
        if (targetId) {
          let foundBooking = dbMyReqs.find(b => b.id === targetId);
          let newTab = "borrowing";
          if (!foundBooking) {
            foundBooking = dbIncomingReqs.find(b => b.id === targetId);
            if (foundBooking) newTab = "lending";
          }
          
          if (foundBooking) {
            setTab(newTab);
            const status = foundBooking.status.toLowerCase();
            if (["requested", "pending", "approved"].includes(status)) setSubTab("upcoming");
            else if (["active", "ongoing", "return_requested", "late"].includes(status)) setSubTab("ongoing");
            else if (["returned", "confirmed_return", "damaged"].includes(status)) setSubTab("completed");
            else if (["cancelled", "rejected"].includes(status)) setSubTab("cancelled");
            
            setSelectedBookingForModal(foundBooking);
          }
          
          // Remove id from URL so it doesn't reopen if user navigates back
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("id");
          setSearchParams(newParams, { replace: true });
        }

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

  // 1. Hook it up to the real database API
  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      if (newStatus === "approved" || newStatus === "approve") await borrowApi.approve(bookingId);
      if (newStatus === "rejected" || newStatus === "reject") {
        if (!window.confirm("Are you sure you want to reject this request?")) return;
        await borrowApi.reject(bookingId, "Not available right now");
      }
      if (newStatus === "nudge") {
        await borrowApi.nudge(bookingId);
        toast.success("Nudge sent successfully!");
        return;
      }
      if (newStatus === "active" || newStatus === "handover") await borrowApi.handover(bookingId);
      if (newStatus === "cancelled" || newStatus === "cancel") {
        if (!window.confirm("Are you sure you want to cancel this request?")) return;
        await borrowApi.cancel(bookingId);
      }
      if (newStatus === "return_requested" || newStatus === "return") await borrowApi.returnItem(bookingId, null, 5, "");
      if (newStatus === "returned" || newStatus === "confirm_return") await borrowApi.confirmReturn(bookingId, 5, "");

      toast.success("Updated successfully");
      if (typeof loadBookingsList === 'function') loadBookingsList();
      else load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };


  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewingId) return;

    try {
      if (reviewAction === "return") {
        await borrowApi.returnItem(reviewingId, null, ratingInput, commentInput);
      } else if (reviewAction === "confirm_return") {
        await borrowApi.confirmReturn(reviewingId, ratingInput, commentInput);
      }
      toast.success("Thank you for your rating!");
      setReviewingId(null);
      setReviewAction(null);
      setCommentInput("");
      setRatingInput(5);
      if (typeof loadBookingsList === 'function') loadBookingsList();
      else load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  // Status mapping for SubTabs
  const getFilteredBookings = () => {
    const list = bookings[tab] || [];

    return list.filter(b => {
      const status = b.status.toLowerCase();
      if (subTab === "upcoming") {
        return ["requested", "pending", "approved"].includes(status);
      }
      if (subTab === "ongoing") {
        return ["active", "ongoing", "return_requested", "late"].includes(status);
      }
      if (subTab === "completed") {
        return ["returned", "confirmed_return", "damaged"].includes(status);
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
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Bookings</h1>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Manage borrowing & lending orders</p>
      </div>

      {/* Main role tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1.5 w-fit border border-slate-200/40">
        <button
          onClick={() => { setTab("borrowing"); setSubTab("upcoming"); }}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${tab === "borrowing"
            ? "bg-white text-primary-600 shadow-sm"
            : "text-slate-500 hover:text-slate-900"
            }`}
        >
          Items I'm Borrowing
        </button>
        <button
          onClick={() => { setTab("lending"); setSubTab("upcoming"); }}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${tab === "lending"
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
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all capitalize -mb-px ${subTab === st.key
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
            to="/resources"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            Explore Nearby Items
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((book) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(book.requested_start_date);
            startDate.setHours(0, 0, 0, 0);
            const end = new Date(book.requested_end_date);
            end.setHours(0, 0, 0, 0);
            const isStarted = today >= startDate;
            const isExpired = today > end;

            return (
              <div
                key={book.id}
                onClick={() => setSelectedBookingForModal(book)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:border-primary-400 transition-colors"
              >
                {/* Card Header (Item and Status Badge) */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {book.resource.image_placeholder || "🪜"}
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-white leading-tight hover:text-brand-500 hover:underline cursor-pointer">
                        <Link to={`/resources/${book.resource.id}`}>
                          {book.resource.title}
                        </Link>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                        {tab === "borrowing" ? (
                          <>Lender: {book.lender?.id ? <Link to={`/users/${book.lender.id}`} className="hover:underline hover:text-brand-500 cursor-pointer">{book.lender.full_name}</Link> : book.lender?.full_name}</>
                        ) : (
                          <>Borrower: {book.borrower?.id ? <Link to={`/users/${book.borrower.id}`} className="hover:underline hover:text-brand-500 cursor-pointer">{book.borrower.full_name}</Link> : book.borrower?.full_name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(book.status)}
                </div>

                {/* Booking specifications */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lending Window</p>
                    <p className="text-slate-800 dark:text-slate-100 font-bold flex items-center gap-2">
                      {new Date(book.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} →{" "}
                      {new Date(book.requested_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      <DueBadge endDate={book.requested_end_date} status={book.status} />
                    </p>
                  </div>
                  <div className="space-y-1 sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3.5">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Amount</p>
                    <p className="text-primary-600 font-extrabold">₹{book.total_amount}</p>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 justify-end border-t border-slate-100 pt-3">
                  {/* Borrower Actions */}
                  {tab === "borrowing" && book.status === "requested" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "nudge"); }}
                        className="btn-secondary !py-2 text-xs"
                      >
                        <BellRing className="h-3.5 w-3.5" /> Nudge Owner
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "cancelled"); }}
                        className="btn-secondary !py-2 text-xs"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel Request
                      </button>
                    </>
                  )}
                  {tab === "borrowing" && book.status === "approved" && (
                    isStarted ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "nudge"); }}
                        className="btn-secondary flex items-center gap-1.5 !py-2 text-xs text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950/30 font-bold"
                      >
                        <BellRing className="h-3.5 w-3.5" /> Nudge Owner for Handover
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" /> Waiting for owner to hand over (unlocks {new Date(book.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                      </span>
                    )
                  )}
                  {tab === "borrowing" && (book.status === "active" || book.status === "ongoing" || book.status === "late") && (
                    isStarted ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReviewingId(book.id); setReviewAction("return"); }}
                        className="btn-primary !bg-brass-500 hover:!bg-brass-700 !py-2 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Return Item
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Return unlocks on {new Date(book.requested_start_date).toLocaleDateString()}
                      </span>
                    )
                  )}
                  {tab === "borrowing" && book.status === "return_requested" && (
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5 text-slate-400" /> Return pending confirmation
                    </span>
                  )}

                  {/* Lender Actions */}
                  {tab === "lending" && book.status === "requested" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "approved"); }}
                        className="btn-primary !py-2 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "rejected"); }}
                        className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 !py-2 text-xs"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  )}
                  {tab === "lending" && book.status === "approved" && (
                    isExpired ? (
                      <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-red-500" /> Lending window expired
                      </span>
                    ) : isStarted ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "active"); }}
                        className="btn-primary !py-2 text-xs"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark as Handed Over
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Handover unlocks on {new Date(book.requested_start_date).toLocaleDateString()}
                      </span>
                    )
                  )}
                  {tab === "lending" && (book.status === "active" || book.status === "ongoing" || book.status === "late") && (
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> Item is currently with borrower
                    </span>
                  )}
                  {tab === "lending" && book.status === "return_requested" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setReviewingId(book.id); setReviewAction("confirm_return"); }}
                      className="btn-primary !bg-brass-500 hover:!bg-brass-700 !py-2 text-xs"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm Return
                    </button>
                  )}

                  {/* Global Actions (Chat & Complaint) */}
                  {["active", "returned", "damaged", "late"].includes(book.status) && (
                    <a
                      href={`/complaints?borrow_request_id=${book.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-secondary !py-2 text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
                    >
                      File Complaint
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenChatId(book.id);
                    }}
                    className="btn-secondary flex items-center gap-1.5 !py-2 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Dialog Box Popup */}
      {reviewingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-900">
                {reviewAction === "confirm_return" ? "Confirm Return & Rate" : "Return & Rate Item"}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                {reviewAction === "confirm_return" ? "Rate the borrower" : "Tell us about your experience"}
              </p>
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
                  onClick={() => { setReviewingId(null); setReviewAction(null); }}
                  className="btn-secondary !py-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedBookingForModal(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 pr-8">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-3xl flex-shrink-0">
                {selectedBookingForModal.resource?.image_placeholder || "🪜"}
              </div>
              <div>
                <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  <Link to={`/resources/${selectedBookingForModal.resource?.id}`} className="hover:text-primary-600 dark:hover:text-primary-400 hover:underline">
                    {selectedBookingForModal.resource?.title}
                  </Link>
                </h2>
                <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5">
                  {tab === "borrowing" ? `Lender: ${selectedBookingForModal.lender?.full_name}` : `Borrower: ${selectedBookingForModal.borrower?.full_name}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">Lending Window</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                  {new Date(selectedBookingForModal.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} →{" "}
                  {new Date(selectedBookingForModal.requested_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">Total Amount</span>
                <span className="font-extrabold text-primary-600 dark:text-primary-400 text-sm">₹{selectedBookingForModal.total_amount || 0}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 dark:text-slate-300">Booking Status</h4>
              <span className="inline-block rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-bold uppercase border border-emerald-200 dark:border-emerald-800">
                {selectedBookingForModal.status?.replace("_", " ")}
              </span>
            </div>

            <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => setSelectedBookingForModal(null)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Popup Modal */}
      {openChatId && (() => {
        const book = (Array.isArray(bookings?.borrowing) ? bookings.borrowing : []).find(b => b.id === openChatId) ||
          (Array.isArray(bookings?.lending) ? bookings.lending : []).find(b => b.id === openChatId);
        if (!book) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-4 animate-in fade-in duration-200">
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            >
              <button
                onClick={() => setOpenChatId(null)}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-150 dark:hover:bg-slate-800 transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 pr-8 mb-2">
                <div className="h-11 w-11 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                  {book.resource?.image_placeholder || "🛠️"}
                </div>
                <div>
                  <h2 className="font-display text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                    Chat: {book.resource?.title}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                    {tab === "borrowing" ? `Lender: ${book.lender?.full_name}` : `Borrower: ${book.borrower?.full_name}`}
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0">
                <ChatThread
                  request={book}
                  onReportIssue={(req) => {
                    setOpenChatId(null);
                    window.location.href = `/complaints?borrow_request_id=${req.id}`;
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
