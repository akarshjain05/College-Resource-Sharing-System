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
  BookMarked,
  AlertTriangle,
  Package,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { notificationApi, categoryApi, wantedApi } from "../api/endpoints";
import { useNotificationSocket } from "../hooks/useNotificationSocket";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  // { to: "/dashboard", label: "Explore Items", icon: Home },
  { to: "/resources", label: "Explore Items", icon: HelpCircle },
  { to: "/wanted", label: "Campus Needs", icon: MessageSquare },
  { to: "/my-listings", label: "My Listings", icon: Package },
  { to: "/borrow-requests", label: "My Bookings", icon: Calendar },
  // { to: "/resources/new", label: "List an Item", icon: PlusCircle },
  { to: "/complaints", label: "Complaints", icon: AlertTriangle },
  // { to: "/profile", label: "My Profile", icon: User },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  
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

  // Theme dark/light mode state and logic
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const [showPostNeedModal, setShowPostNeedModal] = useState(false);
  const [needFormData, setNeedFormData] = useState({ title: "", description: "", category_id: "" });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (showPostNeedModal && categories.length === 0) {
      categoryApi.list()
        .then(({ data }) => setCategories(data))
        .catch(() => {});
    }
  }, [showPostNeedModal, categories.length]);

  const handlePostNeedSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to post a need");
      navigate("/login");
      return;
    }
    try {
      await wantedApi.create(needFormData);
      toast.success("Wanted request posted!");
      setShowPostNeedModal(false);
      setNeedFormData({ title: "", description: "", category_id: "" });
      
      // Notify pages that wanted request is posted
      window.dispatchEvent(new Event("wantedCreated"));
      
      if (location.pathname !== "/wanted") {
        navigate("/wanted");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to post request");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-body text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 md:flex sticky top-0 h-screen z-20">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 px-6 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 transition-all duration-300 hover:scale-105">
            {/* Custom SVG logo matching mockup */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6.5 w-6.5">
              <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" fill="currentColor" className="text-primary-600" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">ShareNeighbour</span>
            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold tracking-wider uppercase mt-0.5">Community Sharing</span>
          </div>
        </div>

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
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{label}</span>
                {to === "/borrow-requests" && user && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
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
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Bottom Profile Summary */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-2 px-1">
            <Link to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 p-1.5 -ml-1.5 transition-colors cursor-pointer group">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-sm font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
                {user?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{user?.full_name || "Neighbor User"}</p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{user?.role || "Member"}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-all shadow-sm active:scale-95"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* HEADER BAR */}
        <header className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 sticky top-0 z-10 shadow-sm shadow-slate-100/40 dark:shadow-none transition-colors duration-200">
          {/* Welcome Text / Desktop Title */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-sm text-slate-500 dark:text-slate-400 font-medium">
              Hello, <span className="text-slate-800 dark:text-white font-bold">{user?.full_name?.split(" ")[0] || "Neighbor"}</span> 👋
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Listing CTA */}
            <button
              onClick={() => setShowPostNeedModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-102 active:scale-98"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Post a Need</span>
            </button>

            <Link
              to="/notifications"
              className="relative rounded-xl border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="relative rounded-xl border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:text-slate-850 dark:hover:text-white transition-all active:scale-95 shadow-sm"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <Moon className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Post Need Modal */}
      {showPostNeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-4">
          <div className="w-full max-w-[460px] rounded-3xl bg-white dark:bg-slate-900 p-7 shadow-2xl border border-slate-100/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight font-display">Post a Need</h2>
              <button 
                onClick={() => setShowPostNeedModal(false)} 
                className="rounded-full p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handlePostNeedSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">What are you looking for?</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  placeholder="e.g., Graphing Calculator"
                  value={needFormData.title}
                  onChange={(e) => setNeedFormData({ ...needFormData, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 appearance-none pr-10"
                    value={needFormData.category_id}
                    onChange={(e) => setNeedFormData({ ...needFormData, category_id: e.target.value })}
                  >
                    <option value="" className="text-slate-400">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="text-slate-850 dark:text-slate-100 bg-white dark:bg-slate-950">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 dark:text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <textarea
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 min-h-[110px] resize-none"
                  placeholder="Any specific details, timeline, etc."
                  value={needFormData.description}
                  onChange={(e) => setNeedFormData({ ...needFormData, description: e.target.value })}
                />
              </div>
              
              <div className="flex gap-4 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all shadow-sm active:scale-98 text-center"
                >
                  Post Request
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPostNeedModal(false)} 
                  className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all shadow-sm active:scale-98 text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}