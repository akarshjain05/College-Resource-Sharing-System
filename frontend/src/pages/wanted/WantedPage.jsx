import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Check, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { wantedApi, categoryApi, resourceApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

export default function WantedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category_id: "" });
  
  const [offerModalData, setOfferModalData] = useState(null); // The whole wanted request object
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [offerMode, setOfferMode] = useState("existing");
  const [newOfferForm, setNewOfferForm] = useState({
    title: "",
    description: "",
    condition: "good",
    deposit_amount: 0,
    max_borrow_days: 7,
  });
  
  const [expandedOffers, setExpandedOffers] = useState({}); // { [wantedId]: [offers...] }
  const [loadingOffers, setLoadingOffers] = useState({});

  const loadData = () => {
    setLoading(true);
    Promise.all([
      wantedApi.list(), 
      categoryApi.list(),
      user ? resourceApi.list({ owner_id: user.id }) : Promise.resolve({ data: [] })
    ])
      .then(([reqRes, catRes, resRes]) => {
        setRequests(reqRes.data);
        setCategories(catRes.data);
        if (user) {
           setMyResources(resRes.data.filter(r => r.owner_id === user.id));
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

  const submitOffer = async () => {
    try {
      let resourceIdToOffer = selectedResourceId;

      if (offerMode === "new") {
        if (!newOfferForm.title) return toast.error("Please provide an item name");
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
        if (!resourceIdToOffer) return toast.error("Please select an item to offer");
      }

      await wantedApi.offer(offerModalData.id, resourceIdToOffer);
      toast.success("Offer sent! The requester has been notified.");
      setOfferModalData(null);
      loadData(); // refresh resources list
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
          <h1 className="font-display text-2xl font-semibold text-ink-900">Wanted Items</h1>
          <p className="text-sm text-ink-500">See what your campus needs, or post a request for something you're looking for.</p>
        </div>  
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">No active wanted requests.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {requests.map((r) => {
            return (
              <div key={r.id} className="card p-5 flex flex-col justify-between h-fit">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-ink-900 line-clamp-1">{r.title}</h3>
                    <span className="rounded bg-brass-50 px-2 py-0.5 text-[10px] font-semibold text-brass-700 uppercase">
                      {r.category.name}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-600 line-clamp-3">{r.description || "No description provided."}</p>
                </div>
                
                <div className="mt-4 border-t border-ink-100 pt-4 space-y-3">
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-forest-100 flex items-center justify-center font-bold text-forest-700 text-xs">
                        {r.user.full_name.charAt(0)}
                      </div>
                      <div>
                        <Link to={`/users/${r.user.id}`} className="text-sm font-semibold text-ink-900 hover:underline">
                          {r.user.full_name}
                        </Link>
                        <p className="text-[10px] text-ink-500">Trust Score: {r.user.trust_score}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => openOfferModal(r)}
                      className="btn-primary !py-1 !px-3 text-xs"
                    >
                      I have this
                    </button>
                  </div>
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

      {/* Offer Modal */}
      {offerModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink-900">Make an Offer</h2>
              <button onClick={() => setOfferModalData(null)} className="text-ink-500 hover:text-ink-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex rounded-lg bg-ink-50 p-1 mb-4">
                <button
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                    offerMode === "existing" ? "bg-white shadow-sm text-ink-900" : "text-ink-600 hover:text-ink-900"
                  }`}
                  onClick={() => setOfferMode("existing")}
                >
                  From Inventory
                </button>
                <button
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                    offerMode === "new" ? "bg-white shadow-sm text-ink-900" : "text-ink-600 hover:text-ink-900"
                  }`}
                  onClick={() => setOfferMode("new")}
                >
                  Offer New Item
                </button>
              </div>
              
              {offerMode === "existing" ? (
                <>
                  <p className="text-sm text-ink-600">
                    Select one of your already listed items to offer.
                  </p>
                  
                  {myResources.length === 0 ? (
                    <div className="rounded-lg bg-yellow-50 p-4 text-center">
                      <p className="text-sm text-yellow-800">You don't have any items listed yet.</p>
                      <button onClick={() => setOfferMode("new")} className="mt-2 inline-block text-sm font-bold text-yellow-900 underline">
                        Offer a new item instead
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Select Item</label>
                      <select
                        className="input"
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
                  <p className="text-sm text-ink-600">
                    Quickly list an item to offer. It will be added to your inventory.
                  </p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">Item Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newOfferForm.title}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Deposit (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={newOfferForm.deposit_amount}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, deposit_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">Condition</label>
                      <select
                        className="input"
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
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={submitOffer} 
                  disabled={offerMode === "existing" && !selectedResourceId}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  Send Offer
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
