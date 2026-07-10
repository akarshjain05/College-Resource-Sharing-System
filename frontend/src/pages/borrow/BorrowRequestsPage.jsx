import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, X, RotateCcw, Ban } from "lucide-react";
import { borrowApi } from "../../api/endpoints";

const STATUS_STYLE = {
  requested: "bg-brass-50 text-brass-700",
  approved: "bg-forest-50 text-forest-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-ink-100 text-ink-500",
  returned: "bg-ink-100 text-ink-700",
  return_requested: "bg-brass-50 text-brass-700",
  damaged: "bg-red-50 text-red-600",
  late: "bg-red-50 text-red-600",
};

function RequestCard({ request, isIncoming, onAction }) {
  return (
    <div className="index-card p-4 pl-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-ink-900">{request.resource.title}</p>
          <p className="text-xs text-ink-500">
            {isIncoming ? `Requested by ${request.borrower.full_name}` : `Owned by ${request.lender.full_name}`}
          </p>
        </div>
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[request.status]}`}>
          {request.status.replace("_", " ")}
        </span>
      </div>

      <p className="mt-2 text-xs text-ink-500">
        {request.requested_start_date} → {request.requested_end_date}
      </p>
      {request.purpose && <p className="mt-1 text-sm text-ink-700">{request.purpose}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {isIncoming && request.status === "requested" && (
          <>
            <button onClick={() => onAction("approve", request.id)} className="btn-primary !py-1.5 !px-3 text-xs">
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button onClick={() => onAction("reject", request.id)} className="btn-secondary !py-1.5 !px-3 text-xs">
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        )}
        {!isIncoming && request.status === "requested" && (
          <button onClick={() => onAction("cancel", request.id)} className="btn-secondary !py-1.5 !px-3 text-xs">
            <Ban className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
        {!isIncoming && request.status === "approved" && (
          <button onClick={() => onAction("return", request.id)} className="btn-brass !py-1.5 !px-3 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Mark as returned
          </button>
        )}
        {!isIncoming && request.status === "return_requested" && (
          <span className="text-xs font-semibold text-brass-700">Return pending confirmation</span>
        )}
        {isIncoming && request.status === "return_requested" && (
          <button onClick={() => onAction("confirm_return", request.id)} className="btn-forest !py-1.5 !px-3 text-xs bg-forest-700 text-white">
            <Check className="h-3.5 w-3.5" /> Confirm Return
          </button>
        )}
      </div>
    </div>
  );
}

export default function BorrowRequestsPage() {
  const [tab, setTab] = useState("my");
  const [myRequests, setMyRequests] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([borrowApi.myRequests(), borrowApi.incoming()])
      .then(([mine, inc]) => {
        setMyRequests(mine.data);
        setIncoming(inc.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (action, id) => {
    try {
      if (action === "approve") await borrowApi.approve(id);
      if (action === "reject") await borrowApi.reject(id, "Not available at this time");
      if (action === "cancel") await borrowApi.cancel(id);
      if (action === "return") await borrowApi.returnItem(id);
      if (action === "confirm_return") await borrowApi.confirmReturn(id);
      toast.success("Updated successfully");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const list = tab === "my" ? myRequests : incoming;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Borrow requests</h1>

      <div className="flex gap-2 border-b border-ink-100">
        {[
          { key: "my", label: "My requests" },
          { key: "incoming", label: "Incoming requests" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-b-2 border-forest-700 text-forest-900" : "text-ink-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">Nothing here yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {list.map((r) => (
            <RequestCard key={r.id} request={r} isIncoming={tab === "incoming"} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
