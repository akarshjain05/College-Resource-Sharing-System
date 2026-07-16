import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, ArrowLeftRight, Star, TrendingUp } from "lucide-react";
import { resourceApi, borrowApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import ResourceCard from "../components/ResourceCard";
import StatCard from "../components/StatCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      resourceApi.list({ sort_by: "created_at", sort_dir: "desc", page_size: 6, ...(user?.id ? { exclude_owner_id: user.id } : {}) }),
      borrowApi.myRequests(),
    ])
      .then(([resResp, reqResp]) => {
        setRecent(resResp.data.items);
        setMyRequests(reqResp.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeBorrows = myRequests.filter((r) => r.status === "active").length;
  const pendingRequests = myRequests.filter((r) => r.status === "requested").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Your campus, shared.</h1>
        <p className="mt-1 text-sm text-ink-500">
          Sharing score: <span className="font-semibold text-forest-700">{user?.sharing_score ?? 0}</span> — every
          borrow returned on time raises it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Borrows" value={activeBorrows} icon={ArrowLeftRight} accent="forest" to="/borrow-requests?status=active" />
        <StatCard label="Pending Requests" value={pendingRequests} icon={PackageSearch} accent="brass" to="/borrow-requests?status=requested" />
        <StatCard label="Trust Score" value={user?.trust_score ?? 100} icon={Star} accent="ink" />
        <StatCard label="Sharing Score" value={user?.sharing_score ?? 0} icon={TrendingUp} accent="forest" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Recently added on campus</h2>
          <Link to="/resources" className="text-sm font-semibold text-forest-700 hover:underline">
            Browse all
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-ink-100" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-500">
            No resources have been shared yet. Be the first to list one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
