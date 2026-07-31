import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Users,
  Calendar,
  Clock,
  User,
  Mail,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Star,
  MapPin,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
} from "lucide-react";
import { resourceApi, categoryApi, borrowApi, getImageUrl } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const STATUS_BADGES = {
  requested: { label: "Requested", style: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  approved: { label: "Approved", style: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  active: { label: "Active (Handed Over)", style: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  return_requested: { label: "Return Pending", style: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  returned: { label: "Returned / Completed", style: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  rejected: { label: "Rejected", style: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" },
  cancelled: { label: "Cancelled", style: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
};

function ItemBorrowersSection({ requests, onAction }) {
  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 text-center text-xs text-slate-400">
        <Users className="mx-auto mb-1.5 h-5 w-5 text-slate-300 dark:text-slate-600" />
        No borrow requests or history for this item yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
        Borrowers & Booking Dates ({requests.length})
      </h4>

      <div className="space-y-2.5">
        {requests.map((req) => {
          const badge = STATUS_BADGES[req.status] || { label: req.status, style: "bg-slate-100 text-slate-600" };
          const startDate = req.requested_start_date ? new Date(req.requested_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";
          const endDate = req.requested_end_date ? new Date(req.requested_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";
          const actualReturn = req.actual_return_date ? new Date(req.actual_return_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

          return (
            <div
              key={req.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 space-y-3 text-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Borrower Profile Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 font-bold text-white shadow-xs">
                    {req.borrower?.full_name?.charAt(0).toUpperCase() || "B"}
                  </div>
                  <div>
                    <Link
                      to={`/users/${req.borrower?.id}`}
                      className="font-bold text-slate-850 dark:text-slate-100 hover:underline hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {req.borrower?.full_name || "Borrower"}
                    </Link>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" /> {req.borrower?.email || "No email"}</span>
                      {req.borrower?.trust_score !== undefined && (
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <ShieldCheck className="h-3 w-3" /> Trust: {req.borrower.trust_score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.style}`}>
                  {badge.label}
                </span>
              </div>

              {/* Dates & Purpose Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary-500" /> Borrow Dates Window
                  </span>
                  <p className="font-bold text-slate-850 dark:text-slate-100">
                    {startDate} → {endDate}
                  </p>
                  {actualReturn && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Actual Return: {actualReturn}
                    </p>
                  )}
                </div>

                {req.purpose && (
                  <div className="space-y-1 sm:border-l border-slate-100 dark:border-slate-800 sm:pl-2.5 pt-1 sm:pt-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Stated Purpose
                    </span>
                    <p className="italic text-slate-500 dark:text-slate-400 line-clamp-2">
                      "{req.purpose}"
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Lender */}
              {req.status === "requested" && (
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => onAction("approve", req.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve Request
                  </button>
                  <button
                    onClick={() => onAction("reject", req.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              )}
              {req.status === "approved" && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onAction("handover", req.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5" /> Mark as Handed Over
                  </button>
                </div>
              )}
              {req.status === "return_requested" && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onAction("confirm_return", req.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Confirm Return & Rate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyListingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  const pageSize = 12;

  useEffect(() => {
    categoryApi.list().then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const fetchData = () => {
    if (!user?.id) return;
    setLoading(true);

    if (!search && !categoryId && !condition && !status && !minRating && page === 1) {
      // Use dedicated backend endpoint when default view
      resourceApi
        .getMyListingsWithBorrowers()
        .then(({ data }) => {
          setItems(data || []);
          setTotal(data?.length || 0);

          // Flatten borrowers into incomingRequests format
          const flattened = [];
          (data || []).forEach((item) => {
            (item.borrowers || []).forEach((b) => {
              flattened.push({
                ...b,
                resource: item,
              });
            });
          });
          setIncomingRequests(flattened);
        })
        .catch(() => {
          // Fallback to standard list
          Promise.all([
            resourceApi.list({ owner_id: user.id, page, page_size: pageSize }),
            borrowApi.incoming().catch(() => ({ data: [] })),
          ]).then(([resResp, incomingResp]) => {
            setItems(resResp.data?.items || []);
            setTotal(resResp.data?.total || 0);
            setIncomingRequests(incomingResp.data || []);
          });
        })
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        resourceApi.list({
          search: search || undefined,
          category_id: categoryId || undefined,
          condition: condition || undefined,
          status: status || undefined,
          min_rating: minRating ? Number(minRating) : undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          page,
          page_size: pageSize,
          owner_id: user.id,
        }),
        borrowApi.incoming().catch(() => ({ data: [] })),
      ])
        .then(([resResp, incomingResp]) => {
          setItems(resResp.data?.items || []);
          setTotal(resResp.data?.total || 0);
          setIncomingRequests(incomingResp.data || []);
        })
        .catch((err) => {
          console.error("Failed to load listings:", err);
          toast.error("Failed to load your listings");
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryId, condition, status, minRating, sortBy, sortDir, page, user?.id]);

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleAction = async (action, requestId) => {
    try {
      if (action === "approve") await borrowApi.approve(requestId);
      if (action === "reject") await borrowApi.reject(requestId, "Unavailable right now");
      if (action === "handover") await borrowApi.handover(requestId);
      if (action === "confirm_return") await borrowApi.confirmReturn(requestId, 5, "");

      toast.success("Borrow request updated!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  // Group incoming requests by resource ID
  const requestsByResource = {};
  incomingRequests.forEach((req) => {
    const rId = req.resource?.id;
    if (rId) {
      if (!requestsByResource[rId]) requestsByResource[rId] = [];
      requestsByResource[rId].push(req);
    }
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Listings & Borrowers</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Manage your {total} listed item{total !== 1 ? "s" : ""} and track borrower dates
          </p>
        </div>
        <Link to="/resources/new" className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 w-fit">
          <Plus className="h-4 w-4" />
          List New Resource
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              placeholder="Search listings by title, description..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 sm:w-48"
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-primary-500 sm:w-40"
            value={condition}
            onChange={(e) => {
              setPage(1);
              setCondition(e.target.value);
            }}
          >
            <option value="">Any Condition</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="worn">Worn</option>
          </select>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:w-auto ${
              showFilters || status || minRating
                ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800"
                : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Listing Status</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">Any Status</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Minimum Rating</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                value={minRating}
                onChange={(e) => {
                  setPage(1);
                  setMinRating(e.target.value);
                }}
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Sort Order</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split(":");
                  setPage(1);
                  setSortBy(field);
                  setSortDir(direction);
                }}
              >
                <option value="created_at:desc">Newest Listed</option>
                <option value="created_at:asc">Oldest Listed</option>
                <option value="total_borrows:desc">Most Borrowed</option>
                <option value="average_rating:desc">Highest Rated</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Listing Items Container */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-500">
          No resources match your search. Try adjusting your filters or list a new item.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((r) => {
            const primaryImg = r.images?.find((img) => img.is_primary) || r.images?.[0];
            const itemRequests = requestsByResource[r.id] || [];
            const isExpanded = expandedItems[r.id] ?? true; // Default expanded so details are immediately clear

            return (
              <div
                key={r.id}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between"
              >
                {/* Item Details Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {/* Image Thumbnail */}
                      <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                        {primaryImg && (primaryImg.image_url.startsWith("/") || primaryImg.image_url.startsWith("http") || primaryImg.image_url.startsWith("data:")) ? (
                          <img src={getImageUrl(primaryImg.image_url)} alt={r.title} className="h-full w-full object-cover" />
                        ) : (
                          <span>{primaryImg ? primaryImg.image_url : r.title.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {r.category?.name || "Tools"}
                        </span>
                        <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
                          <Link to={`/resources/${r.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                            {r.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{r.description}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                        r.status === "available"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : r.status === "borrowed"
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <span>Deposit: <strong className="text-primary-600 dark:text-primary-400">₹{r.deposit_amount || 0}</strong></span>
                      <span>Borrows: <strong>{r.total_borrows || 0}</strong></span>
                    </div>
                    {r.pickup_location && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[180px]">
                        <MapPin className="h-3 w-3 flex-shrink-0" /> {r.pickup_location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Collapsible Borrower Details Section */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(r.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      <Users className="h-4 w-4 text-primary-500" />
                      <span>Borrower History & Active Dates ({itemRequests.length})</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <Link
                      to={`/resources/${r.id}`}
                      className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      View Public Page →
                    </Link>
                  </div>

                  {isExpanded && (
                    <ItemBorrowersSection requests={itemRequests} onAction={handleAction} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${
                p === page
                  ? "bg-primary-600 text-white shadow-md shadow-primary-600/10"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
