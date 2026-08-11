import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { resourceApi, categoryApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const CONDITION_OPTS = [
  { value: "new", label: "Brand New", desc: "Unopened or unused" },
  { value: "good", label: "Good / Like New", desc: "Light use, fully functional" },
  { value: "fair", label: "Fair", desc: "Scratches, minor wear" },
  { value: "worn", label: "Worn", desc: "Heavy signs of usage" },
];

export default function ResourceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    condition: "good",
    deposit_amount: 0,
    daily_price: 0,
    location: "",
    available_from: "",
    available_to: "",
  });

  const formatLocalDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    Promise.all([
      categoryApi.list(),
      resourceApi.get(id)
    ])
      .then(([catRes, resRes]) => {
        const catList = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.items || []);
        setCategories(catList);
        
        const resource = resRes.data;
        if (resource.owner.id !== user?.id) {
          toast.error("You can only edit your own listings.");
          navigate("/my-listings");
          return;
        }

        setForm({
          title: resource.title || "",
          category_id: resource.category?.id || resource.category_id || "",
          description: resource.description || "",
          condition: resource.condition || "good",
          deposit_amount: resource.deposit_amount || 0,
          daily_price: resource.daily_price || 0,
          location: resource.pickup_location || "",
          available_from: formatLocalDate(resource.available_from),
          available_to: formatLocalDate(resource.available_to),
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load resource data.");
        navigate("/my-listings");
      });
  }, [id, user, navigate]);

  const update = (field) => (e) => {
    let value = e.target.value;
    if (e.target.type === "number") {
      if (value === "") {
        value = "";
      } else {
        const stripped = value.replace(/^0+(?=\d)/, "");
        value = stripped === "" ? 0 : Number(stripped);
      }
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectCondition = (val) => {
    setForm((prev) => ({ ...prev, condition: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dailyPriceNum = form.daily_price === "" ? 0 : Number(form.daily_price);
    const depositAmountNum = form.deposit_amount === "" ? 0 : Number(form.deposit_amount);

    if (isNaN(dailyPriceNum) || dailyPriceNum <= 0) {
      toast.error("Daily price must be greater than 0.");
      return;
    }
    if (isNaN(depositAmountNum) || depositAmountNum < 0) {
      toast.error("Deposit amount must be 0 or more.");
      return;
    }
    if (form.available_from && form.available_to) {
      if (form.available_from > form.available_to) {
        toast.error("Available From date cannot be later than Available To date.");
        return;
      }
    }

    setSubmitting(true);

    try {
      await resourceApi.update(id, {
        title: form.title,
        description: form.description,
        condition: form.condition,
        pickup_location: form.location,
        deposit_amount: depositAmountNum,
        daily_price: dailyPriceNum,
        category_id: form.category_id,
        available_from: form.available_from || null,
        available_to: form.available_to || null,
      });

      toast.success("Listing updated successfully!");
      setSubmitting(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to update listing.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto transition-colors duration-200">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Listings
      </button>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Edit Item</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Update details for your listing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-8">
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
                    <option value="" disabled>-- Select a Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 dark:text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Location Block</label>
                <input
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  value={form.location}
                  onChange={update("location")}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Item Name</label>
              <input
                required
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                value={form.title}
                onChange={update("title")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Item Description</label>
              <textarea
                required
                minLength={10}
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none"
                value={form.description}
                onChange={update("description")}
              />
            </div>
          </div>

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
                    className={`p-4 rounded-2xl border text-left transition-all duration-150 relative overflow-hidden flex flex-col justify-between ${isSelected ? "border-primary-600 bg-primary-50/10 dark:bg-primary-950/20 text-primary-800 dark:text-primary-300 shadow-sm" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-600 dark:text-slate-400"}`}
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

          <div className="space-y-4 pt-6 border-t border-slate-200/60 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Availability Dates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Available From</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-100"
                  value={form.available_from}
                  onChange={update("available_from")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Available To</label>
                <input
                  type="date"
                  min={form.available_from || new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                  value={form.available_to}
                  onChange={update("available_to")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Pricing details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Daily Price (₹)</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
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
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  value={form.deposit_amount}
                  onChange={update("deposit_amount")}
                  placeholder="e.g. 500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl py-4 text-sm font-bold shadow-md shadow-primary-600/10 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 p-6 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Updated!</h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your listing details have been updated successfully.
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/my-listings");
              }}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl py-3.5 text-xs font-bold"
            >
              Back to My Listings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
