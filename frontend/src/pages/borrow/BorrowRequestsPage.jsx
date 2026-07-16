import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X, RotateCcw, Ban } from "lucide-react";
import { borrowApi } from "../../api/endpoints";

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

function RequestCard({ request, isIncoming, onAction }) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [actionType, setActionType] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(request.requested_end_date);
  end.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  const handleActionClick = (action) => {
    if (action === "return" || action === "confirm_return") {
      setActionType(action);
      setShowRating(true);
    } else {
      onAction(action, request.id);
    }
  };

  const submitRatingAction = () => {
    // Pass the rating and review up via onAction
    onAction(actionType, request.id, rating, review);
    setShowRating(false);
  };

  return (
    <div className="index-card p-4 pl-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-ink-900">{request.resource.title}</p>
          <p className="text-xs text-ink-500">
            {isIncoming ? (
              <>Requested by <Link to={`/users/${request.borrower.id}`} className="hover:underline text-ink-900 font-medium">{request.borrower.full_name}</Link></>
            ) : (
              <>Owned by <Link to={`/users/${request.lender.id}`} className="hover:underline text-ink-900 font-medium">{request.lender.full_name}</Link></>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[request.status]}`}>
            {request.status.replace("_", " ")}
          </span>
          {(request.status === "active" || request.status === "late") && (
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              daysRemaining < 0 || request.status === "late" ? "bg-red-100 text-red-700" :
              daysRemaining === 0 ? "bg-orange-100 text-orange-700" :
              daysRemaining <= 2 ? "bg-yellow-100 text-yellow-700" : "hidden"
            }`}>
              {daysRemaining < 0 || request.status === "late" ? `Overdue by ${Math.abs(daysRemaining)} day(s)` :
               daysRemaining === 0 ? "Due today" :
               `${daysRemaining} days remaining`}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-500">
        {request.requested_start_date} → {request.requested_end_date}
      </p>
      {request.purpose && <p className="mt-1 text-sm text-ink-700">{request.purpose}</p>}

      {showRating ? (
        <div className="mt-3 rounded bg-ink-50 p-3">
          <p className="text-xs font-semibold text-ink-900 mb-2">
            {actionType === "return" ? "Rate the lender & item:" : "Rate the borrower:"}
          </p>
          <div className="flex flex-col gap-2 mb-3">
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="input !w-24 text-xs !py-1">
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
            <textarea
              className="input text-xs"
              placeholder="Leave a written review (optional)"
              rows={2}
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={submitRatingAction} className="btn-primary !py-1 !px-3 text-xs">
              Submit
            </button>
            <button onClick={() => setShowRating(false)} className="btn-secondary !py-1 !px-3 text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {isIncoming && request.status === "requested" && (
            <>
              <button onClick={() => handleActionClick("approve")} className="btn-primary !py-1.5 !px-3 text-xs">
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => handleActionClick("reject")} className="btn-secondary !py-1.5 !px-3 text-xs">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {!isIncoming && request.status === "requested" && (
            <button onClick={() => handleActionClick("cancel")} className="btn-secondary !py-1.5 !px-3 text-xs">
              <Ban className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
          {!isIncoming && request.status === "approved" && (
            <span className="text-xs font-semibold text-brass-700">Waiting for owner to hand over</span>
          )}
          {isIncoming && request.status === "approved" && (
            <button onClick={() => handleActionClick("handover")} className="btn-primary !py-1.5 !px-3 text-xs">
              <Check className="h-3.5 w-3.5" /> Mark as Handed Over
            </button>
          )}
          {!isIncoming && request.status === "active" && (
            <button onClick={() => handleActionClick("return")} className="btn-brass !py-1.5 !px-3 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Return Resource
            </button>
          )}
          {!isIncoming && ["active", "returned", "damaged", "late"].includes(request.status) && (
            <a href={`/complaints?borrow_request_id=${request.id}`} className="btn-secondary !py-1.5 !px-3 text-xs text-red-600">
              File Complaint
            </a>
          )}
          {!isIncoming && request.status === "return_requested" && (
            <span className="text-xs font-semibold text-brass-700">Return pending confirmation</span>
          )}
          {isIncoming && request.status === "return_requested" && (
            <button onClick={() => handleActionClick("confirm_return")} className="btn-primary !py-1.5 !px-3 text-xs">
              <Check className="h-3.5 w-3.5" /> Confirm Return
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BorrowRequestsPage() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [tab, setTab] = useState("my");
  const [myRequests, setMyRequests] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([borrowApi.myRequests(statusFilter), borrowApi.incoming(statusFilter)])
      .then(([mine, inc]) => {
        setMyRequests(mine.data);
        setIncoming(inc.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (action, id, rating, review) => {
    try {
      if (action === "approve") await borrowApi.approve(id);
      if (action === "reject") await borrowApi.reject(id, "Not available right now");
      if (action === "handover") await borrowApi.handover(id);
      if (action === "cancel") await borrowApi.cancel(id);
      if (action === "return") await borrowApi.returnItem(id, null, rating, review);
      if (action === "confirm_return") await borrowApi.confirmReturn(id, rating, review);
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

      <div className="flex gap-2 border-b border-ink-100 items-center">
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
        {statusFilter && (
          <div className="ml-auto text-sm text-ink-500">
            Filtered by: <span className="font-semibold capitalize text-ink-900">{statusFilter}</span>
            <a href="/borrow-requests" className="ml-3 text-red-500 hover:underline">
              Clear filter
            </a>
          </div>
        )}
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
