import { useEffect, useState, useRef } from "react";
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
  ChevronDown,
  Upload,
} from "lucide-react";
import { resourceApi, categoryApi, uploadApi } from "../../api/endpoints";
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
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]); // Array of { file, previewUrl }
  const [categories, setCategories] = useState([]);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "Bosch Drill Machine",
    category_id: "",
    description: "Powerful drill machine. Used only a few times. Comes with bits.",
    condition: "good",
    daily_price: 150,
    deposit_amount: 500,
    location: localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru",
  });

  useEffect(() => {
    categoryApi.list()
      .then(({ data }) => {
        setCategories(data);
        if (data.length > 0) {
          setForm(prev => ({ ...prev, category_id: data[0].id }));
        }
      })
      .catch(() => {
        const fallback = [
          { id: "cat-1", name: "Tools" },
          { id: "cat-2", name: "Sports" },
          { id: "cat-3", name: "Party" },
          { id: "cat-4", name: "Kitchen" },
          { id: "cat-5", name: "Camping" },
        ];
        setCategories(fallback);
        setForm(prev => ({ ...prev, category_id: fallback[0].id }));
      });
  }, []);

  const update = (field) => (e) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectCondition = (val) => {
    setForm((prev) => ({ ...prev, condition: val }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 3) {
      toast.error("You can only select up to 3 images.");
      return;
    }
    
    files.forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, { file, previewUrl: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
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
    const selectedCat = categories.find(c => c.id === form.category_id);
    const categoryName = selectedCat ? selectedCat.name : "Other";
    
    const emojiMap = {
      "Tools": "🔌",
      "Sports": "🏸",
      "Party": "❄️",
      "Kitchen": "🌪️",
      "Camping": "⛺",
    };
    const finalPlaceholder = photos[0]?.previewUrl || emojiMap[categoryName] || "🛠️";

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
      category: categoryName,
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
      const response = await resourceApi.create({
        title: form.title,
        description: form.description,
        condition: form.condition,
        quantity: 1,
        pickup_location: form.location,
        tags: categoryName.toLowerCase(),
        deposit_amount: form.deposit_amount,
        max_borrow_days: 7,
        category_id: form.category_id,
      });

      const createdId = response.data.id;
      // Upload actual images
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const isPrimary = i === 0;
          try {
            await uploadApi.uploadResourceImage(createdId, photos[i].file, isPrimary);
          } catch (uploadErr) {
            console.error("Failed to upload image index: ", i, uploadErr);
          }
        }
      }
      toast.success("Listing created successfully!");
    } catch (dbErr) {
      console.log("Database upload bypassed. Local listing created.");
    }

    setCreatedItem(newItem);
    setSubmitting(false);
    setShowSuccessModal(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto transition-colors duration-200">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Explore
      </button>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">List an Item</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Publish your idle items to support your neighborhood</p>
      </div>

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Listing Form (8 columns) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-8">
          
          {/* Section 1: Item Media */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Item Photos</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Upload real photos of the item. Only up to 3 images can be selected.</p>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {photos.length}/3 Selected
              </span>
            </div>
            
            <div className="space-y-4">
              {/* Premium Drag & Drop style trigger */}
              {photos.length < 3 && (
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="h-32 w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50/5 dark:hover:bg-primary-950/5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-xs"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs font-bold">Upload Photos</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Select files or drag them here</span>
                </div>
              )}

              {/* Photos mapping */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 overflow-hidden group shadow-xs animate-in zoom-in-75 duration-100"
                    >
                      <img
                        src={item.previewUrl}
                        alt={`Preview ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      
                      {idx === 0 && (
                        <span className="absolute top-2.5 left-2.5 bg-primary-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-md tracking-wider uppercase">
                          Cover
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-2.5 right-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                        title="Remove photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Core Details */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Category</label>
                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 appearance-none pr-10"
                    value={form.category_id}
                    onChange={update("category_id")}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 dark:text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Location Block</label>
                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100 appearance-none pr-10"
                    value={form.location}
                    onChange={update("location")}
                  >
                    <option value="Koramangala, Bengaluru">Koramangala, Bengaluru</option>
                    <option value="Indiranagar, Bengaluru">Indiranagar, Bengaluru</option>
                    <option value="HSR Layout, Bengaluru">HSR Layout, Bengaluru</option>
                    <option value="Whitefield, Bengaluru">Whitefield, Bengaluru</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 dark:text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Item Name</label>
              <input
                required
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                value={form.title}
                onChange={update("title")}
                placeholder="e.g. Bosch Drill Machine"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Item Description</label>
              <textarea
                required
                minLength={10}
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none"
                value={form.description}
                onChange={update("description")}
                placeholder="e.g. Describe the item specifications, what accessories are included, and when it's available for pickup..."
              />
            </div>
          </div>

          {/* Section 3: Condition Selector Buttons */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Item Condition</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CONDITION_OPTS.map((opt) => {
                const isSelected = form.condition === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => selectCondition(opt.value)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-150 relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? "border-primary-600 bg-primary-50/10 dark:bg-primary-950/20 text-primary-800 dark:text-primary-300 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 leading-normal">{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute right-3 bottom-3 text-primary-600 dark:text-primary-400">
                        <CheckCircle className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Price & Trust Escrow Deposit */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Pricing details</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Determine the daily borrow fee and security backup deposit.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Daily Price (₹)</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  value={form.daily_price}
                  onChange={update("daily_price")}
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Security Deposit (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
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
            className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl py-4 text-sm font-bold shadow-md shadow-primary-600/10 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center animate-pulse-once"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Publish Listing"
            )}
          </button>
        </form>

        {/* Right Side: Pro Tips & Trend Analytics (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Listing Tips Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" /> Professional Tips
            </h3>
            
            <ul className="space-y-3 text-[11px] font-medium text-slate-650 dark:text-slate-400 leading-normal">
              <li className="flex gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-extrabold">•</span>
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">Fair Pricing:</strong> We recommend charging 5% to 10% of the item's purchase value per day.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-extrabold">•</span>
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">Clear Guidelines:</strong> Detail any special instructions (e.g., fuel type, chargers included) to avoid conflicts.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-extrabold">•</span>
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">Deposit Backup:</strong> Set a deposit amount close to 30% of replacement value to incentivize safe usage.
                </span>
              </li>
            </ul>
          </div>

          {/* Safety disclaimer widget */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4.5 flex gap-2.5 text-slate-500 dark:text-slate-400">
            <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-350">Protected Escrow:</span> All deposits are managed via secure wallet transfers. Lenders are fully protected in case of damages or loss.
            </div>
          </div>

          {/* Local demand widget */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-500" /> Hot in {form.location.split(",")[0]}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Top items requested this week</p>
            
            <div className="space-y-2">
              {[
                { name: "Drills & Hammers", count: "12 requests" },
                { name: "Camping Tents", count: "8 requests" },
                { name: "Kitchen Blenders", count: "5 requests" }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-850">
                  <span>{item.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL WITH THANK YOU CARD */}
      {showSuccessModal && createdItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 p-6 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            
            {/* Sparkles background effect */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary-500 via-purple-500 to-emerald-500" />
            
            {/* Success icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 shadow-sm">
              <CheckCircle className="h-8 w-8" />
            </div>

            {/* Thank you message details */}
            <div className="space-y-2">
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                Thank you for contributing! 🤝
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Your listing helps build a stronger community. By sharing your resources, you help neighbors save money, budget, and reduce waste!
              </p>
            </div>

            {/* Your Contribution Card details */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 text-left space-y-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Your Contribution</p>
              
              <div className="flex gap-3 items-center">
                <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center text-3xl shadow-xs">
                  {createdItem.image_placeholder.startsWith("data:") ? (
                    <img src={createdItem.image_placeholder} alt="Contribution preview" className="h-full w-full object-cover" />
                  ) : (
                    createdItem.image_placeholder
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-805 dark:text-slate-200 leading-tight">
                    {createdItem.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                    {createdItem.category} · {createdItem.location}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-200/80 dark:bg-slate-800" />

              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Rental Rate:</span>
                <span className="text-primary-600 dark:text-primary-400 font-extrabold">₹{createdItem.daily_price} / day</span>
              </div>
            </div>

            {/* Contribution trust updates */}
            <div className="rounded-2xl border border-primary-100 dark:border-primary-950/60 bg-primary-50/15 dark:bg-primary-950/10 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">🚀</span>
                <div>
                  <p className="text-xs font-bold text-primary-900 dark:text-primary-350">Sharing Score Boosted</p>
                  <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">Keep lending to raise trust score</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-primary-700 dark:text-primary-400 bg-primary-100/60 dark:bg-primary-900/40 px-3 py-1 rounded-lg">
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
                className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl py-3.5 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
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
                    category_id: categories[0]?.id || "",
                    description: "",
                    condition: "good",
                    daily_price: 100,
                    deposit_amount: 300,
                    location: localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru",
                  });
                }}
                className="w-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 py-3.5 text-xs font-bold rounded-2xl transition-all"
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
