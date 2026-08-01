import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../../api/endpoints";

export default function AdminBorrowsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;

    adminApi.listBorrows(params)
      .then(({ data }) => setBorrows(data))
      .catch(() => toast.error("Could not fetch borrows"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Borrow Requests</h1>
        
        <select 
          className="input !w-48 text-sm"
          value={statusFilter}
          onChange={(e) => setSearchParams(e.target.value === "all" ? {} : { status: e.target.value })}
        >
          <option value="all">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="return_requested">Return Requested</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-600">
            <thead className="border-b border-ink-100 bg-ink-50/50 text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Borrower</th>
                <th className="px-6 py-4">Lender</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-400">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-brass-500" />
                  </td>
                </tr>
              ) : borrows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-400 font-medium">
                    No borrow requests found.
                  </td>
                </tr>
              ) : (
                borrows.map((b) => (
                  <tr key={b.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink-900">{b.resource?.title || "Unknown"}</td>
                    <td className="px-6 py-4">{b.borrower?.full_name || "Unknown"}</td>
                    <td className="px-6 py-4">{b.resource?.owner?.full_name || "Unknown"}</td>
                    <td className="px-6 py-4 text-xs">
                      {b.requested_start_date} <br/> to {b.requested_end_date}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                        ${b.status === "completed" ? "bg-forest-50 text-forest-700" :
                          b.status === "active" ? "bg-brass-50 text-brass-700" :
                          b.status === "pending_approval" ? "bg-amber-50 text-amber-700" :
                          b.status === "rejected" || b.status === "cancelled" ? "bg-red-50 text-red-700" :
                          "bg-ink-100 text-ink-700"}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
