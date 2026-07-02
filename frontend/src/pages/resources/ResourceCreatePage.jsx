import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { resourceApi, categoryApi } from "../../api/endpoints";

export default function ResourceCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    condition: "good",
    quantity: 1,
    pickup_location: "",
    tags: "",
    deposit_amount: 0,
    max_borrow_days: 7,
    category_id: "",
  });

  useEffect(() => {
    categoryApi.list().then(({ data }) => {
      setCategories(data);
      if (data.length) setForm((prev) => ({ ...prev, category_id: data[0].id }));
    });
  }, []);

  const update = (field) => (e) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await resourceApi.create(form);
      toast.success("Resource listed!");
      navigate(`/resources/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create resource.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">List a resource</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={update("title")} placeholder="e.g. Canon DSLR Camera" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            required
            minLength={10}
            rows={4}
            className="input"
            value={form.description}
            onChange={update("description")}
            placeholder="Describe the item, its accessories, and any usage notes..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select required className="input" value={form.category_id} onChange={update("category_id")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Condition</label>
            <select className="input" value={form.condition} onChange={update("condition")}>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="worn">Worn</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Quantity</label>
            <input type="number" min={1} className="input" value={form.quantity} onChange={update("quantity")} />
          </div>
          <div>
            <label className="label">Max borrow days</label>
            <input type="number" min={1} max={90} className="input" value={form.max_borrow_days} onChange={update("max_borrow_days")} />
          </div>
          <div>
            <label className="label">Deposit (₹)</label>
            <input type="number" min={0} className="input" value={form.deposit_amount} onChange={update("deposit_amount")} />
          </div>
        </div>
        <div>
          <label className="label">Pickup location</label>
          <input className="input" value={form.pickup_location} onChange={update("pickup_location")} placeholder="e.g. Hostel Block C, Room 204" />
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" value={form.tags} onChange={update("tags")} placeholder="electronics, photography, camera" />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Publishing..." : "Publish resource"}
        </button>
      </form>
    </div>
  );
}
