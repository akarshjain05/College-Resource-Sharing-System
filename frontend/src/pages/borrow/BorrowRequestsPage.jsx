import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X, RotateCcw, MessageCircle, AlertCircle, MapPin, BellRing, Ban, Calendar, User, Star } from "lucide-react";
import { borrowApi } from "../../api/endpoints";
import DueBadge from "../../components/DueBadge";
import ChatThread from "../../components/ChatThread";
import ConfirmModal from "../../components/ConfirmModal";
import { chatEventBus } from "../../utils/chatEventBus";
import PayNowButton from "../../components/PayNowButton";

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

const getStatusBadge = (status) => {
  const st = status.toLowerCase();
  if (st === "requested") return <span className="rounded-lg bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Requested</span>;
  if (st === "approved") return <span className="rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Approved</span>;
  if (st === "pending") return <span className="rounded-lg bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Pending</span>;
  if (st === "handover_requested") return <span className="rounded-lg bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Handover Requested</span>;
  if (st === "active" || st === "ongoing") return <span className="rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Active</span>;
  if (st === "returned") return <span className="rounded-lg bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Completed</span>;
  return <span className="rounded-lg bg-red-50 text-red-600 border border-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">{status}</span>;
};

export default function BorrowRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial tab based on search params URL query
  const getInitialTab = () => {
    const pTab = searchParams.get("tab");
    if (pTab === "incoming" || pTab === "lending") return "lending";
    return "borrowing";
  };

  const getInitialSubTab = () => {
    const pSubTab = searchParams.get("subTab") || searchParams.get("section");
    if (pSubTab && ["upcoming", "ongoing", "completed", "cancelled"].includes(pSubTab.toLowerCase())) {
      return pSubTab.toLowerCase();
    }
    return "upcoming";
  };

  const [tab, setTab] = useState(getInitialTab); // "borrowing" (my requests) or "lending" (incoming)
  const [subTab, setSubTab] = useState(getInitialSubTab); // "upcoming", "ongoing", "completed", "cancelled"
  const [bookings, setBookings] = useState({ borrowing: [], lending: [] });
  const [loading, setLoading] = useState(true);

  // Review & Modal states
  const [selectedBookingForModal, setSelectedBookingForModal] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // "return" or "confirm_return"
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [damageReportInput, setDamageReportInput] = useState("");
  const [openChatId, setOpenChatId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const autoOpenedRef = useRef(false);

  const closeBookingModal = (updatedBooking) => {
    const booking = updatedBooking || selectedBookingForModal;
    if (booking) {
      const status = (booking.status || "").toLowerCase();
      let targetSubTab = "upcoming";
      if (["requested", "pending", "approved"].includes(status)) {
        targetSubTab = "upcoming";
      } else if (["handover_requested", "active", "ongoing", "return_requested", "late"].includes(status)) {
        targetSubTab = "ongoing";
      } else if (["returned", "confirmed_return", "damaged"].includes(status)) {
        targetSubTab = "completed";
      } else if (["cancelled", "rejected"].includes(status)) {
        targetSubTab = "cancelled";
      }

      setSubTab(targetSubTab);

      const isLending = bookings.lending?.some(b => b.id === booking.id) || booking.lender?.full_name === "You";
      const isBorrowing = bookings.borrowing?.some(b => b.id === booking.id) || booking.borrower?.full_name === "You";
      if (isLending && tab !== "lending") {
        setTab("lending");
      } else if (isBorrowing && !isLending && tab !== "borrowing") {
        setTab("borrowing");
      }
    }
    setSelectedBookingForModal(null);
  };

  useEffect(() => {
    const urlId = searchParams.get("id");
    const isOpenChat = searchParams.get("openChat") === "true";

    // Don't auto-open on page refresh (user hit F5/Cmd+R)
    const isReload = window.performance && 
                    window.performance.getEntriesByType && 
                    window.performance.getEntriesByType("navigation").length > 0 && 
                    window.performance.getEntriesByType("navigation")[0].type === "reload";

    if (urlId && !isReload && (bookings.borrowing.length > 0 || bookings.lending.length > 0) && autoOpenedRef.current !== urlId) {
      let foundBooking = bookings.borrowing.find(b => b.id === urlId);
      let newTab = "borrowing";
      if (!foundBooking) {
        foundBooking = bookings.lending.find(b => b.id === urlId);
        if (foundBooking) newTab = "lending";
      }

      if (foundBooking) {
        autoOpenedRef.current = urlId;
        setTab(newTab);
        const status = foundBooking.status.toLowerCase();
        if (["requested", "pending", "approved"].includes(status)) setSubTab("upcoming");
        else if (["handover_requested", "active", "ongoing", "return_requested", "late"].includes(status)) setSubTab("ongoing");
        else if (["returned", "confirmed_return", "damaged"].includes(status)) setSubTab("completed");
        else if (["cancelled", "rejected"].includes(status)) setSubTab("cancelled");

        if (isOpenChat) {
          setOpenChatId(urlId);
        } else {
          setSelectedBookingForModal(foundBooking);
        }

        const newParams = new URLSearchParams(searchParams);
        newParams.delete("id");
        newParams.delete("openChat");
        setSearchParams(newParams, { replace: true });
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
          payment: r.payment,
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
          payment: r.payment,
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
    if (typeof loadBookingsList === 'function') {
      loadBookingsList();
    } else {
      load();
    }
  }, []);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      if (newStatus === "approved" || newStatus === "approve") await borrowApi.approve(bookingId);
      if (newStatus === "rejected" || newStatus === "reject") {
        setConfirmDialog({
          title: "Decline Request",
          message: "Are you sure you want to decline this request?",
          confirmText: "Decline",
          isDanger: true,
          onConfirm: async () => {
            try {
              await borrowApi.reject(bookingId, "Not available right now");
              toast.success("Updated successfully");
              if (typeof loadBookingsList === 'function') loadBookingsList();
              else load();
            } catch (err) {
              toast.error(err.response?.data?.detail || "Action failed");
            }
          }
        });
        return;
      }
      if (newStatus === "nudge") {
        await borrowApi.nudge(bookingId);
        toast.success("Nudge sent successfully!");
        return;
      }
      if (newStatus === "active" || newStatus === "handover") await borrowApi.handover(bookingId);
      if (newStatus === "confirm_handover") await borrowApi.confirmHandover(bookingId);
      if (newStatus === "reject_handover" || newStatus === "not_received") {
        setConfirmDialog({
          title: "Not Received",
          message: "Are you sure you want to mark this item as not received? This will notify the lender and decline the handover.",
          confirmText: "Mark Not Received",
          isDanger: true,
          onConfirm: async () => {
            try {
              await borrowApi.rejectHandover(bookingId);
              toast.success("Updated successfully");
              if (typeof loadBookingsList === 'function') loadBookingsList();
              else load();
            } catch (err) {
              toast.error(err.response?.data?.detail || "Action failed");
            }
          }
        });
        return;
      }
      if (newStatus === "cancelled" || newStatus === "cancel") {
        setConfirmDialog({
          title: "Cancel Request",
          message: "Are you sure you want to cancel this request?",
          confirmText: "Cancel Request",
          isDanger: true,
          onConfirm: async () => {
            try {
              await borrowApi.cancel(bookingId);
              toast.success("Updated successfully");
              if (typeof loadBookingsList === 'function') loadBookingsList();
              else load();
            } catch (err) {
              toast.error(err.response?.data?.detail || "Action failed");
            }
          }
        });
        return;
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
        await borrowApi.returnItem(reviewingId, damageReportInput || null, ratingInput, commentInput);
      } else if (reviewAction === "confirm_return") {
        await borrowApi.confirmReturn(reviewingId, ratingInput, commentInput);
      }
      toast.success("Thank you for your rating!");
      setReviewingId(null);
      setReviewAction(null);
      setCommentInput("");
      setDamageReportInput("");
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
        return ["handover_requested", "active", "ongoing", "return_requested", "late"].includes(status);
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



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Bookings</h1>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Manage borrowing & lending orders</p>
      </div>

      {/* Main role tabs */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1.5 w-fit border border-slate-200/40 dark:border-slate-800">
        <button
          onClick={() => { setTab("borrowing"); setSubTab("upcoming"); }}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${tab === "borrowing"
            ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          Items I'm Borrowing
        </button>
        <button
          onClick={() => { setTab("lending"); setSubTab("upcoming"); }}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${tab === "lending"
            ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          Items I'm Lending
        </button>
      </div>

      {/* Status sub-tabs matching mockup (Upcoming, Ongoing, Completed, Cancelled) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5">
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
              ? "border-primary-600 text-primary-600 dark:text-primary-400 font-extrabold"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No bookings in this tab</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">Borrow something or list an item to get started!</p>
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
                className="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
              >
                {/* Card Header (Item and Status Badge) */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
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
                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <p className="text-primary-600 dark:text-primary-400 font-extrabold">₹{book.total_amount}</p>
                      {book.total_amount === 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">Free</span>
                      ) : book.payment?.status === "paid" ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">✓ Paid</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">✗ Unpaid</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
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
                    (!book.payment || book.payment.status !== "paid") && book.total_amount > 0 ? (
                      <div className="w-full flex-col items-center">
                        <PayNowButton 
                           borrowRequest={book} 
                           onPaid={() => {
                              setSelectedBookingForModal(null);
                              if (typeof loadBookingsList === 'function') loadBookingsList();
                              else load();
                           }} 
                        />
                      </div>
                    ) : !isStarted ? (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Handover unlocks on {new Date(book.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" /> Waiting for owner to hand over
                      </span>
                    )
                  )}
                  {tab === "borrowing" && book.status === "handover_requested" && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "confirm_handover"); }}
                        className="btn-primary !bg-blue-600 hover:!bg-blue-700 !py-2 text-xs font-bold"
                      >
                        <Check className="h-3.5 w-3.5" /> Confirm Receipt
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "reject_handover"); }}
                        className="btn-secondary !py-2 text-xs font-bold !bg-red-50 !text-red-600 hover:!bg-red-100 !border-red-200"
                      >
                        <X className="h-3.5 w-3.5" /> Not Received
                      </button>
                    </div>
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
                    (!book.payment || book.payment.status !== "paid") && book.total_amount > 0 ? (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Waiting for borrower to complete payment
                      </span>
                    ) : isExpired ? (
                      <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-red-500" /> Lending window expired
                      </span>
                    ) : isStarted ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(book.id, "handover"); }}
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
                      href={`/complaints?borrow_request_id=${book.id}&resource_id=${book.resource_id || ''}&against_user_id=${book.lender_id || book.borrower_id || ''}&category=dispute`}
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white">
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
                      <Star className={`h-8 w-8 ${star <= ratingInput ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}`} />
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
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {reviewAction === "return" && (
                <div>
                  <label className="label">Report Damage (Optional)</label>
                  <textarea
                    placeholder="If the item was damaged, please describe it here..."
                    value={damageReportInput}
                    onChange={(e) => setDamageReportInput(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Reporting damage will automatically open a claim for the owner to review.
                  </p>
                </div>
              )}

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
      {selectedBookingForModal && (() => {
        const modalIsStarted = new Date(selectedBookingForModal.requested_start_date) <= new Date();
        const modalIsExpired = new Date(selectedBookingForModal.requested_end_date) < new Date();
        const isLenderModal = tab === "lending" || bookings.lending?.some(b => b.id === selectedBookingForModal.id) || selectedBookingForModal.lender?.full_name === "You";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
              <button
                onClick={() => closeBookingModal()}
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
                    {isLenderModal ? `Borrower: ${selectedBookingForModal.borrower?.full_name}` : `Lender: ${selectedBookingForModal.lender?.full_name}`}
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
                  <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Total Amount</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-primary-600 dark:text-primary-400 text-sm">₹{selectedBookingForModal.total_amount || 0}</span>
                    {(selectedBookingForModal.total_amount || 0) === 0 ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Free</span>
                    ) : selectedBookingForModal.payment?.status === "paid" ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">✓ Paid</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">✗ Unpaid</span>
                    )}
                  </div>
                  {(selectedBookingForModal.total_amount || 0) > 0 && selectedBookingForModal.payment?.status !== "paid" && (
                    <p className="text-[9px] text-red-500 dark:text-red-400 mt-1 font-semibold">Payment pending — complete payment to confirm booking</p>
                  )}
                  {selectedBookingForModal.payment?.status === "paid" && selectedBookingForModal.payment?.paid_at && (
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                      Paid on {new Date(selectedBookingForModal.payment.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs mb-6">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2.5">Booking Status</h4>
                <div className="inline-flex">
                  {getStatusBadge(selectedBookingForModal.status || "")}
                </div>
              </div>

              {/* Action Buttons row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const bId = selectedBookingForModal.id;
                      closeBookingModal();
                      setOpenChatId(bId);
                    }}
                    className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Message
                  </button>
                  {["active", "returned", "damaged", "late"].includes(selectedBookingForModal.status) && (
                    <a
                      href={`/complaints?borrow_request_id=${selectedBookingForModal.id}&resource_id=${selectedBookingForModal.resource_id || ''}&against_user_id=${selectedBookingForModal.lender_id || selectedBookingForModal.borrower_id || ''}&category=dispute`}
                      className="btn-secondary !py-2 !px-3 text-xs text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-1.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Report Issue
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Lender Actions */}
                  {isLenderModal && selectedBookingForModal.status === "requested" && (
                    <>
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "approved");
                          closeBookingModal({ ...selectedBookingForModal, status: "approved" });
                        }}
                        className="btn-primary !py-2 text-xs flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "rejected");
                          closeBookingModal({ ...selectedBookingForModal, status: "rejected" });
                        }}
                        className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 !py-2 text-xs flex items-center gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  )}

                  {isLenderModal && selectedBookingForModal.status === "approved" && (
                    (!selectedBookingForModal.payment || selectedBookingForModal.payment.status !== "paid") && selectedBookingForModal.total_amount > 0 ? (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Waiting for borrower to complete payment
                      </span>
                    ) : modalIsExpired ? (
                      <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-red-500" /> Lending window expired
                      </span>
                    ) : modalIsStarted ? (
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "handover");
                          closeBookingModal({ ...selectedBookingForModal, status: "handover_requested" });
                        }}
                        className="btn-primary !py-2 text-xs flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark as Handed Over
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Handover unlocks on {new Date(selectedBookingForModal.requested_start_date).toLocaleDateString()}
                      </span>
                    )
                  )}

                  {isLenderModal && selectedBookingForModal.status === "return_requested" && (
                    <button
                      onClick={() => {
                        const bId = selectedBookingForModal.id;
                        setSelectedBookingForModal(null);
                        setReviewingId(bId);
                        setReviewAction("confirm_return");
                      }}
                      className="btn-primary !bg-brass-500 hover:!bg-brass-700 !py-2 text-xs flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm Return
                    </button>
                  )}

                  {/* Borrower Actions */}
                  {!isLenderModal && selectedBookingForModal.status === "requested" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedBookingForModal.id, "nudge")}
                        className="btn-secondary !py-2 text-xs flex items-center gap-1"
                      >
                        <BellRing className="h-3.5 w-3.5" /> Nudge Owner
                      </button>
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "cancelled");
                          closeBookingModal({ ...selectedBookingForModal, status: "cancelled" });
                        }}
                        className="btn-secondary !py-2 text-xs flex items-center gap-1"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel Request
                      </button>
                    </>
                  )}

                  {!isLenderModal && selectedBookingForModal.status === "approved" && (
                    (!selectedBookingForModal.payment || selectedBookingForModal.payment.status !== "paid") && selectedBookingForModal.total_amount > 0 ? (
                      <div className="w-full flex-col items-center">
                        <PayNowButton 
                           borrowRequest={selectedBookingForModal} 
                           onPaid={() => {
                              setSelectedBookingForModal(null);
                              if (typeof loadBookingsList === 'function') loadBookingsList();
                           }} 
                        />
                      </div>
                    ) : !modalIsStarted ? (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Handover unlocks on {new Date(selectedBookingForModal.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" /> Waiting for owner to hand over
                      </span>
                    )
                  )}

                  {!isLenderModal && selectedBookingForModal.status === "handover_requested" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "confirm_handover");
                          closeBookingModal({ ...selectedBookingForModal, status: "active" });
                        }}
                        className="btn-primary !bg-blue-600 hover:!bg-blue-700 !py-2 text-xs flex items-center gap-1 text-white font-bold"
                      >
                        <Check className="h-3.5 w-3.5" /> Confirm Receipt
                      </button>
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "reject_handover");
                          closeBookingModal({ ...selectedBookingForModal, status: "approved" });
                        }}
                        className="btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:border-rose-800 !py-2 text-xs flex items-center gap-1 font-bold"
                      >
                        <X className="h-3.5 w-3.5" /> Not Received
                      </button>
                    </div>
                  )}

                  {!isLenderModal && (selectedBookingForModal.status === "active" || selectedBookingForModal.status === "ongoing" || selectedBookingForModal.status === "late") && (
                    modalIsStarted ? (
                      <button
                        onClick={() => {
                          const bId = selectedBookingForModal.id;
                          setSelectedBookingForModal(null);
                          setReviewingId(bId);
                          setReviewAction("return");
                        }}
                        className="btn-primary !bg-brass-500 hover:!bg-brass-700 !py-2 text-xs flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Return Item
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Return unlocks on {new Date(selectedBookingForModal.requested_start_date).toLocaleDateString()}
                      </span>
                    )
                  )}

                  <button
                    onClick={() => closeBookingModal()}
                    className="btn-secondary !py-2 !px-4 text-xs"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                    window.location.href = `/complaints?borrow_request_id=${req.id}&resource_id=${req.resource_id || ''}&against_user_id=${req.lender_id || req.borrower_id || ''}&category=dispute`;
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmModal
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        {...confirmDialog}
      />
    </div>
  );
}
