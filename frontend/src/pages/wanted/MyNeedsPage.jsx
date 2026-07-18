import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Check, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { wantedApi, categoryApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

export default function MyNeedsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category_id: "" });
  
  const [expandedOffers, setExpandedOffers] = useState({}); // { [wantedId]: [offers...] }
  const [loadingOffers, setLoadingOffers] = useState({});

  const loadData = () => {
    setLoading(true);
    Promise.all([
      wantedApi.myNeeds(), 
      categoryApi.list(),
    ])
      .then(([reqRes, catRes]) => {
        setRequests(reqRes.data);
        setCategories(catRes.data);
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

  const handleFulfill = async (id) => {
    try {
      await wantedApi.fulfill(id);
      toast.success("Request marked as fulfilled");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await wantedApi.delete(id);
      toast.success("Request deleted");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const toggleOffers = async (wantedId) => {
    if (expandedOffers[wantedId]) {
      const newExpanded = { ...expandedOffers };
      delete newExpanded[wantedId];
      setExpandedOffers(newExpanded);
      return;
    }

    setLoadingOffers({ ...loadingOffers, [wantedId]: true });
    try {
      const res = await wantedApi.listOffers(wantedId);
      setExpandedOffers({ ...expandedOffers, [wantedId]: res.data });
    } catch (err) {
      toast.error("Failed to load offers");
    } finally {
      setLoadingOffers({ ...loadingOffers, [wantedId]: false });
    }
  };

  const acceptOffer = async (offerId, resourceId) => {
    try {
      await wantedApi.acceptOffer(offerId);
      toast.success("Offer accepted! Redirecting to borrow request...");
      navigate(`/resources/${resourceId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-ink-100 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">My Needs</h1>
          <p className="text-sm text-ink-500">Track the items you've requested and manage offers from others.</p>
        </div>  
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">You haven't posted any wanted requests yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {requests.map((r) => {
            const offersList = expandedOffers[r.id];
            
            return (
              <div key={r.id} className={`card p-5 flex flex-col justify-between h-fit ${r.is_fulfilled ? 'opacity-70' : ''}`}>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-ink-900 line-clamp-1">{r.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      {r.is_fulfilled ? (
                        <span className="rounded bg-forest-50 px-2 py-0.5 text-[10px] font-semibold text-forest-700 uppercase">Fulfilled</span>
                      ) : (
                        <span className="rounded bg-brass-50 px-2 py-0.5 text-[10px] font-semibold text-brass-700 uppercase">{r.category.name}</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-600 line-clamp-3">{r.description || "No description provided."}</p>
                </div>
                
                <div className="mt-4 border-t border-ink-100 pt-4 space-y-3">
                  <div className="flex items-end justify-end">
                      <div className="flex gap-2">
                        {!r.is_fulfilled && (
                          <>
                            <button onClick={() => toggleOffers(r.id)} className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1">
                              Offers {offersList ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
                            </button>
                            <button onClick={() => handleFulfill(r.id)} className="rounded p-1.5 text-forest-600 hover:bg-forest-50" title="Mark as Fulfilled">
                              <Check className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                  </div>

                  {/* Offers Dropdown */}
                  {!r.is_fulfilled && offersList && (
                    <div className="mt-3 rounded-lg bg-ink-50 p-3 space-y-2">
                      <h4 className="text-xs font-bold text-ink-900">Received Offers</h4>
                      {offersList.length === 0 ? (
                        <p className="text-xs text-ink-500">No offers yet.</p>
                      ) : (
                        offersList.map(offer => (
                          <div key={offer.id} className="flex items-center justify-between bg-white p-2 rounded border border-ink-100">
                            <div>
                              <p className="text-xs font-semibold text-ink-900">{offer.offerer.full_name}</p>
                              <Link to={`/resources/${offer.resource_id}`} className="text-[10px] text-brand-600 hover:underline">
                                {offer.resource.title}
                              </Link>
                            </div>
                            <button
                              onClick={() => acceptOffer(offer.id, offer.resource_id)}
                              className="rounded bg-brand-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-700"
                            >
                              Accept
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Need Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink-900">Post a Need</h2>
              <button onClick={() => setShowModal(false)} className="text-ink-500 hover:text-ink-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">What are you looking for?</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g., Graphing Calculator"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Category</label>
                <select
                  required
                  className="input"
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
                <label className="mb-1 block text-sm font-medium text-ink-700">Description (Optional)</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Any specific details, timeline, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Post Request</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
