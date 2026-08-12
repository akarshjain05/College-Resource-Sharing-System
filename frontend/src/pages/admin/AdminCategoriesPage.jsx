import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit, X } from "lucide-react";
import { categoryApi } from "../../api/endpoints";

function EditCategoryModal({ category, onClose, onUpdate }) {
  const [form, setForm] = useState({
    name: category.name,
    description: category.description || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onUpdate(category.id, form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Edit Category</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 btn-primary">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", icon: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

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

  const handleUpdate = async (id, updatedData) => {
    try {
      await categoryApi.update(id, updatedData);
      toast.success("Category updated");
      setEditingCategory(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update category.");
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
              <div className="flex gap-2">
                <button onClick={() => setEditingCategory(c)} className="rounded p-2 text-ink-500 hover:bg-slate-100 hover:text-primary-600">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="rounded p-2 text-ink-500 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
