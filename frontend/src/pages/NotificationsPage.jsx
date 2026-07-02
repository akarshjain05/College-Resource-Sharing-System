import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { notificationApi } from "../api/endpoints";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    notificationApi.list().then(({ data }) => setNotifications(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    load();
  };

  const handleMarkOne = async (id) => {
    await notificationApi.markRead(id);
    load();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Notifications</h1>
        <button onClick={handleMarkAll} className="btn-secondary">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          <Bell className="mx-auto mb-2 h-6 w-6 text-ink-300" />
          You're all caught up.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleMarkOne(n.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                n.is_read ? "border-ink-100 bg-white" : "border-forest-300 bg-forest-50"
              }`}
            >
              <p className="text-sm font-semibold text-ink-900">{n.title}</p>
              <p className="mt-0.5 text-sm text-ink-600">{n.message}</p>
              <p className="mt-1 text-xs text-ink-400">{new Date(n.created_at).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
