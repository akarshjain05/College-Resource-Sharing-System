import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { categoryApi } from "../../api/endpoints";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", icon: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    categoryApi.list().then(({ data }) => setCategories(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await categoryApi.create(form);
      toast.success("Category created");
      setForm({ name: "", description: "", icon: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoryApi.remove(id);
      toast.success("Category deleted");
      load();
    } catch (err) {
      toast.error("Could not delete category.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Manage categories</h1>

      <form onSubmit={handleCreate} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">Name</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-ink-500">Loading categories...</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-500">{c.description}</p>
              </div>
              <button onClick={() => handleDelete(c.id)} className="rounded p-2 text-ink-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
