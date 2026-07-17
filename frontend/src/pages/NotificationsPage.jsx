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
  Settings,
  X,
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

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    pushEnabled: localStorage.getItem("notif_push_enabled") !== "false",
    emailEnabled: localStorage.getItem("notif_email_enabled") !== "false",
  });

  const handleToggleSetting = (key) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`notif_${key === "pushEnabled" ? "push" : "email"}_enabled`, String(updated[key]));
      toast.success(`${key === "pushEnabled" ? "Push" : "Email"} notifications ${updated[key] ? "enabled" : "disabled"}`);
      return updated;
    });
  };

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
          link: n.link,
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
    try {
      if (!n.is_read) {
        if (n.id && !n.id.toString().startsWith("notif-mock-")) {
          await notificationApi.markRead(n.id);
        } else {
          // Local mock update
          const local = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
          const updated = local.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif);
          localStorage.setItem("share_neighbour_notifs", JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.log("Failed to mark read", e);
    }

    if (n.link) {
      navigate(n.link);
    } else {
      loadNotifications(); // Refresh to show is_read=true state
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
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold uppercase tracking-wider mt-0.5">Inbox notifications alert log</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-305 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            disabled={notifications.length === 0}
          >
            <CheckCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span>Mark all read</span>
          </button>
          
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-950 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            disabled={notifications.length === 0}
          >
            <Trash2 className="h-4 w-4 text-rose-400 dark:text-rose-500" />
            <span>Clear log</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Settings className="h-4 w-4 text-slate-400 dark:text-slate-550" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Notifications list layout */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center transition-colors duration-200">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-350 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All caught up</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">We'll alert you here when booking approvals or messages arrive.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleMarkOne(n)}
              className={`w-full rounded-2xl border p-5 text-left transition-all flex gap-4 items-start ${
                n.is_read
                  ? "border-slate-250/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 text-slate-800 dark:text-slate-200"
                  : "border-primary-200 dark:border-primary-800/60 bg-primary-50/10 dark:bg-primary-955/15 hover:bg-primary-50/20 dark:hover:bg-primary-955/25 text-slate-900 dark:text-white"
              }`}
            >
              {/* Colored type icon */}
              {getNotificationIcon(n.type)}

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 sm:gap-2">
                  <p className={`text-xs font-bold ${n.is_read ? "text-slate-800 dark:text-slate-200" : "text-primary-800 dark:text-primary-400"} truncate`}>
                    {n.title}
                  </p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold flex-shrink-0">
                    {getRelativeTimeLabel(n.created_at)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-650 dark:text-slate-400 leading-normal break-words">
                  {n.message}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-7 shadow-2xl border border-slate-100/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-display">Notification Settings</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-550 font-semibold mt-0.5">Manage how you receive alerts and alerts triggers.</p>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="rounded-full p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Push Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Push Notifications</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">Receive real-time alerts in your web browser.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting("pushEnabled")}
                  className={`relative inline-flex h-6.5 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    settings.pushEnabled ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                  aria-label="Toggle push notifications"
                >
                  <span
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      settings.pushEnabled ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Email Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-855 dark:text-slate-200">Email Notifications</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">Receive daily borrow reminders and updates.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting("emailEnabled")}
                  className={`relative inline-flex h-6.5 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    settings.emailEnabled ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                  aria-label="Toggle email notifications"
                >
                  <span
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      settings.emailEnabled ? "translate-x-5.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all shadow-sm active:scale-98 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
