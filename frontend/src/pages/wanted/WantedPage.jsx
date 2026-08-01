import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Check, Trash2, X, ChevronDown, ChevronUp, User, Tag, HelpCircle, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { wantedApi, categoryApi, resourceApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

function NeedDetailsModal({ request, onClose, onOpenOffer }) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-extrabold flex-shrink-0">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {request.category?.name || "Campus Need"}
            </span>
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">{request.title}</h2>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {request.description || "No description provided."}
          </p>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center font-extrabold text-white">
              {request.user?.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <Link to={`/users/${request.user?.id}`} className="font-bold text-slate-900 dark:text-white hover:underline">
                Requested by {request.user?.full_name}
              </Link>
              <p className="text-[10px] text-amber-500 font-bold">⭐ Trust Score: {request.user?.trust_score || 100}</p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenOffer(request);
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            I Have This →
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-secondary !py-2 !px-4 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WantedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category_id: "" });

  const [selectedNeedForModal, setSelectedNeedForModal] = useState(null);
  const [offerModalData, setOfferModalData] = useState(null);
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [offerMode, setOfferMode] = useState("existing");
  const [newOfferForm, setNewOfferForm] = useState({
    title: "",
    description: "",
    condition: "good",
    deposit_amount: 0,
    max_borrow_days: 7,
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      wantedApi.list(),
      categoryApi.list(),
      user ? resourceApi.list({ owner_id: user.id }) : Promise.resolve({ data: [] })
    ])
      .then(([reqRes, catRes, resRes]) => {
        setRequests(reqRes.data || []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.items || []));
        if (user) {
          setMyResources((resRes.data?.items || resRes.data || []).filter(r => r.owner_id === user.id));
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
      setFormData({ title: "", description: "", category_id: "" });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to post request");
    }
  };

  const openOfferModal = (request) => {
    setOfferModalData(request);
    setSelectedResourceId("");
    setOfferMode(myResources.length === 0 ? "new" : "existing");
    setNewOfferForm({
      title: request.title,
      description: "Available for borrowing.",
      condition: "good",
      deposit_amount: 0,
      max_borrow_days: 7,
    });
  };

  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offeredWantedIds, setOfferedWantedIds] = useState(new Set());

  const submitOffer = async () => {
    if (submittingOffer) return;
    setSubmittingOffer(true);
    try {
      let resourceIdToOffer = selectedResourceId;

      if (offerMode === "new") {
        if (!newOfferForm.title) {
          setSubmittingOffer(false);
          return toast.error("Please provide an item name");
        }
        const payload = {
          ...newOfferForm,
          category_id: offerModalData.category_id,
          deposit_amount: Number(newOfferForm.deposit_amount),
          max_borrow_days: Number(newOfferForm.max_borrow_days),
          status: "unavailable",
        };
        const res = await resourceApi.create(payload);
        resourceIdToOffer = res.data.id;
      } else {
        if (!resourceIdToOffer) {
          setSubmittingOffer(false);
          return toast.error("Please select an item to offer");
        }
      }

      await wantedApi.offer(offerModalData.id, resourceIdToOffer);
      toast.success("Offer sent! The requester has been notified.");
      setOfferedWantedIds((prev) => new Set(prev).add(offerModalData.id));
      setOfferModalData(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setSubmittingOffer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campus Needs</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Explore requests from students & offer solutions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" /> Post a Need
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-400">
          No active wanted requests currently on campus.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {requests
            .filter((r) => !offeredWantedIds.has(r.id))
            .map((r) => {
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedNeedForModal(r)}
                  className="group cursor-pointer rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 transition-all hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {r.title}
                      </h3>
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {r.category?.name}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {r.description || "No description provided."}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center font-extrabold text-white text-xs">
                          {r.user?.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <Link
                            to={`/users/${r.user?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-bold text-slate-850 dark:text-slate-100 hover:underline hover:text-primary-600"
                          >
                            {r.user?.full_name}
                          </Link>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOfferModal(r);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs"
                      >
                        I Have This
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                      <span>Click card for full details</span>
                      <span className="text-primary-600 dark:text-primary-400 group-hover:underline flex items-center gap-0.5">
                        Full Details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Selected Need Details Modal */}
      {selectedNeedForModal && (
        <NeedDetailsModal
          request={selectedNeedForModal}
          onClose={() => setSelectedNeedForModal(null)}
          onOpenOffer={openOfferModal}
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
                  placeholder="e.g., Graphing Calculator, Scientific Scale..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
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
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none min-h-[90px]"
                  placeholder="Any specific timeline, condition required..."
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

      {/* Offer Modal */}
      {offerModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">Make an Offer</h2>
              <button onClick={() => setOfferModalData(null)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1">
                <button
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${offerMode === "existing" ? "bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white" : "text-slate-500"
                    }`}
                  onClick={() => setOfferMode("existing")}
                >
                  From Inventory
                </button>
                <button
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${offerMode === "new" ? "bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white" : "text-slate-500"
                    }`}
                  onClick={() => setOfferMode("new")}
                >
                  Offer New Item
                </button>
              </div>

              {offerMode === "existing" ? (
                <>
                  {myResources.length === 0 ? (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-center">
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">You don't have any items listed yet.</p>
                      <button onClick={() => setOfferMode("new")} className="mt-1.5 inline-block text-xs font-bold text-amber-900 dark:text-amber-200 underline">
                        Offer a new item instead
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Select Item to Offer</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                        value={selectedResourceId}
                        onChange={(e) => setSelectedResourceId(e.target.value)}
                      >
                        <option value="">-- Choose an item --</option>
                        {myResources.map(r => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Item Name</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                      value={newOfferForm.title}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Deposit (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                        value={newOfferForm.deposit_amount}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, deposit_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Condition</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                        value={newOfferForm.condition}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, condition: e.target.value })}
                      >
                        <option value="new">New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="worn">Worn</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  onClick={submitOffer}
                  disabled={submittingOffer || (offerMode === "existing" && !selectedResourceId)}
                  className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {submittingOffer ? "Sending Offer..." : "Send Offer"}
                </button>
                <button onClick={() => setOfferModalData(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
