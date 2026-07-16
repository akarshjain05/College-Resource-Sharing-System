import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X, RotateCcw, Ban, Calendar, User, ShieldAlert, Star } from "lucide-react";
import { borrowApi } from "../../api/endpoints";

// Initial high-fidelity mockup bookings to display if none exist
const DEFAULT_MOCK_BOOKINGS = [
  {
    id: "mock-b-1",
    resource: {
      id: "mock-ladder-1",
      title: "Aluminium Ladder (7 Step)",
      image_placeholder: "🪜",
    },
    requested_start_date: "2026-09-15",
    requested_end_date: "2026-09-17",
    total_amount: 770,
    status: "requested", // Requested status (orange badge)
    lender: { full_name: "Rahul Sharma" },
    borrower: { full_name: "You" },
  },
  {
    id: "mock-b-2",
    resource: {
      id: "mock-drill-1",
      title: "Bosch Drill Machine",
      image_placeholder: "🔌",
    },
    requested_start_date: "2026-09-22",
    requested_end_date: "2026-09-23",
    total_amount: 650,
    status: "approved", // Approved status (green badge)
    lender: { full_name: "Arjun Patel" },
    borrower: { full_name: "You" },
  },
  {
    id: "mock-b-3",
    resource: {
      id: "mock-cooler-1",
      title: "Cooler - Symphony",
      image_placeholder: "❄️",
    },
    requested_start_date: "2026-09-26",
    requested_end_date: "2026-09-28",
    total_amount: 760,
    status: "pending", // Pending status (yellow badge)
    lender: { full_name: "Neha Iyer" },
    borrower: { full_name: "You" },
  },
  {
    id: "mock-b-4",
    resource: {
      id: "mock-racket-1",
      title: "Yonex Badminton Racket",
      image_placeholder: "🏸",
    },
    requested_start_date: "2026-07-01",
    requested_end_date: "2026-07-03",
    total_amount: 280,
    status: "returned", // Completed status (gray badge)
    lender: { full_name: "Suresh Kumar" },
    borrower: { full_name: "You" },
  }
];

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
    
    // Fetch actual API requests if backend works
    Promise.all([
      borrowApi.myRequests().catch(() => ({ data: [] })),
      borrowApi.incoming().catch(() => ({ data: [] }))
    ])
      .then(([myReqsResp, incomingReqsResp]) => {
        // Load custom requests from localStorage
        const stored = JSON.parse(localStorage.getItem("share_neighbour_bookings"));
        if (!stored) {
          localStorage.setItem("share_neighbour_bookings", JSON.stringify(DEFAULT_MOCK_BOOKINGS));
        }
        
        const local = JSON.parse(localStorage.getItem("share_neighbour_bookings") || "[]");
        
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
          total_amount: r.deposit_amount + 100, // mock total
          status: r.status,
          lender: { full_name: r.lender.full_name },
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
          total_amount: r.deposit_amount + 100,
          status: r.status,
          lender: { full_name: "You" },
          borrower: { full_name: r.borrower.full_name },
        }));

        // Combine
        const allBorrows = [...dbMyReqs, ...local.filter(x => x.borrower?.full_name === "You")];
        const allLends = [...dbIncomingReqs, ...local.filter(x => x.lender?.full_name === "You" || x.borrower?.full_name !== "You")];
        
        // Remove duplicates
        const uniqueBorrows = allBorrows.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        const uniqueLends = allLends.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        setBookings({
          borrowing: uniqueBorrows,
          lending: uniqueLends
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookingsList();
  }, []);

  const handleStatusChange = (bookingId, newStatus) => {
    // 1. Update localStorage list
    const local = JSON.parse(localStorage.getItem("share_neighbour_bookings") || "[]");
    const idx = local.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      local[idx].status = newStatus;
      localStorage.setItem("share_neighbour_bookings", JSON.stringify(local));
    }

    // 2. Trigger actual backend action if database booking ID
    if (!bookingId.toString().startsWith("mock-")) {
      try {
        if (newStatus === "approved") borrowApi.approve(bookingId);
        if (newStatus === "rejected") borrowApi.reject(bookingId, "Unavailable");
        if (newStatus === "active") borrowApi.handover(bookingId);
        if (newStatus === "cancelled") borrowApi.cancel(bookingId);
        if (newStatus === "returned") borrowApi.confirmReturn(bookingId, 5);
      } catch (err) {
        console.log("Offline backend trigger error:", err);
      }
    }

    // 3. Add visual notification logs
    const activeBooking = bookings[tab].find(b => b.id === bookingId);
    if (activeBooking) {
      const savedNotifs = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
      savedNotifs.unshift({
        id: "notif-" + Date.now(),
        title: `Booking status updated`,
        message: `Your booking for ${activeBooking.resource.title} is now ${newStatus.toUpperCase()}.`,
        created_at: new Date().toISOString(),
        is_read: false,
        type: newStatus === "approved" ? "check" : "calendar",
      });
      localStorage.setItem("share_neighbour_notifs", JSON.stringify(savedNotifs));
    }

    toast.success(`Booking status updated to ${newStatus}`);
    loadBookingsList();
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
