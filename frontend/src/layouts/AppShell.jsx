import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  Home,
  PlusCircle,
  Calendar,
  Bell,
  BellOff,
  User,
  LogOut,
  ShieldCheck,
  MapPin,
  HelpCircle,
  ChevronDown,
  MessageSquare,
  BookMarked,
  Heart,
  AlertTriangle,
  Package,
  X,
  Sun,
  Moon,
  Globe,
  Mail,
  Wallet,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { notificationApi, categoryApi, wantedApi } from "../api/endpoints";
import { useNotificationSocket } from "../hooks/useNotificationSocket";
import { usePushNotification } from "../hooks/usePushNotification";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  // { to: "/dashboard", label: "Explore Items", icon: Home },
  { to: "/resources", label: "Explore Items", icon: HelpCircle },
  { to: "/campus-needs", label: "Campus Needs", icon: Globe },
  { to: "/my-needs", label: "My Needs", icon: MessageSquare },
  { to: "/my-listings", label: "My Listings", icon: Package },
  { to: "/my-bookings", label: "My Bookings", icon: Calendar },
  { to: "/transactions", label: "Wallet & Payments", icon: Wallet },
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
    localStorage.getItem(`crss_loc_${user?.id}`) || ""
  );
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const locationDropdownRef = useRef(null);

  const [savedLocations, setSavedLocations] = useState(() => {
    try {
      const saved = localStorage.getItem(`crss_saved_locs_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    if (user?.id) {
      const loc = localStorage.getItem(`crss_loc_${user.id}`);
      if (loc) setSelectedLocation(loc);

      try {
        const saved = localStorage.getItem(`crss_saved_locs_${user.id}`);
        if (saved) setSavedLocations(JSON.parse(saved));
      } catch (e) {}
    }
  }, [user?.id]);

  useEffect(() => {
    const handleLocationChange = () => {
      const newLoc = localStorage.getItem(`crss_loc_${user?.id}`) || "";
      setSelectedLocation(newLoc);
    };
    window.addEventListener("locationChanged", handleLocationChange);
    return () => window.removeEventListener("locationChanged", handleLocationChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLocation = (loc) => {
    if (!loc || !loc.trim()) return;
    const cleanLoc = loc.trim();
    setSelectedLocation(cleanLoc);
    localStorage.setItem(`crss_loc_${user?.id}`, cleanLoc);
    
    setSavedLocations((prev) => {
      const newList = [cleanLoc, ...prev.filter((l) => l !== cleanLoc)].slice(0, 5);
      localStorage.setItem(`crss_saved_locs_${user?.id}`, JSON.stringify(newList));
      return newList;
    });

    setShowLocationDropdown(false);
    window.dispatchEvent(new Event("locationChanged"));
    toast.success(`Location set to: ${cleanLoc}`);
  };

  const fetchUnreadCount = () => {
    notificationApi
      .list()
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  useEffect(() => {
    window.addEventListener("refreshUnreadCount", fetchUnreadCount);
    return () => window.removeEventListener("refreshUnreadCount", fetchUnreadCount);
  }, []);

  useNotificationSocket(() => {
    setUnreadCount((prev) => prev + 1);
    window.dispatchEvent(new Event("refreshNotificationsList"));
  }, user);
  usePushNotification(user);

  // Theme dark/light mode state and logic
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    const legacy = localStorage.getItem("share_neighbour_dark_mode");
    if (legacy !== null) return legacy === "true" ? "dark" : "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
    localStorage.setItem("share_neighbour_dark_mode", theme === "dark" ? "true" : "false");
    window.dispatchEvent(new Event("themeChanged"));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const [showPostNeedModal, setShowPostNeedModal] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [needFormData, setNeedFormData] = useState({ title: "", description: "", category_id: "", start_date: today, end_date: tomorrow });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (showPostNeedModal && categories.length === 0) {
      categoryApi.list()
        .then(({ data }) => setCategories(Array.isArray(data) ? data : (data?.items || [])))
        .catch(() => { });
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
      setNeedFormData({ title: "", description: "", category_id: "", start_date: today, end_date: tomorrow });

      // Notify pages that wanted request is posted
      window.dispatchEvent(new Event("wantedCreated"));

      if (location.pathname !== "/campus-needs") {
        navigate("/campus-needs");
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
        <Link to="/explore" className="flex items-center gap-3 px-6 py-6 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 group-hover:scale-105 transition-all duration-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col truncate">
            <span className="font-display text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">Campus Resource</span>
            <span className="font-display text-[15px] font-extrabold text-primary-600 dark:text-primary-400 tracking-tight leading-tight truncate">Sharing</span>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || (to !== "/resources" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${isActive
                  ? "bg-primary-600 text-white shadow-md shadow-primary-600/10 hover:bg-primary-700"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{label}</span>
                
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${location.pathname.startsWith("/admin")
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
            <Link to={user?.id ? `/users/${user.roll_no || user.id}` : "/profile"} className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 p-1.5 -ml-1.5 transition-colors cursor-pointer group">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-sm font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
                {(user?.full_name?.charAt(0) || "U").toUpperCase()}
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
          {/* Welcome Text & Location Selector */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-sm text-slate-500 dark:text-slate-400 font-medium">
              Hello, <span className="text-slate-800 dark:text-white font-bold">{user?.full_name?.split(" ")[0] || "Neighbor"}</span> 👋
            </span>

            {/* LOCATION SELECTOR IN HEADER NAVBAR */}
            <div className="relative" ref={locationDropdownRef}>
              <button
                type="button"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-150 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all active:scale-95 shadow-xs"
                title="Select location"
              >
                <MapPin className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                <span className="max-w-[130px] sm:max-w-[200px] truncate font-bold">{selectedLocation || "All Campus Locations"}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${showLocationDropdown ? "rotate-180" : ""}`} />
              </button>

              {/* LOCATION DROPDOWN MENU */}
              {showLocationDropdown && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation("");
                        localStorage.removeItem(`crss_loc_${user?.id}`);
                        setShowLocationDropdown(false);
                        window.dispatchEvent(new Event("locationChanged"));
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${!selectedLocation
                        ? "bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                    >
                      <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${!selectedLocation ? "text-primary-600 dark:text-primary-400" : "text-slate-400"}`} />
                      <span className="truncate">All Campus Locations</span>
                    </button>
                  </div>
                  {savedLocations.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1.5 px-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Saved Locations</p>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {savedLocations.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${selectedLocation === loc
                              ? "bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                          >
                            <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${selectedLocation === loc ? "text-primary-600 dark:text-primary-400" : "text-slate-400"}`} />
                            <span className="truncate">{loc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-2 px-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Add a Location</p>
                  </div>

                  {/* Custom Location Input */}
                  <div className="px-1">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (customLocationInput.trim()) {
                          handleSelectLocation(customLocationInput.trim());
                          setCustomLocationInput("");
                        }
                      }}
                      className="flex gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Enter location name..."
                        value={customLocationInput}
                        onChange={(e) => setCustomLocationInput(e.target.value)}
                        className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs shrink-0"
                      >
                        Set
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
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

            {/* Wishlist Link in Navbar */}
            <Link
              to="/wishlist"
              className={`relative rounded-2xl border p-2.5 transition-all active:scale-95 shadow-xs ${
                location.pathname === "/wishlist"
                  ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                  : "border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
              }`}
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart className={`h-4.5 w-4.5 ${location.pathname === "/wishlist" ? "fill-current" : ""}`} />
            </Link>

            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                className="relative rounded-2xl border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95 shadow-xs"
                title="View Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 whitespace-nowrap">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

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
          <Outlet context={{ theme, toggleTheme, isDarkMode: theme === "dark" }} />
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

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Needed From</label>
                  <input
                    type="date"
                    required
                    min={today}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    value={needFormData.start_date}
                    onChange={(e) => setNeedFormData({ ...needFormData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Needed Until</label>
                  <input
                    type="date"
                    required
                    min={needFormData.start_date || today}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100"
                    value={needFormData.end_date}
                    onChange={(e) => setNeedFormData({ ...needFormData, end_date: e.target.value })}
                  />
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