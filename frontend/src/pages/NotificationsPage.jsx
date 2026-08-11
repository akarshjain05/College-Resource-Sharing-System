import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { appCallbacks } from "../utils/appCallbacks";
import {
  Bell,
  BellOff,
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
  AlertTriangle,
} from "lucide-react";
import { notificationApi, userApi } from "../api/endpoints";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { usePushNotification } from "../hooks/usePushNotification";
import { resolveNotificationLink } from "../utils/routeResolver";
import PaymentCard from "../components/PaymentCard";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { permission, requestAndRegister } = usePushNotification(user);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    push_notifications: user?.push_notifications ?? true,
    email_notifications: user?.email_notifications ?? true,
    notif_resource_listing: user?.notif_resource_listing ?? true,
    notif_campus_needs: user?.notif_campus_needs ?? true,
  });

  const handleToggleSetting = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    try {
      await userApi.updateMyProfile({ [key]: newValue });
      toast.success("Preference updated");
    } catch (err) {
      toast.error("Failed to update preference");
      setSettings(prev => ({ ...prev, [key]: !newValue })); // revert
    }
  };

  const loadNotifications = () => {
    setLoading(true);

    // Fetch actual database notifications if backend runs
    notificationApi
      .list()
      .then(({ data }) => {
        // Map database requests to match structure
        const dbNotifs = (data || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          created_at: n.created_at,
          is_read: n.is_read,
          link: n.link,
          type: n.type
        }));

        setNotifications(dbNotifs);
      })
      .catch((err) => {
        // Silently ignore loading failures or show a toast if needed
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener("refreshNotificationsList", loadNotifications);
    return () => window.removeEventListener("refreshNotificationsList", loadNotifications);
  }, []);

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
    } catch (e) {
      // Ignore error
    }

    toast.success("All notifications marked as read");
    loadNotifications();
    appCallbacks.trigger("refreshUnreadCount");
  };

  const handleMarkOne = async (n) => {
    try {
      if (!n.is_read) {
        if (n.id) {
          await notificationApi.markRead(n.id);
        }
      }
    } catch (e) {
      // Ignore error
    }

    const resolvedLink = resolveNotificationLink(n.link, n);
    if (resolvedLink) {
      navigate(resolvedLink);
    } else {
      loadNotifications(); // Refresh to show is_read=true state
    }
    appCallbacks.trigger("refreshUnreadCount");
  };

  const handleDeleteAll = async () => {
    try {
      await notificationApi.clearAll();
    } catch (e) {
      // Ignore error
    }
    toast.success("All notifications cleared");
    setNotifications([]);
    appCallbacks.trigger("refreshUnreadCount");
  };

  // Helper to render notification category icons matching designs (from feature branch)
  const getNotificationIcon = (type) => {
    const tp = type?.toLowerCase() || "";
    if (["borrow_approved", "borrow_rejected", "return_confirmed", "damage_claim_resolved", "payment_success"].includes(tp) || tp === "check") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0 shadow-sm">
          <CheckCircle className="h-5 w-5" />
        </div>
      );
    }
    if (["borrow_request", "new_review"].includes(tp) || tp === "request") {
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
    if (["return_reminder"].includes(tp) || tp === "alarm") {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0 shadow-sm">
          <Clock className="h-5 w-5" />
        </div>
      );
    }
    if (tp.startsWith("damage_claim")) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0 shadow-sm">
          <AlertTriangle className="h-5 w-5" />
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

  const renderNotificationMessage = (n) => {
    if (n.type === "payment_success") {
      try {
        const paymentData = JSON.parse(n.message);
        return <PaymentCard paymentData={paymentData} />;
      } catch (e) {
        // Fallback if not valid JSON
        return (
          <p className="mt-1.5 text-xs font-medium text-slate-650 dark:text-slate-400 leading-normal break-words">
            {n.message}
          </p>
        );
      }
    }
    return (
      <p className="mt-1.5 text-xs font-medium text-slate-650 dark:text-slate-400 leading-normal break-words">
        {n.message}
      </p>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold uppercase tracking-wider mt-0.5">Inbox notifications alert log</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
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
              className={`w-full rounded-2xl border p-5 text-left transition-all flex gap-4 items-start ${n.is_read
                ? "border-slate-250/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 text-slate-800 dark:text-slate-200"
                : "border-primary-200 dark:border-primary-800/60 bg-primary-50/10 dark:bg-primary-900/15 hover:bg-primary-50/20 dark:hover:bg-primary-900/25 text-slate-900 dark:text-white"
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
                {renderNotificationMessage(n)}
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
              {/* Permission Bar / Status Bar */}
              {permission === "default" && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/60 flex flex-col gap-3">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Push Permission Required</h4>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-normal">
                        Enable browser alerts to receive real-time updates.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await requestAndRegister();
                      if (res === "granted") {
                        toast.success("Push notifications enabled successfully!");
                      } else if (res === "denied") {
                        toast.error("Permission denied. Set in browser site settings.");
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs transition-all shadow-sm active:scale-98 text-center cursor-pointer"
                  >
                    Grant Permission
                  </button>
                </div>
              )}

              {permission === "denied" && (
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/60 flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-red-900 dark:text-red-200">Notifications Blocked</h4>
                    <p className="text-[10px] text-red-650 dark:text-red-400 font-semibold leading-normal">
                      Notification permission is blocked. Check your browser settings to unblock.
                    </p>
                  </div>
                </div>
              )}

              {permission === "granted" && (
                <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/60 flex gap-2.5 items-center">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold leading-none">
                    Browser push alerts are active
                  </span>
                </div>
              )}
              {/* Push Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Push Notifications</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">Receive real-time alerts in your web browser.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting("push_notifications")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${settings.push_notifications ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  aria-label="Toggle push notifications"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.push_notifications ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>

              {/* Email Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-855 dark:text-slate-200">Email Notifications</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">Receive daily borrow reminders and updates.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting("email_notifications")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${settings.email_notifications ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  aria-label="Toggle email notifications"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.email_notifications ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>

              {/* Resource Listing Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Resource Listing Alerts</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">Notify when new items are posted on campus.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting("notif_resource_listing")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${settings.notif_resource_listing ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  aria-label="Toggle resource listing alerts"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${settings.notif_resource_listing ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>

              {/* Campus Needs Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Campus Needs Alerts</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">Notify when someone requests a resource.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSetting("notif_campus_needs")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${settings.notif_campus_needs ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  aria-label="Toggle campus needs alerts"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${settings.notif_campus_needs ? "translate-x-5" : "translate-x-0"
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