import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Package, ArrowLeftRight, Clock } from "lucide-react";
import { adminApi } from "../../api/endpoints";
import StatCard from "../../components/StatCard";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [contributorData, setContributorData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.overview(),
      adminApi.mostBorrowedCategories(),
      adminApi.topContributors(),
    ])
      .then(([ov, cat, contrib]) => {
        setOverview(ov.data);
        setCategoryData(cat.data);
        setContributorData(contrib.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !overview) {
    return <div className="h-96 animate-pulse rounded-lg bg-ink-100" />;
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Admin overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Users" value={overview.total_users} icon={Users} accent="forest" />
        <StatCard label="Total Resources" value={overview.total_resources} icon={Package} accent="brass" />
        <StatCard label="Total Borrows" value={overview.total_borrows} icon={ArrowLeftRight} accent="ink" />
        <StatCard label="Pending Requests" value={overview.pending_requests} icon={Clock} accent="brass" />
        <StatCard label="Active Borrows" value={overview.active_borrows} icon={ArrowLeftRight} accent="forest" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-ink-900">Most borrowed categories</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E9EE" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="borrow_count" fill="#1F4B3F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-ink-900">Top contributors</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={contributorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E9EE" />
              <XAxis dataKey="user" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="resource_count" fill="#C08A2E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
