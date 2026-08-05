import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Check, Trash2, X, ChevronDown, ChevronUp, Users, Tag, ArrowRight, CheckCircle2, Clock, Edit } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { wantedApi, categoryApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";



function NeedDetailsModal({ request, offers, onClose, onAcceptOffer, onCancelOffer, onDelete, onEdit, acceptingId }) {
  if (!request) return null;

  // Deduplicate offers by offerer ID + resource title/id
  const uniqueOffersMap = new Map();
  (offers || []).forEach((offer) => {
    const offererKey = offer.offerer?.id || offer.offerer_id || offer.offerer?.full_name;
    const resourceKey = offer.resource?.id || offer.resource_id || offer.resource?.title;
    const key = `${offererKey}_${resourceKey}`;
    if (!uniqueOffersMap.has(key) || offer.status === "ACCEPTED") {
      uniqueOffersMap.set(key, offer);
    }
  });
  const displayOffers = Array.from(uniqueOffersMap.values());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 pr-8">
          <div>
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {request.category?.name || "Need Request"}
            </span>
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">{request.title}</h2>
          </div>
          <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            request.is_fulfilled ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
          }`}>
            {request.is_fulfilled ? "Fulfilled" : "Active Need"}
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {request.description || "No description provided."}
          </p>
        </div>

        {/* Received Offers */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary-500" /> Received Offers ({displayOffers.length})
          </h4>

          {displayOffers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
              No offers received from community members yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayOffers.map((offer) => {
                const isOfferAccepted = offer.status === "ACCEPTED";
                const isAcceptingThis = acceptingId === offer.id;

                return (
                  <div key={offer.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{offer.offerer?.full_name || "Community Member"}</p>
                      <Link to={`/resources/${offer.resource_id}`} className="text-primary-600 dark:text-primary-400 font-bold hover:underline">
                        Item Offered: {offer.resource?.title || "Resource"}
                      </Link>
                      {offer.resource && (
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                            Deposit: ₹{offer.resource.deposit_amount}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md capitalize">
                            Cond: {offer.resource.condition}
                          </span>
                        </div>
                      )}
                    </div>

                    {isOfferAccepted ? (
                      <span className="flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                      </span>
                    ) : request.is_fulfilled ? (
                      <span className="rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1.5 text-xs font-bold">
                        Fulfilled
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={Boolean(acceptingId)}
                          onClick={() => onAcceptOffer(offer.id, offer.resource_id, request)}
                          className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isAcceptingThis ? "Accepting..." : "Accept Offer"}
                        </button>
                        {onCancelOffer && (
                          <button
                            onClick={() => onCancelOffer(offer.id)}
                            className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 text-xs font-bold transition-all"
                            title="Decline Offer"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onEdit(request)}
              className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 font-bold hover:underline"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(request.id)}
              className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>

          <button onClick={onClose} className="btn-secondary !py-2 !px-4 text-xs">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

function EditWantedModal({ request, categories, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: request.title,
    description: request.description || "",
    category_id: request.category_id || request.category?.id || "",
    start_date: request.start_date || "",
    end_date: request.end_date || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onUpdate(request.id, formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">Edit Need</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">What are you looking for?</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Category</label>
              <select
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Needed From</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Needed Until</label>
              <input
                type="date"
                required
                min={formData.start_date}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none min-h-[90px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-xs font-bold shadow-sm">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyNeedsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [formData, setFormData] = useState({ title: "", description: "", category_id: "", start_date: today, end_date: tomorrow });
  
  const [selectedNeedForModal, setSelectedNeedForModal] = useState(null);
  const [editingNeed, setEditingNeed] = useState(null);
  const [modalOffers, setModalOffers] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      wantedApi.myNeeds(), 
      categoryApi.list(),
    ])
      .then(async ([reqRes, catRes]) => {
        const reqs = reqRes.data || [];
        setRequests(reqs);
        setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.items || []));

        const targetId = searchParams.get("id");
        if (targetId) {
          const foundReq = reqs.find(r => String(r.id) === targetId);
          if (foundReq) {
            setSelectedNeedForModal(foundReq);
            try {
              const res = await wantedApi.listOffers(foundReq.id);
              setModalOffers(res.data || []);
            } catch (err) {
              setModalOffers([]);
            }
          }
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("id");
          setSearchParams(newParams, { replace: true });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();

    const handleWantedCreated = () => {
      loadData();
    };

    window.addEventListener("wantedCreated", handleWantedCreated);
    return () => {
      window.removeEventListener("wantedCreated", handleWantedCreated);
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await wantedApi.create(formData);
      toast.success("Wanted request posted!");
      setShowModal(false);
      setFormData({ title: "", description: "", category_id: "", start_date: today, end_date: tomorrow });
      window.dispatchEvent(new Event("wantedCreated"));
      navigate("/wanted");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to post request");
    }
  };

  const handleToggleFulfill = async (id, currentFulfilled, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const newFulfilled = !currentFulfilled;
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_fulfilled: newFulfilled } : r))
    );
    if (selectedNeedForModal?.id === id) {
      setSelectedNeedForModal((prev) => ({ ...prev, is_fulfilled: newFulfilled }));
    }

    try {
      await wantedApi.fulfill(id);
      toast.success(newFulfilled ? "Marked as fulfilled!" : "Marked as active!");
    } catch (err) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_fulfilled: currentFulfilled } : r))
      );
      if (selectedNeedForModal?.id === id) {
        setSelectedNeedForModal((prev) => ({ ...prev, is_fulfilled: currentFulfilled }));
      }
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      title: "Delete Request",
      message: "Are you sure you want to delete this request?",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await wantedApi.delete(id);
          toast.success("Request deleted");
          if (selectedNeedForModal?.id === id) setSelectedNeedForModal(null);
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.detail || "Action failed");
        }
      }
    });
  };

  const handleUpdateNeed = async (id, updatedData) => {
    try {
      await wantedApi.update(id, updatedData);
      toast.success("Request updated!");
      setEditingNeed(null);
      if (selectedNeedForModal?.id === id) {
        setSelectedNeedForModal((prev) => ({ ...prev, ...updatedData }));
      }
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update request");
    }
  };

  const openDetailsModal = async (request) => {
    setSelectedNeedForModal(request);
    try {
      const res = await wantedApi.listOffers(request.id);
      setModalOffers(res.data || []);
    } catch (err) {
      setModalOffers([]);
    }
  };

  const acceptOffer = async (offerId, resourceId, request) => {
    if (request?.is_fulfilled) {
      toast.error("This request has already been fulfilled");
      return;
    }

    setAcceptingId(offerId);
    try {
      await wantedApi.acceptOffer(offerId);
      toast.success("Offer accepted! Redirecting to item...");
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, is_fulfilled: true } : r))
      );
      setSelectedNeedForModal(null);
      navigate("/borrow-requests?tab=borrowing&section=upcoming");
    } catch (err) {
      toast.error(err.response?.data?.detail || "This request has already been fulfilled");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCancelOffer = async (offerId) => {
    setConfirmDialog({
      title: "Decline Offer",
      message: "Are you sure you want to decline this offer?",
      confirmText: "Decline",
      isDanger: true,
      onConfirm: async () => {
        try {
          await wantedApi.cancelOffer(offerId);
          toast.success("Offer declined");
          setModalOffers((prev) => prev.filter((o) => o.id !== offerId));
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to decline offer");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Needs</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Manage your posted campus requests and view incoming offers</p>
        </div>  

      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-400">
          You haven't posted any campus needs yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {requests.map((r) => {
            return (
              <div
                key={r.id}
                onClick={() => openDetailsModal(r)}
                className={`group cursor-pointer rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 transition-all hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg flex flex-col justify-between ${
                  r.is_fulfilled ? "opacity-75" : ""
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {r.title}
                    </h3>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <Clock className="h-3.5 w-3.5" />
                        {r.start_date ? new Date(r.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Any time"} - {r.end_date ? new Date(r.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Any time"}
                      </div>
                      {r.is_fulfilled && (
                        <span className="shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          Fulfilled
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {r.description || "No description provided."}
                  </p>
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs">
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {r.category?.name}
                  </span>
                  
                  <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 group-hover:underline flex items-center gap-0.5">
                    View Offers & Details <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Need Details Modal */}
      {selectedNeedForModal && (
        <NeedDetailsModal
          request={selectedNeedForModal}
          offers={modalOffers}
          acceptingId={acceptingId}
          onClose={() => setSelectedNeedForModal(null)}
          onAcceptOffer={acceptOffer}
          onCancelOffer={handleCancelOffer}
          onDelete={handleDelete}
          onEdit={(req) => setEditingNeed(req)}
        />
      )}

      {/* Edit Need Modal */}
      {editingNeed && (
        <EditWantedModal
          request={editingNeed}
          categories={categories}
          onClose={() => setEditingNeed(null)}
          onUpdate={handleUpdateNeed}
        />
      )}

      {/* Post Need Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">Post Campus Need</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">What are you looking for?</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                  placeholder="e.g., Graphing Calculator"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Needed From</label>
                  <input
                    type="date"
                    required
                    min={today}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Needed Until</label>
                  <input
                    type="date"
                    required
                    min={formData.start_date || today}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none min-h-[90px]"
                  placeholder="Any specific details, timeline, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-xs font-bold shadow-sm">Post Request</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        {...confirmDialog}
      />
    </div>
  );
}
