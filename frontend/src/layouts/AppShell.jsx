import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  PackageSearch,
  ArrowLeftRight,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  BookMarked,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../api/endpoints";
import { useNotificationSocket } from "../hooks/useNotificationSocket";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/resources", label: "Browse Resources", icon: PackageSearch },
  { to: "/my-listings", label: "My Listings", icon: Package },
  { to: "/borrow-requests", label: "Borrow Requests", icon: ArrowLeftRight },
  { to: "/wanted", label: "Wanted Items", icon: PackageSearch },
  { to: "/complaints", label: "Complaints", icon: AlertTriangle },
  { to: "/profile", label: "My Profile", icon: User },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    notificationApi
      .list()
      .then(({ data }) => {
        if (mounted) setUnreadCount(data.filter((n) => !n.is_read).length);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  useNotificationSocket(() => setUnreadCount((prev) => prev + 1));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 flex-col border-r border-ink-100 bg-white md:flex">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-ink-100">
          <BookMarked className="h-6 w-6 text-forest-700" />
          <span className="font-display text-lg font-semibold text-ink-900">CRSS</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname.startsWith(to)
                  ? "bg-forest-50 text-forest-900"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname.startsWith("/admin")
                  ? "bg-brass-50 text-brass-700"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="border-t border-ink-100 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-900">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{user?.full_name}</p>
              <p className="truncate text-xs text-ink-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
          <p className="font-display text-sm text-ink-500">
            Welcome back, <span className="text-ink-900 font-semibold">{user?.full_name?.split(" ")[0]}</span>
          </p>
          <Link to="/notifications" className="relative rounded-full p-2 hover:bg-ink-50">
            <Bell className="h-5 w-5 text-ink-700" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brass-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
