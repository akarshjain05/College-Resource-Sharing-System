import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldOff, ShieldCheck, UserPlus } from "lucide-react";
import { userApi } from "../../api/endpoints";
import ConfirmModal from "../../components/ConfirmModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const load = () => {
    setLoading(true);
    userApi.listUsers({ limit: 100 }).then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleSuspend = async (user) => {
    try {
      if (user.is_suspended) {
        await userApi.unsuspendUser(user.id);
      } else {
        await userApi.suspendUser(user.id);
      }
      toast.success("Updated user status");
      load();
    } catch (err) {
      toast.error("Could not update user status.");
    }
  };

  const handleMakeAdmin = (user) => {
    setConfirmDialog({
      title: "Promote to Admin",
      message: `Are you sure you want to promote ${user.full_name} to an Admin? They will have full system access.`,
      confirmText: "Make Admin",
      isDanger: false,
      onConfirm: async () => {
        try {
          await userApi.makeAdmin(user.id);
          toast.success(`${user.full_name} is now an Admin`);
          load();
        } catch (err) {
          toast.error(err.response?.data?.detail || "Action failed");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Manage users</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Trust score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-500">
                  Loading users...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-ink-600">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-ink-600">{u.role}</td>
                  <td className="px-4 py-3 text-ink-600">{u.department || "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{u.trust_score}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        u.is_suspended ? "bg-red-50 text-red-600" : "bg-forest-50 text-forest-700"
                      }`}
                    >
                      {u.is_suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleSuspend(u)} className="btn-secondary !py-1 !px-2 text-xs">
                        {u.is_suspended ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5" /> Unsuspend
                          </>
                        ) : (
                          <>
                            <ShieldOff className="h-3.5 w-3.5" /> Suspend
                          </>
                        )}
                      </button>
                      {u.role !== 'admin' && (
                        <button onClick={() => handleMakeAdmin(u)} className="btn-secondary !py-1 !px-2 text-xs text-primary-600 border-primary-200 hover:bg-primary-50">
                          <UserPlus className="h-3.5 w-3.5" /> Make Admin
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        {...confirmDialog}
      />
    </div>
  );
}
