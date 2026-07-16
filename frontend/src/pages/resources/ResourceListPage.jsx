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

  const loadMockData = () => {
    const savedMocksStr = localStorage.getItem("share_neighbour_mocks");
    let allMocks = [];
    if (savedMocksStr) {
      const mocksObj = JSON.parse(savedMocksStr);
      Object.values(mocksObj).forEach((arr) => allMocks.push(...arr));
    } else {
      allMocks = [
        {
          id: "mock-ladder-1",
          title: "Aluminium Ladder (7 Step)",
          category: "Tools",
          daily_price: 90,
          deposit_amount: 500,
          average_rating: 4.7,
          reviews_count: 15,
          distance: "0.3 km",
          owner: "Rahul Sharma",
          image_placeholder: "🪜",
          description: "Sturdy 7 step aluminium ladder. Perfect for home painting, bulb changing, etc. Well maintained.",
          condition: "good",
          status: "available",
        },
        {
          id: "mock-drill-1",
          title: "Bosch Drill Machine",
          category: "Tools",
          daily_price: 150,
          deposit_amount: 500,
          average_rating: 4.8,
          reviews_count: 23,
          distance: "0.5 km",
          owner: "Amit Patel",
          image_placeholder: "🔌",
          description: "Powerful drill machine. Used only a few times. Comes with standard bits.",
          condition: "new",
          status: "available",
        },
        {
          id: "mock-cooler-1",
          title: "Cooler - Symphony",
          category: "Party",
          daily_price: 120,
          deposit_amount: 600,
          average_rating: 4.5,
          reviews_count: 8,
          distance: "0.8 km",
          owner: "Neha Iyer",
          image_placeholder: "❄️",
          description: "Large desert cooler for parties and events. Blows super cold air. Quiet operation.",
          condition: "good",
          status: "available",
        },
        {
          id: "mock-mixer-1",
          title: "Mixer Grinder (Prestige)",
          category: "Kitchen",
          daily_price: 80,
          deposit_amount: 300,
          average_rating: 4.4,
          reviews_count: 5,
          distance: "0.4 km",
          owner: "Vikram Rao",
          image_placeholder: "🌪️",
          description: "Prestige 750W mixer grinder. Perfect for making batters, chutneys, and shakes.",
          condition: "good",
          status: "available",
        },
        {
          id: "mock-racket-1",
          title: "Yonex Badminton Racket",
          category: "Sports",
          daily_price: 40,
          deposit_amount: 200,
          average_rating: 4.9,
          reviews_count: 12,
          distance: "0.2 km",
          owner: "Suresh Kumar",
          image_placeholder: "🏸",
          description: "Lightweight Yonex Carbonex racket. Newly strung, comes with dynamic cover.",
          condition: "new",
          status: "available",
        },
        {
          id: "mock-tent-1",
          title: "4-Person Camping Tent",
          category: "Camping",
          daily_price: 250,
          deposit_amount: 800,
          average_rating: 4.6,
          reviews_count: 18,
          distance: "1.1 km",
          owner: "Rohit Singh",
          image_placeholder: "⛺",
          description: "Waterproof Quechua double dome tent. Pitch in 5 minutes. Includes sleeping mats.",
          condition: "good",
          status: "available",
        },
      ];
    }

    const adapted = allMocks.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      condition: m.condition.toLowerCase(),
      status: m.status ? m.status.toLowerCase() : "available",
      deposit_amount: m.deposit_amount || m.daily_price * 4,
      daily_price: m.daily_price || 100,
      average_rating: m.average_rating || 5.0,
      total_borrows: m.reviews_count || 0,
      pickup_location: m.distance ? `${m.distance} away` : "Nearby",
      category: typeof m.category === "string" ? { id: "cat-1", name: m.category } : m.category,
      owner: typeof m.owner === "string" ? { id: "owner-1", full_name: m.owner } : m.owner,
      images: m.image_placeholder ? [{ id: "img-1", image_url: m.image_placeholder }] : [],
    }));

    const filtered = adapted.filter(item => {
      const matchCat = categoryId ? item.category?.id === categoryId || item.category?.name.toLowerCase() === categories.find(c => c.id === categoryId)?.name.toLowerCase() : true;
      const matchCond = condition ? item.condition === condition : true;
      const matchStatus = status ? item.status === status : true;
      const matchRating = minRating ? item.average_rating >= Number(minRating) : true;
      const matchSearch = search ? item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()) : true;
      return matchCat && matchCond && matchStatus && matchRating && matchSearch;
    });

    filtered.sort((a, b) => {
      if (sortBy === "average_rating") {
        return sortDir === "desc" ? b.average_rating - a.average_rating : a.average_rating - b.average_rating;
      }
      if (sortBy === "total_borrows") {
        return sortDir === "desc" ? b.total_borrows - a.total_borrows : a.total_borrows - b.total_borrows;
      }
      if (sortBy === "title") {
        return sortDir === "desc" ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
      }
      return 0;
    });

    setItems(filtered.slice((page - 1) * pageSize, page * pageSize));
    setTotal(filtered.length);
  };

  useEffect(() => {
    setLoading(true);
    resourceApi
      .list({
        search: search || undefined,
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
        if (data && data.items && data.items.length > 0) {
          setItems(data.items);
          setTotal(data.total);
        } else {
          loadMockData();
        }
      })
      .catch((err) => {
        console.log("Database list call failed, loading local mocks.", err);
        loadMockData();
      })
      .finally(() => setLoading(false));
  }, [search, categoryId, condition, status, minRating, sortBy, sortDir, page, categories]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">All Listings</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{total} items shared in community</p>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
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
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
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
            <option value="">Any condition</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="worn">Worn</option>
          </select>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn gap-2 sm:w-auto ${
              showFilters || status || minRating
                ? "bg-primary-50 text-primary-700 border border-primary-300"
                : "bg-white text-ink-500 border border-ink-100 hover:bg-ink-50"
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
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-ink-100/60 sm:grid-cols-2 md:grid-cols-3">
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
                <option value="">Any status</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="unavailable">Unavailable</option>
                <option value="pending_approval">Pending Approval</option>
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
                <option value="">Any rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
                <option value="2.0">2.0+ Stars</option>
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
                <option value="created_at:desc">Newest Listed</option>
                <option value="created_at:asc">Oldest Listed</option>
                <option value="average_rating:desc">Highest Rated</option>
                <option value="total_borrows:desc">Most Popular</option>
                <option value="title:asc">Title (A-Z)</option>
                <option value="title:desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
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
              className={`h-8 w-8 rounded-md text-sm font-semibold ${
                p === page ? "bg-primary-600 text-white" : "bg-white text-ink-500 hover:bg-ink-50"
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

