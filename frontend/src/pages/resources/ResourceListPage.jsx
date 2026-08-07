import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { resourceApi, categoryApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import ResourceCard from "../../components/ResourceCard";

export default function ResourceListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    categoryApi.list().then(({ data }) => setCategories(data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    resourceApi
      .list({
        search: debouncedSearch || undefined,
        category_id: categoryId || undefined,
        condition: condition || undefined,
        status: status || undefined,
        min_rating: minRating ? Number(minRating) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: pageSize,
        ...(user?.id ? { exclude_owner_id: user.id } : {}),
      })
      .then(({ data }) => {
        if (data && data.items) {
          setItems(data.items);
          setTotal(data.total || 0);
        }
      })
      .catch((err) => {
        console.log("Database list call failed", err);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, categoryId, condition, status, minRating, sortBy, sortDir, page, categories]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {!user && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-primary-600 to-indigo-650 text-white p-6 sm:p-8 shadow-xl shadow-primary-500/10">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-block rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              Guest Preview Mode 🚀
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Share & Borrow Campus Resources Instantly
            </h2>
            <p className="text-xs sm:text-sm font-medium text-indigo-100 leading-relaxed max-w-xl">
              Save money and help your community. Explore textbooks, lab coats, calculators, electronics, and more. Sign in to request borrowing or list your own inventory!
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/login"
                className="rounded-xl bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-primary-600 transition-all shadow-sm hover:scale-102 active:scale-98"
              >
                Sign In to Account
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 px-5 py-2.5 text-xs font-bold text-white transition-all hover:scale-102 active:scale-98"
              >
                Create Account
              </Link>
            </div>
          </div>
          {/* Decorative floating shapes */}
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-20 h-48 w-48 rounded-full bg-indigo-500/30 blur-2xl pointer-events-none" />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">All Listings</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{total} items shared in community</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300 dark:text-slate-500" />
            <input
              className="input pl-9"
              placeholder="Search by title, description, or tag..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <select
            className="input sm:w-48"
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
          >
            <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input sm:w-40"
            value={condition}
            onChange={(e) => {
              setPage(1);
              setCondition(e.target.value);
            }}
          >
            <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Any condition</option>
            <option value="new" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">New</option>
            <option value="good" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Good</option>
            <option value="fair" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Fair</option>
            <option value="worn" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Worn</option>
          </select>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn gap-2 sm:w-auto ${showFilters || status || minRating
                ? "bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-800"
                : "bg-white dark:bg-slate-900 text-ink-500 dark:text-slate-300 border border-ink-100 dark:border-slate-800 hover:bg-ink-50 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {(status || minRating) && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                {[status, minRating].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Advanced Filters & Sorting Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-ink-100/60 dark:border-slate-800 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Any status</option>
                <option value="available" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Available</option>
                <option value="borrowed" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Borrowed</option>
                <option value="unavailable" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Unavailable</option>
                <option value="pending_approval" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Pending Approval</option>
              </select>
            </div>

            <div>
              <label className="label">Minimum Rating</label>
              <select
                className="input"
                value={minRating}
                onChange={(e) => {
                  setPage(1);
                  setMinRating(e.target.value);
                }}
              >
                <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Any rating</option>
                <option value="4.5" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">4.5+ Stars</option>
                <option value="4.0" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">4.0+ Stars</option>
                <option value="3.0" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">3.0+ Stars</option>
                <option value="2.0" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">2.0+ Stars</option>
              </select>
            </div>

            <div>
              <label className="label">Sort By</label>
              <select
                className="input"
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split(":");
                  setPage(1);
                  setSortBy(field);
                  setSortDir(direction);
                }}
              >
                <option value="created_at:desc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Newest Listed</option>
                <option value="created_at:asc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Oldest Listed</option>
                <option value="average_rating:desc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Highest Rated</option>
                <option value="total_borrows:desc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Most Popular</option>
                <option value="title:asc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Title (A-Z)</option>
                <option value="title:desc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">Title (Z-A)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-xs text-slate-400">
          No resources match your search. Try a different filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-8 w-8 rounded-md text-sm font-semibold ${p === page ? "bg-primary-600 text-white" : "bg-white dark:bg-slate-900 text-ink-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-ink-50 dark:hover:bg-slate-800 dark:hover:text-white"
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

