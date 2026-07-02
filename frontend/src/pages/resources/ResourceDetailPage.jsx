import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Star, MapPin, Package, Shield } from "lucide-react";
import { resourceApi, borrowApi, reviewApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

export default function ResourceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([resourceApi.get(id), reviewApi.listForResource(id)])
      .then(([resResp, revResp]) => {
        setResource(resResp.data);
        setReviews(revResp.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBorrowRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await borrowApi.create({
        resource_id: id,
        requested_start_date: startDate,
        requested_end_date: endDate,
        purpose,
      });
      toast.success("Borrow request sent to the owner!");
      navigate("/borrow-requests");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !resource) {
    return <div className="h-96 animate-pulse rounded-lg bg-ink-100" />;
  }

  const isOwner = resource.owner.id === user?.id;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {resource.images?.length > 0 ? (
          <img src={resource.images[0].image_url} alt={resource.title} className="h-80 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-80 w-full items-center justify-center rounded-lg bg-ink-50 font-display text-5xl text-ink-300">
            {resource.title.charAt(0)}
          </div>
        )}

        <div>
          <span className="rounded bg-ink-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            {resource.category.name}
          </span>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">{resource.title}</h1>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{resource.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card p-3 text-center">
            <Star className="mx-auto mb-1 h-4 w-4 fill-brass-500 text-brass-500" />
            <p className="text-sm font-semibold text-ink-900">{Number(resource.average_rating).toFixed(1)}</p>
            <p className="text-xs text-ink-500">Rating</p>
          </div>
          <div className="card p-3 text-center">
            <Package className="mx-auto mb-1 h-4 w-4 text-forest-700" />
            <p className="text-sm font-semibold text-ink-900">{resource.quantity_available}</p>
            <p className="text-xs text-ink-500">Available</p>
          </div>
          <div className="card p-3 text-center">
            <Shield className="mx-auto mb-1 h-4 w-4 text-forest-700" />
            <p className="text-sm font-semibold capitalize text-ink-900">{resource.condition}</p>
            <p className="text-xs text-ink-500">Condition</p>
          </div>
          <div className="card p-3 text-center">
            <MapPin className="mx-auto mb-1 h-4 w-4 text-forest-700" />
            <p className="truncate text-sm font-semibold text-ink-900">{resource.pickup_location || "—"}</p>
            <p className="text-xs text-ink-500">Pickup</p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-ink-500">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-900">{r.reviewer.full_name}</p>
                    <span className="flex items-center gap-1 text-xs text-brass-700">
                      <Star className="h-3.5 w-3.5 fill-brass-500 text-brass-500" /> {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-ink-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Shared by</p>
          <p className="mt-1 font-display text-base font-semibold text-ink-900">{resource.owner.full_name}</p>
          <p className="text-sm text-ink-500">{resource.owner.department || "Campus member"}</p>
        </div>

        {!isOwner && resource.status === "available" && (
          <form onSubmit={handleBorrowRequest} className="card space-y-3 p-5">
            <h3 className="font-display text-base font-semibold text-ink-900">Request to borrow</h3>
            <div>
              <label className="label">From</label>
              <input required type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Until</label>
              <input required type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Purpose (optional)</label>
              <textarea rows={3} className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <button type="submit" disabled={submitting} className="btn-brass w-full">
              {submitting ? "Sending..." : "Send borrow request"}
            </button>
          </form>
        )}

        {isOwner && (
          <div className="card p-5 text-sm text-ink-500">This is your own resource listing.</div>
        )}
      </div>
    </div>
  );
}
