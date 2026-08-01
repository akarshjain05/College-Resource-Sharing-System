import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Wrench,
  Trophy,
  Sparkles,
  ChefHat,
  Tent,
  Search,
  Star,
  MapPin,
  Heart,
  ChevronRight,
  Info,
  X,
  ShieldCheck,
  TrendingUp,
  CircleDot,
  Compass,
  ChevronDown,
  Mail,
  CheckCircle,
  Clock,
  Sun,
  Moon,
  Trash2,
  Bookmark,
  Filter,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { resourceApi, getImageUrl, wishlistApi, categoryApi, borrowApi, notificationApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import DueBadge from "../components/DueBadge";


const getCategoryIcon = (name) => {
  const nm = (name || "").toLowerCase();
  if (nm.includes("tool")) return { icon: Wrench, color: "text-orange-500 bg-orange-50 hover:bg-orange-100" };
  if (nm.includes("sport")) return { icon: Trophy, color: "text-amber-500 bg-amber-50 hover:bg-amber-100" };
  if (nm.includes("party")) return { icon: Sparkles, color: "text-pink-500 bg-pink-50 hover:bg-pink-100" };
  if (nm.includes("kitchen")) return { icon: ChefHat, color: "text-emerald-500 bg-emerald-50 hover:bg-emerald-100" };
  if (nm.includes("camp") || nm.includes("tent")) return { icon: Tent, color: "text-indigo-500 bg-indigo-50 hover:bg-indigo-100" };
  return { icon: CircleDot, color: "text-blue-500 bg-blue-50 hover:bg-blue-100" };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [dbItems, setDbItems] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [locations, setLocations] = useState(["All Locations"]);
  const [loading, setLoading] = useState(true);
  
  // Custom interactive states
  const [locationName, setLocationName] = useState(
    localStorage.getItem("share_neighbour_location") || "All Locations"
  );
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWelcome, setShowWelcome] = useState(
    localStorage.getItem("share_neighbour_hide_welcome") !== "true"
  );
  
  // UI states
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  
  const outletContext = useOutletContext() || {};
  const [themeState, setThemeState] = useState(
    outletContext.theme || localStorage.getItem("theme") || "light"
  );
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem("theme") || (document.documentElement.classList.contains("dark") ? "dark" : "light");
      setThemeState(currentTheme);
    };
    window.addEventListener("themeChanged", handleThemeChange);
    return () => window.removeEventListener("themeChanged", handleThemeChange);
  }, []);

  const theme = outletContext.theme || themeState;
  const toggleTheme = outletContext.toggleTheme || (() => {
    const newTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", newTheme);
    localStorage.setItem("share_neighbour_dark_mode", newTheme === "dark" ? "true" : "false");
    window.dispatchEvent(new Event("themeChanged"));
  });
  const isDarkMode = theme === "dark";

  // Sync with AppShell location changes
  useEffect(() => {
    const handleLocationChange = () => {
      const newLoc = localStorage.getItem("share_neighbour_location") || "All Locations";
      setLocationName(newLoc);
    };

    window.addEventListener("locationChanged", handleLocationChange);
    return () => {
      window.removeEventListener("locationChanged", handleLocationChange);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, wishData, catData, notifData, borrowData] = await Promise.all([
        resourceApi.list({ page_size: 100 }),
        wishlistApi.list(),
        categoryApi.list().catch(() => ({ data: [] })),
        notificationApi.list().catch(() => ({ data: [] })),
        borrowApi.myRequests("active").catch(() => ({ data: [] }))
      ]);
      const items = resData.data?.items || [];
      setDbItems(items);
      setWishlistItems(wishData.data || []);
      setDbCategories(catData.data || []);
      setRecentNotifications(notifData.data || []);
      setActiveBorrows(borrowData.data || []);
      
      const locs = new Set(["All Locations"]);
      items.forEach(i => {
        if (i.pickup_location) locs.add(i.pickup_location);
      });
      setLocations(Array.from(locs));
    } catch (err) {
      console.log("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [locationName]);

  const toggleFavorite = async (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isFav = wishlistItems.some(i => i.id === itemId);
    try {
      if (isFav) {
        setWishlistItems(wishlistItems.filter(i => i.id !== itemId));
        await wishlistApi.remove(itemId);
        toast.success("Removed from Wishlist.");
      } else {
        const item = dbItems.find(i => i.id === itemId);
        if (item) {
          setWishlistItems([...wishlistItems, item]);
          await wishlistApi.add(itemId);
          toast.success("Added to Wishlist! ❤️");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
      loadData();
    }
  };

  const closeWelcomeBanner = () => {
    setShowWelcome(false);
    localStorage.setItem("share_neighbour_hide_welcome", "true");
  };

  const changeLocation = (loc) => {
    setLocationName(loc);
    localStorage.setItem("share_neighbour_location", loc);
    setShowLocationDropdown(false);
    window.dispatchEvent(new Event("locationChanged"));
  };

  // Compile active resources based on search, category and selected neighborhood
  const getFilteredItems = () => {
    let merged = [...dbItems].map(dbItem => ({
      id: dbItem.id,
      title: dbItem.title,
      category: dbItem.category?.name || "Other",
      daily_price: dbItem.daily_price || (dbItem.deposit_amount ? Math.round(dbItem.deposit_amount * 0.1) : 100),
      deposit_amount: dbItem.deposit_amount || 0,
      average_rating: dbItem.average_rating,
      reviews_count: dbItem.total_borrows || 0,
      distance: dbItem.distance ? `${dbItem.distance} km` : null,
      owner: dbItem.owner?.full_name || "Neighbor",
      image_placeholder: dbItem.images?.[0]?.image_url || "🛠️",
      description: dbItem.description,
      is_primary: true,
      condition: dbItem.condition || "Good",
      pickup_location: dbItem.pickup_location || "",
    }));

    return merged.filter(item => {
      const matchLoc = locationName === "All Locations" || item.pickup_location === locationName;
      const matchCat = activeCategory ? item.category.toLowerCase() === activeCategory.toLowerCase() : true;
      const matchSearch = searchQuery
        ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.owner.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchLoc && matchCat && matchSearch;
    });
  };

  const filteredItems = getFilteredItems();

  const getFavoriteItems = () => {
    return wishlistItems.map(dbItem => ({
      id: dbItem.id,
      title: dbItem.title,
      daily_price: dbItem.deposit_amount ? Math.round(dbItem.deposit_amount * 0.1) : 100,
      image_placeholder: dbItem.images?.[0]?.image_url || "🛠️",
    }));
  };
  const favItems = getFavoriteItems();

  return (
    <div className={`space-y-6 transition-colors duration-200 ${isDarkMode ? "dark" : ""}`}>
      
      {/* 1. WELCOME SPLASH COMPONENT (Collapsible Banner) */}
      {showWelcome && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-750 p-6 md:p-8 text-white shadow-xl animate-in fade-in duration-300">
          <button
            onClick={closeWelcomeBanner}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-all"
            aria-label="Close welcome banner"
          >
            <X className="h-4.5 w-4.5" />
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm">
                <Compass className="h-3.5 w-3.5" /> Introducing ShareNeighbour
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                Borrow. Lend. <br />
                <span className="text-primary-100">Build Community.</span>
              </h1>
              <p className="max-w-md text-sm md:text-base text-primary-50 font-medium leading-relaxed">
                Everything you need already exists two doors down. List what you rarely use, and borrow what you don't own. Save money and support your neighbors.
              </p>
            </div>
            
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { title: "Borrow items nearby", desc: "Access tools, equipment, sports gear in minutes.", icon: "📍" },
                { title: "Earn by lending idle items", desc: "Turn your unused garage items into pocket money.", icon: "💰" },
                { title: "Safe, deposit-backed", desc: "Complete peace of mind with security deposits.", icon: "🛡️" },
                { title: "Save money, reduce waste", desc: "Help the environment by buying less and sharing more.", icon: "♻️" }
              ].map((feat, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/10 transition-all hover:bg-white/15">
                  <div className="text-xl mb-1">{feat.icon}</div>
                  <h3 className="text-xs font-bold text-white mb-0.5">{feat.title}</h3>
                  <p className="text-[10px] text-primary-100 leading-normal">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. PROMO CARD BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-primary-600 dark:from-slate-800 dark:to-slate-700 p-6 text-white shadow-premium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-transparent dark:border-slate-700">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-display">Share more. Spend less. Live better.</h2>
              <p className="text-xs text-blue-100 dark:text-slate-300">Browse available items in <span className="font-semibold text-white underline">{locationName}</span> right now.</p>
            </div>
            <Link
              to="/resources"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-primary-600 dark:text-white px-4.5 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 border border-transparent dark:border-slate-650"
            >
              <span>See All Listings</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. CATEGORIES & SEARCH CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Category Icons Selector */}
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
              activeCategory === null
                ? "bg-primary-600 text-white shadow-md shadow-primary-600/10"
                : "bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            All Items
          </button>
          {dbCategories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            const { icon: Icon } = getCategoryIcon(cat.name);
            return (
              <button
                key={cat.id || cat.name}
                onClick={() => setActiveCategory(isSelected ? null : cat.name)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap active:scale-95 border border-transparent ${
                  isSelected
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/10"
                    : `bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800`
                }`}
              >
                {Icon && <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-500"}`} />}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, categories, or neighbors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-405 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN SPLIT GRID (Nearby Items vs Rightbar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Items Grid (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Nearby Items <span className="text-xs text-slate-400 font-semibold">({filteredItems.length} available)</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>Within 1.5 km of center</span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 p-12 text-center">
              <Info className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No items match your criteria</p>
              <p className="mt-1 text-xs text-slate-400">Try changing your location, category filter, or search query.</p>
              <button
                onClick={() => {
                  setActiveCategory(null);
                  setSearchQuery("");
                }}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/resources/${item.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none"
                >
                  {/* REDESIGNED Item Image Container */}
                  <div className="relative aspect-4/3 w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
                    {item.image_placeholder && (
                      item.image_placeholder.startsWith("/") ||
                      item.image_placeholder.startsWith("http") ||
                      item.image_placeholder.startsWith("data:")
                    ) ? (
                      <img
                        src={getImageUrl(item.image_placeholder)}
                        alt={item.title}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-6xl transition-transform duration-500 group-hover:scale-115 select-none">{item.image_placeholder}</span>
                    )}
                    
                    {/* Floating Distance Badge */}
                    {item.distance && (
                      <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-xs select-none">
                        📍 {item.distance}
                      </span>
                    )}

                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute top-3 right-3 rounded-xl bg-white/95 dark:bg-slate-800/95 p-2.5 text-slate-400 dark:text-slate-500 shadow-md backdrop-blur-xs transition-all hover:bg-white hover:text-red-500 dark:hover:text-red-400 active:scale-90"
                    >
                      <Heart className={`h-4.5 w-4.5 ${wishlistItems.some(i => i.id === item.id) ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400" : ""}`} />
                    </button>
                    
                    {/* Category Label */}
                    <span className="absolute top-3 left-3 rounded-lg bg-primary-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-md select-none">
                      {item.category}
                    </span>
                  </div>

                  {/* REDESIGNED Card Content */}
                  <div className="flex-1 p-4.5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      {/* Price highlights */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-400">
                          Daily Rental fee
                        </p>
                        <p className="text-xs font-semibold text-slate-400">
                          Deposit: <span className="font-bold text-slate-700 dark:text-slate-200">₹{item.deposit_amount}</span>
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs font-medium text-slate-400 flex items-baseline gap-1">
                          <span className="text-xl font-extrabold text-primary-600 dark:text-primary-400">₹{item.daily_price}</span>/day
                        </p>
                        <span className="inline-block text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
                          {item.condition}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      
                      {/* Description summary */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer Row (Owner avatar + Ratings) */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="h-6.5 w-6.5 rounded-lg bg-gradient-to-tr from-slate-200 to-slate-350 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {item.owner.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-600 dark:text-slate-400">{item.owner}</span>
                      </div>

                      <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-lg">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {item.average_rating !== null && item.average_rating !== undefined ? item.average_rating : "New"}
                        <span className="font-medium text-slate-400">({item.reviews_count})</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Rightbar (4 Columns) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          
          {/* TOP BUTTONS CONTAINER: Wishlist, Theme Toggle, and Location Selector */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3.5 relative">
            <div className="flex justify-between items-center pb-1">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Your Neighborhood</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Select a community block</p>
              </div>

              {/* Theme & Wishlist Buttons */}
              <div className="flex gap-2">
                {/* 1. WISHLIST TOGGLE BUTTON */}
                <button
                  onClick={() => setShowWishlist(!showWishlist)}
                  className={`relative rounded-xl border p-2.5 transition-all active:scale-90 ${
                    showWishlist
                      ? "border-red-200 bg-red-50 text-red-500"
                      : "border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50"
                  }`}
                  title="Toggle Wishlist"
                >
                  <Heart className={`h-4.5 w-4.5 ${favItems.length > 0 && showWishlist ? "fill-red-500" : ""}`} />
                  {favItems.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {favItems.length}
                    </span>
                  )}
                </button>

                {/* 2. THEME TOGGLE BUTTON */}
                <button
                  onClick={toggleTheme}
                  className="rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-800 p-2.5 text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-90"
                  title="Toggle Theme"
                >
                  {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
            
            {/* Location dropdown selector */}
            <button
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex w-full items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/80 px-3.5 py-3 text-left text-sm font-semibold text-slate-850 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 transition-all active:scale-[0.99]"
            >
              <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
              <span className="truncate flex-1 text-xs font-bold">{locationName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>
            
            {showLocationDropdown && (
              <div className="absolute left-5 right-5 mt-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => changeLocation(loc)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                      locationName === loc
                        ? "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-extrabold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <MapPin className={`h-4 w-4 ${locationName === loc ? "text-primary-600 dark:text-primary-400" : "text-slate-400"}`} />
                    <span>{loc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* WISHLIST PANEL (Shows list of liked items when wishlist button toggled) */}
          {showWishlist && (
            <div className="rounded-3xl border border-red-100 dark:border-red-950/40 bg-red-50/10 dark:bg-red-950/5 p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  Wishlist Items ({favItems.length})
                </h3>
                <button
                  onClick={() => setShowWishlist(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {favItems.length === 0 ? (
                <div className="text-center py-4 text-xs font-semibold text-slate-400">
                  Your wishlist is empty. Tap the heart on explore cards to save items here!
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {favItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <Link to={`/resources/${item.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="h-10 w-10 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          {item.image_placeholder}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                            {item.title}
                          </h4>
                          <p className="text-[9px] font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                            ₹{item.daily_price} / day
                          </p>
                        </div>
                      </Link>
                      
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick trust metrics & stats */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Lending Overview</h3>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-850 p-3.5 border border-slate-100/50 dark:border-slate-800/50 text-center">
                <span className="text-xl">🛡️</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Trust Score</p>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{user?.trust_score ?? 100}%</p>
              </div>
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-850 p-3.5 border border-slate-100/50 dark:border-slate-800/50 text-center">
                <span className="text-xl">🤝</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Sharing Score</p>
                <p className="text-base font-extrabold text-primary-600 dark:text-primary-400 mt-0.5">
                  {user?.sharing_score || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Active Borrows / Return Reminder Card */}
          {activeBorrows.length > 0 && (
            <div className="rounded-3xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/40 dark:bg-rose-950/5 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm flex-shrink-0">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-rose-700 dark:text-rose-450 leading-none flex items-center gap-2">
                    Active Borrows
                    {activeBorrows[0].expected_return_date && (
                      <DueBadge 
                        endDate={activeBorrows[0].expected_return_date} 
                        status={activeBorrows[0].status} 
                      />
                    )}
                  </h4>
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider mt-1">{activeBorrows.length} active {activeBorrows.length === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
              
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 leading-normal">
                {activeBorrows[0].resource?.title} is currently borrowed by you.
              </p>
              
              <Link
                to="/borrow-requests"
                className="inline-flex items-center justify-center w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2 text-[10px] font-bold transition-colors shadow-sm shadow-rose-600/10 active:scale-95"
              >
                Manage Borrows
              </Link>
            </div>
          )}

          {/* Recent booking alerts list (Screen 8 checkmark/mail icons) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Recent Activity</h3>
              <Link to="/notifications" className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline">
                View All
              </Link>
            </div>
            
            <div className="space-y-3.5">
              {recentNotifications.length > 0 ? recentNotifications.slice(0, 5).map((act) => (
                <div key={act.id} className="flex gap-3 items-start border-b border-slate-50 dark:border-slate-850 last:border-0 pb-3 last:pb-0">
                  {act.type.includes("approve") || act.type.includes("confirm") ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-455 flex-shrink-0">
                      <CheckCircle className="h-4.5 w-4.5" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-455 flex-shrink-0">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{act.title}</h4>
                      <span className="text-[9px] text-slate-400 font-semibold">{new Date(act.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">{act.message}</p>
                  </div>
                </div>
              )) : (
                <div className="text-xs text-slate-400 text-center py-4">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
