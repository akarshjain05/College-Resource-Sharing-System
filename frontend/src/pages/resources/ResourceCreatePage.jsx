import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Camera,
  Trash2,
  ArrowLeft,
  Shield,
  HelpCircle,
  TrendingUp,
  Heart,
  CheckCircle,
  ArrowRight,
  Plus,
  Sparkles,
  Info,
} from "lucide-react";
import { resourceApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES_LIST = [
  { id: "cat-1", name: "Tools", icon: "🔌" },
  { id: "cat-2", name: "Sports", icon: "🏸" },
  { id: "cat-3", name: "Party", icon: "❄️" },
  { id: "cat-4", name: "Kitchen", icon: "🌪️" },
  { id: "cat-5", name: "Camping", icon: "⛺" },
];

const CONDITION_OPTS = [
  { value: "new", label: "Brand New", desc: "Unopened or unused" },
  { value: "good", label: "Good / Like New", desc: "Light use, fully functional" },
  { value: "fair", label: "Fair", desc: "Scratches, minor wear" },
  { value: "worn", label: "Worn", desc: "Heavy signs of usage" },
];

export default function ResourceCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "Bosch Drill Machine",
    category_name: "Tools",
    description: "Powerful drill machine. Used only a few times. Comes with bits.",
    condition: "good",
    daily_price: 150,
    deposit_amount: 500,
    location: localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru",
  });

  const update = (field) => (e) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectCondition = (val) => {
    setForm((prev) => ({ ...prev, condition: val }));
  };

  const handleAddMockPhoto = () => {
    if (photos.length >= 4) {
      toast.error("Maximum 4 photos allowed.");
      return;
    }
    const emojiMap = {
      "Tools": "🔌",
      "Sports": "🏸",
      "Party": "❄️",
      "Kitchen": "🌪️",
      "Camping": "⛺",
    };
    const emoji = emojiMap[form.category_name] || "🛠️";
    setPhotos(prev => [...prev, emoji]);
    toast.success("Mock photo uploaded!");
  };

  const handleRemovePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.daily_price <= 0) {
      toast.error("Daily price must be greater than 0.");
      return;
    }
    if (form.deposit_amount < 0) {
      toast.error("Deposit amount must be 0 or more.");
      return;
    }
    setSubmitting(true);

    const generatedId = "mock-user-item-" + Date.now();
    const emojiMap = {
      "Tools": "🔌",
      "Sports": "🏸",
      "Party": "❄️",
      "Kitchen": "🌪️",
      "Camping": "⛺",
    };
    const finalPlaceholder = photos[0] || emojiMap[form.category_name] || "🛠️";

    // 1. Add to localStorage mocks
    const currentLoc = form.location;
    const rawMocks = localStorage.getItem("share_neighbour_mocks");
    let savedMocks = {};
    if (rawMocks) {
      savedMocks = JSON.parse(rawMocks);
    } else {
      savedMocks = {
        "Koramangala, Bengaluru": []
      };
    }

    const newItem = {
      id: generatedId,
      title: form.title,
      category: form.category_name,
      daily_price: form.daily_price,
      deposit_amount: form.deposit_amount,
      average_rating: 5.0,
      reviews_count: 0,
      distance: "0.1 km",
      owner: user?.full_name || "You",
      image_placeholder: finalPlaceholder,
      description: form.description,
      coordinates: { x: 30 + Math.random() * 40, y: 25 + Math.random() * 40 },
      is_primary: true,
      condition: form.condition.charAt(0).toUpperCase() + form.condition.slice(1),
    };

    if (!savedMocks[currentLoc]) savedMocks[currentLoc] = [];
    savedMocks[currentLoc].unshift(newItem);
    localStorage.setItem("share_neighbour_mocks", JSON.stringify(savedMocks));

    // Update user sharing score in localStorage
    const localUser = JSON.parse(sessionStorage.getItem("share_neighbour_user_score") || "15");
    sessionStorage.setItem("share_neighbour_user_score", String(localUser + 1));

    // 2. Add notification log
    const savedNotifs = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
    savedNotifs.unshift({
      id: "notif-" + Date.now(),
      title: "New Item Published",
      message: `Your item "${form.title}" is now active in ${currentLoc}.`,
      created_at: new Date().toISOString(),
      is_read: false,
      type: "star",
    });
    localStorage.setItem("share_neighbour_notifs", JSON.stringify(savedNotifs));

    // 3. Trigger actual endpoint
    try {
      await resourceApi.create({
        title: form.title,
        description: form.description,
        condition: form.condition,
        quantity: 1,
        pickup_location: form.location,
        tags: form.category_name.toLowerCase(),
        deposit_amount: form.deposit_amount,
        max_borrow_days: 7,
        category_id: "cat-1",
      });
    } catch (dbErr) {
      console.log("Database upload bypassed. Local listing created.");
    }

    setCreatedItem(newItem);
    setSubmitting(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Explore
      </button>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">List an Item</h1>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Publish your idle items to support your neighborhood</p>
      </div>

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Listing Form (8 columns) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          
          {/* Section 1: Item Media */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Item Photos</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Upload photos of the actual item. Up to 4 files.</p>
            </div>
            
            <div className="flex flex-wrap gap-3.5">
              {/* Premium Dashed Box trigger */}
              <button
                type="button"
                onClick={handleAddMockPhoto}
                className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-500 hover:bg-primary-50/15 text-slate-400 hover:text-primary-600 transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 shadow-xs"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[9px] font-bold">Add Photo</span>
              </button>

              {/* Photos mapping */}
              {photos.map((item, idx) => (
                <div
                  key={idx}
                  className="h-20 w-20 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-3xl relative group shadow-xs animate-in zoom-in-75 duration-100"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-sm active:scale-90 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {photos.length === 0 && (
                <div className="h-20 flex-1 rounded-2xl bg-slate-50 border border-slate-200/40 flex items-center justify-center text-xs text-slate-400 font-semibold px-4 select-none">
                  No photos uploaded. Tap the dashed box to mock capture.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Core Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  required
                  className="input"
                  value={form.category_name}
                  onChange={update("category_name")}
                >
                  {CATEGORIES_LIST.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Location Block</label>
                <select
                  required
                  className="input"
                  value={form.location}
                  onChange={update("location")}
                >
                  <option value="Koramangala, Bengaluru">Koramangala, Bengaluru</option>
                  <option value="Indiranagar, Bengaluru">Indiranagar, Bengaluru</option>
                  <option value="HSR Layout, Bengaluru">HSR Layout, Bengaluru</option>
                  <option value="Whitefield, Bengaluru">Whitefield, Bengaluru</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Item Name</label>
              <input
                required
                className="input"
                value={form.title}
                onChange={update("title")}
                placeholder="e.g. Bosch Drill Machine"
              />
            </div>

            <div>
              <label className="label">Item Description</label>
              <textarea
                required
                minLength={10}
                rows={3}
                className="input"
                value={form.description}
                onChange={update("description")}
                placeholder="e.g. Describe the item specifications, what accessories are included, and when it's available for pickup..."
              />
            </div>
          </div>

          {/* Section 3: Condition Selector Buttons */}
          <div className="space-y-2">
            <label className="label">Item Condition</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CONDITION_OPTS.map((opt) => {
                const isSelected = form.condition === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => selectCondition(opt.value)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-primary-600 bg-primary-50/20 text-primary-800 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-normal">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Price & Trust Escrow Deposit */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pricing details</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Determine the daily borrow fee and security backup deposit.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Daily Price (₹)</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="input"
                  value={form.daily_price}
                  onChange={update("daily_price")}
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="label">Security Deposit (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  className="input"
                  value={form.deposit_amount}
                  onChange={update("deposit_amount")}
                  placeholder="e.g. 500"
                />
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3.5 text-xs font-bold shadow-md shadow-primary-600/10 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Publish Listing"
            )}
          </button>
        </form>

        {/* Right Side: Pro Tips & Trend Analytics (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Listing Tips Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary-600" /> Professional Tips
            </h3>
            
            <ul className="space-y-3 text-[11px] font-medium text-slate-600 leading-normal">
              <li className="flex gap-2">
                <span className="text-primary-600 font-extrabold">•</span>
                <span>
                  <strong className="text-slate-800">Fair Pricing:</strong> We recommend charging 5% to 10% of the item's purchase value per day.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 font-extrabold">•</span>
                <span>
                  <strong className="text-slate-800">Clear Guidelines:</strong> Detail any special instructions (e.g., fuel type, chargers included) to avoid conflicts.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 font-extrabold">•</span>
                <span>
                  <strong className="text-slate-800">Deposit Backup:</strong> Set a deposit amount close to 30% of replacement value to incentivize safe usage.
                </span>
              </li>
            </ul>
          </div>

          {/* Safety disclaimer widget */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-4.5 flex gap-2.5 text-slate-500">
            <Shield className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-medium">
              <span className="font-bold text-slate-700">Protected Escrow:</span> All deposits are managed via secure wallet transfers. Lenders are fully protected in case of damages or loss.
            </div>
          </div>

          {/* Local demand widget */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Hot in {form.location.split(",")[0]}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top items requested this week</p>
            
            <div className="space-y-2">
              {[
                { name: "Drills & Hammers", count: "12 requests" },
                { name: "Camping Tents", count: "8 requests" },
                { name: "Kitchen Blenders", count: "5 requests" }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <span>{item.name}</span>
                  <span className="text-[10px] font-bold text-slate-400">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GORGEOUS SUCCESS MODAL WITH THANK YOU CARD & SHARING SCORE INCREMENT */}
      {showSuccessModal && createdItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            
            {/* Sparkles background effect */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary-500 via-purple-500 to-emerald-500" />
            
            {/* Success icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
              <CheckCircle className="h-8 w-8" />
            </div>

            {/* Thank you message details */}
            <div className="space-y-2">
              <h2 className="font-display text-xl font-extrabold text-slate-900">
                Thank you for contributing! 🤝
              </h2>
              <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your listing helps build a stronger community. By sharing your resources, you help neighbors save money, budget, and reduce waste!
              </p>
            </div>

            {/* Your Contribution Card details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-left space-y-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Contribution</p>
              
              <div className="flex gap-3 items-center">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-xs">
                  {createdItem.image_placeholder}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 leading-tight">
                    {createdItem.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {createdItem.category} · {createdItem.location}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-200/80" />

              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Rental Rate:</span>
                <span className="text-primary-600 font-extrabold">₹{createdItem.daily_price} / day</span>
              </div>
            </div>

            {/* Contribution trust updates */}
            <div className="rounded-2xl border border-primary-100 bg-primary-50/15 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">🚀</span>
                <div>
                  <p className="text-xs font-bold text-primary-900">Sharing Score Boosted</p>
                  <p className="text-[10px] text-primary-600 font-semibold">Keep lending to raise trust score</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-primary-700 bg-primary-100/60 px-3 py-1 rounded-lg">
                +1 Score
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/dashboard");
                }}
                className="w-full btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Back to Explore</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setPhotos([]);
                  setForm({
                    title: "",
                    category_name: "Tools",
                    description: "",
                    condition: "good",
                    daily_price: 100,
                    deposit_amount: 300,
                    location: localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru",
                  });
                }}
                className="w-full btn-secondary py-3 text-xs"
              >
                List Another Item
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
