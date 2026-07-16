import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home,
  PlusCircle,
  Calendar,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  MapPin,
  HelpCircle,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../api/endpoints";
import { useNotificationSocket } from "../hooks/useNotificationSocket";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Explore Items", icon: Home },
  { to: "/resources", label: "All Listings", icon: HelpCircle },
  { to: "/borrow-requests", label: "My Bookings", icon: Calendar },
  { to: "/resources/new", label: "List an Item", icon: PlusCircle },
  { to: "/wanted", label: "Campus Needs", icon: MessageSquare },
  { to: "/profile", label: "My Profile", icon: User },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Location selection state
  const [selectedLocation, setSelectedLocation] = useState(
    localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru"
  );
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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

  const changeLocation = (loc) => {
    setSelectedLocation(loc);
    localStorage.setItem("share_neighbour_location", loc);
    setShowLocationDropdown(false);
    // Dispatch a custom event to notify components that location changed
    window.dispatchEvent(new Event("locationChanged"));
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-body text-slate-800">
      {/* SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-slate-200/80 bg-white md:flex sticky top-0 h-screen z-20">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 px-6 py-6 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 transition-all duration-300 hover:scale-105">
            {/* Custom SVG logo matching mockup */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6.5 w-6.5">
              <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" fill="currentColor" className="text-primary-600" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold text-slate-900 tracking-tight leading-none">ShareNeighbour</span>
            <span className="text-[10px] text-primary-600 font-semibold tracking-wider uppercase mt-0.5">Community Sharing</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/10 hover:bg-primary-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{label}</span>
                {to === "/borrow-requests" && user && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    Active
                  </span>
                )}
              </Link>
            );
          })}
          
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                location.pathname.startsWith("/admin")
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Bottom Profile Summary */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <div className="mb-3.5 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-sm font-bold text-white shadow-sm">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{user?.full_name || "Neighbor User"}</p>
              <p className="truncate text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{user?.role || "Member"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 px-3 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* HEADER BAR */}
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 sticky top-0 z-10 shadow-sm shadow-slate-100/40">
          {/* Welcome Text / Desktop Title */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-sm text-slate-500 font-medium">
              Hello, <span className="text-slate-800 font-bold">{user?.full_name?.split(" ")[0] || "Neighbor"}</span> 👋
            </span>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-4">
            {/* Quick Listing CTA */}
            <Link
              to="/resources/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-102 active:scale-98"
            >
              <PlusCircle className="h-4 w-4" />
              <span>List an Item</span>
            </Link>

            {/* Notification Badge */}
            <Link
              to="/notifications"
              className="relative rounded-xl border border-slate-200 hover:border-slate-300 p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-all active:scale-95"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
