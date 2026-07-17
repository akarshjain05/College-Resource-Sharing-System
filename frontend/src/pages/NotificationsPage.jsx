import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CheckCircle,
  Mail,
  Calendar,
  Clock,
  Star,
  Trash2,
  Inbox,
} from "lucide-react";
import { notificationApi } from "../api/endpoints";
import toast from "react-hot-toast";

// Design mockup initial notifications
const DEFAULT_MOCK_NOTIFICATIONS = [
  {
    id: "notif-mock-1",
    title: "Request Approved",
    message: "Rahul Sharma accepted your request for Aluminium Ladder",
    type: "check",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 mins ago
    is_read: false,
  },
  {
    id: "notif-mock-2",
    title: "Borrow Request Received",
    message: "Arjun Patel requested to borrow your Bosch Drill Machine",
    type: "request",
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    is_read: false,
  },
  {
    id: "notif-mock-3",
    title: "Booking Commencing",
    message: "Your booking for Cooler - Symphony is starting tomorrow",
    type: "calendar",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    is_read: false,
  },
  {
    id: "notif-mock-4",
    title: "Return Reminder",
    message: "Return reminder: Bosch Drill Machine is due tomorrow",
    type: "alarm",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    is_read: true,
  },
  {
    id: "notif-mock-5",
    title: "New Item Review",
    message: "Your item Aluminium Ladder received a new review",
    type: "star",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    is_read: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadNotifications = () => {
    setLoading(true);
    
    // Fetch actual database notifications if backend runs
    notificationApi
      .list()
      .then(({ data }) => {
        // Load custom requests from localStorage
        const stored = JSON.parse(localStorage.getItem("share_neighbour_notifs"));
        if (!stored) {
          localStorage.setItem("share_neighbour_notifs", JSON.stringify(DEFAULT_MOCK_NOTIFICATIONS));
        }

        const local = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
        
        // Map database requests to match structure
        const dbNotifs = (data || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          created_at: n.created_at,
          is_read: n.is_read,
          type: n.title.toLowerCase().includes("request") ? "request" : "calendar"
        }));

        // Combine
        const combined = [...local, ...dbNotifs];
        // Sort chronologically by created_at
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        // Remove duplicates
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        setNotifications(unique);
      })
      .catch(() => {
        // Local Fallback offline
        const local = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
        if (local.length === 0) {
          localStorage.setItem("share_neighbour_notifs", JSON.stringify(DEFAULT_MOCK_NOTIFICATIONS));
          setNotifications(DEFAULT_MOCK_NOTIFICATIONS);
        } else {
          local.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setNotifications(local);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAll = async () => {
    // 1. Mark localStorage as read
    const local = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
    const updated = local.map(n => ({ ...n, is_read: true }));
    localStorage.setItem("share_neighbour_notifs", JSON.stringify(updated));

    // 2. Trigger API
    try {
      await notificationApi.markAllRead();
    } catch (e) {
      console.log("Offline notice, marked read locally.");
    }
    
    toast.success("All notifications marked as read");
    loadNotifications();
  };

  const handleMarkOne = async (n) => {
    // Clean API logic from main
    if (!n.is_read) {
      await notificationApi.markRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    } else {
      loadNotifications(); // Use whichever load function is defined in this file (load or loadNotifications)
    }
  };

  const handleDeleteAll = () => {
    // If you don't have a backend "delete all" route yet, you can leave this empty or remove the button in the UI
    toast.error("Clear all is not supported yet.");
  };

  // Helper to render notification category icons matching designs (from feature branch)
  const getNotificationIcon = (type) => {
    const tp = type?.toLowerCase() || "";
    if (tp === "check") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0 shadow-sm">
          <CheckCircle className="h-5 w-5" />
        </div>
      );
    }
    if (tp === "request") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0 shadow-sm">
          <Mail className="h-5 w-5" />
        </div>
      );
    }
    if (tp === "calendar") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0 shadow-sm">
          <Calendar className="h-5 w-5" />
        </div>
      );
    }
    if (tp === "alarm") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0 shadow-sm">
          <Clock className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0 shadow-sm">
        <Star className="h-5 w-5" />
      </div>
    );
  };

  // Helper to format date label (from feature branch)
  const getRelativeTimeLabel = (isoString) => {
    const diff = Date.now() - new Date(isoString);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Inbox notifications alert log</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95"
            disabled={notifications.length === 0}
          >
            <CheckCheck className="h-4 w-4 text-slate-400" />
            <span>Mark all read</span>
          </button>
          
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95"
            disabled={notifications.length === 0}
          >
            <Trash2 className="h-4 w-4 text-rose-400" />
            <span>Clear log</span>
          </button>
        </div>
      </div>

      {/* Notifications list layout */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">All caught up</p>
          <p className="mt-1 text-xs text-slate-400">We'll alert you here when booking approvals or messages arrive.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleMarkOne(n)}
              className={`w-full rounded-2xl border p-4.5 text-left transition-all flex gap-3.5 items-start ${
                n.is_read
                  ? "border-slate-200/60 bg-white hover:bg-slate-50/50"
                  : "border-primary-200 bg-primary-50/10 hover:bg-primary-50/20"
              }`}
            >
              {/* Colored type icon */}
              {getNotificationIcon(n.type)}

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <p className={`text-xs font-bold ${n.is_read ? "text-slate-800" : "text-primary-800"}`}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                    {getRelativeTimeLabel(n.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 leading-normal">
                  {n.message}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
