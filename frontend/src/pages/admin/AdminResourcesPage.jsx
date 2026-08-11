import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi, resourceApi } from "../../api/endpoints";
import ConfirmModal from "../../components/ConfirmModal";
import { Eye, MoreVertical, Trash2 } from "lucide-react";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [menuOpen, setMenuOpen] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  const load = (p = 1) => {
    setLoading(true);
    adminApi.listResources({ page: p, page_size: 50 })
      .then(({ data }) => {
        setResources(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => toast.error("Could not fetch resources"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page);
  }, [page]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await resourceApi.remove(deleteTarget.id);
      toast.success("Resource deleted successfully");
      setDeleteTarget(null);
      load(page); // Reload table
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete resource");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">All Resources</h1>
        <span className="text-sm text-ink-500 font-medium">Total: {total}</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-600">
            <thead className="border-b border-ink-100 bg-ink-50/50 text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-400">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-brass-500" />
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-400 font-medium">
                    No resources found.
                  </td>
                </tr>
              ) : (
                resources.map((res) => (
                  <tr key={res.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink-900">{res.title}</td>
                    <td className="px-6 py-4">{res.owner?.full_name || "Unknown"}</td>
                    <td className="px-6 py-4">{res.category?.name || "Unknown"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide
                        ${res.status === "available" ? "bg-forest-50 text-forest-700" :
                          res.status === "borrowed" ? "bg-brass-50 text-brass-700" :
                          "bg-ink-100 text-ink-700"}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/resources/${res.id}`}
                          className="p-2 text-ink-400 hover:text-brass-600 hover:bg-brass-50 rounded-xl transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === res.id ? null : res.id)}
                            className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-xl transition-colors"
                          >
                            <MoreVertical className="h-4.5 w-4.5" />
                          </button>
                          {menuOpen === res.id && (
                            <div 
                              ref={menuRef} 
                              className="absolute right-0 mt-1 w-36 bg-white border border-ink-100 shadow-xl rounded-xl py-1.5 z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setDeleteTarget(res);
                                  setMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-semibold transition-colors"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Resource"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete Resource"}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
}
