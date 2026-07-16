import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { resourceApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

// Large Mock items dataset with more items per neighborhood
const LOCAL_MOCK_ITEMS = {
  "Koramangala, Bengaluru": [
    {
      id: "mock-ladder-1",
      title: "Aluminium Ladder (7 Step)",
      category: "Tools",
      daily_price: 90,
      deposit_amount: 500,
      average_rating: 4.7,
      reviews_count: 15,
      distance: "0.3 km",
      owner: "Rahul Sharma",
      image_placeholder: "🪜",
      description: "Sturdy 7 step aluminium ladder. Perfect for home painting, bulb changing, etc. Well maintained.",
      coordinates: { x: 35, y: 40 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-drill-1",
      title: "Bosch Drill Machine",
      category: "Tools",
      daily_price: 150,
      deposit_amount: 500,
      average_rating: 4.8,
      reviews_count: 23,
      distance: "0.5 km",
      owner: "Amit Patel",
      image_placeholder: "🔌",
      description: "Powerful drill machine. Used only a few times. Comes with standard bits.",
      coordinates: { x: 55, y: 25 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-projector-1",
      title: "Sony Full HD Projector",
      category: "Party",
      daily_price: 350,
      deposit_amount: 1200,
      average_rating: 4.9,
      reviews_count: 16,
      distance: "0.7 km",
      owner: "Praveen K.",
      image_placeholder: "📽️",
      description: "Super bright 3000 lumens projector. Ideal for movie nights and presentations. HDMI cable included.",
      coordinates: { x: 60, y: 45 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-speaker-1",
      title: "Sony Bluetooth Speaker",
      category: "Party",
      daily_price: 120,
      deposit_amount: 400,
      average_rating: 4.7,
      reviews_count: 11,
      distance: "0.4 km",
      owner: "Rahul Sharma",
      image_placeholder: "🔊",
      description: "Portable extra bass speaker with battery life of 12 hours. Waterproof and rugged.",
      coordinates: { x: 40, y: 20 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-cooler-1",
      title: "Cooler - Symphony",
      category: "Party",
      daily_price: 120,
      deposit_amount: 600,
      average_rating: 4.5,
      reviews_count: 8,
      distance: "0.8 km",
      owner: "Neha Iyer",
      image_placeholder: "❄️",
      description: "Large desert cooler for parties and events. Blows super cold air. Quiet operation.",
      coordinates: { x: 75, y: 65 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-mixer-1",
      title: "Mixer Grinder (Prestige)",
      category: "Kitchen",
      daily_price: 80,
      deposit_amount: 300,
      average_rating: 4.4,
      reviews_count: 5,
      distance: "0.4 km",
      owner: "Vikram Rao",
      image_placeholder: "🌪️",
      description: "Prestige 750W mixer grinder. Perfect for making batters, chutneys, and shakes.",
      coordinates: { x: 20, y: 70 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-racket-1",
      title: "Yonex Badminton Racket",
      category: "Sports",
      daily_price: 40,
      deposit_amount: 200,
      average_rating: 4.9,
      reviews_count: 12,
      distance: "0.2 km",
      owner: "Suresh Kumar",
      image_placeholder: "🏸",
      description: "Lightweight Yonex Carbonex racket. Newly strung, comes with dynamic cover.",
      coordinates: { x: 45, y: 80 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-tent-1",
      title: "4-Person Camping Tent",
      category: "Camping",
      daily_price: 250,
      deposit_amount: 800,
      average_rating: 4.6,
      reviews_count: 18,
      distance: "1.1 km",
      owner: "Rohit Singh",
      image_placeholder: "⛺",
      description: "Waterproof Quechua double dome tent. Pitch in 5 minutes. Includes sleeping mats.",
      coordinates: { x: 80, y: 30 },
      is_primary: true,
      condition: "Good",
    },
  ],
  "Indiranagar, Bengaluru": [
    {
      id: "mock-ladder-2",
      title: "Step Ladder (6 Step)",
      category: "Tools",
      daily_price: 85,
      deposit_amount: 400,
      average_rating: 4.6,
      reviews_count: 10,
      distance: "0.4 km",
      owner: "Monica Sen",
      image_placeholder: "🪜",
      description: "Compact 6 step ladder, perfect for indoor cleaning and shelf dusting.",
      coordinates: { x: 40, y: 45 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-drill-2",
      title: "Black & Decker Power Drill",
      category: "Tools",
      daily_price: 130,
      deposit_amount: 450,
      average_rating: 4.7,
      reviews_count: 19,
      distance: "0.6 km",
      owner: "Devendra G.",
      image_placeholder: "🔌",
      description: "Cordless drill driver. Comes with rechargeable battery and wall plugs.",
      coordinates: { x: 60, y: 30 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-saw-1",
      title: "Circular Hand Saw",
      category: "Tools",
      daily_price: 200,
      deposit_amount: 700,
      average_rating: 4.9,
      reviews_count: 5,
      distance: "0.9 km",
      owner: "Devendra G.",
      image_placeholder: "🪚",
      description: "Electric circular saw. Heavy duty speed control for wood planks cutting.",
      coordinates: { x: 65, y: 20 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-bbq-1",
      title: "Barbecue Grill Set",
      category: "Party",
      daily_price: 300,
      deposit_amount: 1000,
      average_rating: 4.9,
      reviews_count: 30,
      distance: "1.2 km",
      owner: "Kavita M.",
      image_placeholder: "🥩",
      description: "Portable charcoal BBQ grill. Comes with skewers, tongs, and a small bag of coal.",
      coordinates: { x: 70, y: 70 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-fryer-1",
      title: "Air Fryer (Philips)",
      category: "Kitchen",
      daily_price: 150,
      deposit_amount: 500,
      average_rating: 4.8,
      reviews_count: 14,
      distance: "0.7 km",
      owner: "Preeti K.",
      image_placeholder: "🍟",
      description: "Philips Essential Airfryer. Perfect for low-oil fries, nuggets, and baking.",
      coordinates: { x: 25, y: 55 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-cricket-1",
      title: "Kashmir Willow Cricket Kit",
      category: "Sports",
      daily_price: 100,
      deposit_amount: 500,
      average_rating: 4.5,
      reviews_count: 6,
      distance: "0.5 km",
      owner: "Arun B.",
      image_placeholder: "🏏",
      description: "Cricket bat, leg guards, batting gloves, and helmet. Good condition.",
      coordinates: { x: 30, y: 80 },
      is_primary: true,
      condition: "Good",
    },
  ],
  "HSR Layout, Bengaluru": [
    {
      id: "mock-ladder-3",
      title: "Heavy Duty Extension Ladder",
      category: "Tools",
      daily_price: 110,
      deposit_amount: 600,
      average_rating: 4.8,
      reviews_count: 25,
      distance: "0.3 km",
      owner: "Sridhar J.",
      image_placeholder: "🪜",
      description: "Extends up to 14 feet. Perfect for outdoor scaling and roof painting.",
      coordinates: { x: 30, y: 35 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-drill-3",
      title: "Rotary Hammer Drill",
      category: "Tools",
      daily_price: 180,
      deposit_amount: 700,
      average_rating: 4.9,
      reviews_count: 15,
      distance: "0.5 km",
      owner: "Mani K.",
      image_placeholder: "🔌",
      description: "Heavy duty hammer drill. Breaks concrete and brick walls with ease.",
      coordinates: { x: 50, y: 50 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-sound-1",
      title: "JBL Party Sound System",
      category: "Party",
      daily_price: 400,
      deposit_amount: 1500,
      average_rating: 4.7,
      reviews_count: 22,
      distance: "0.9 km",
      owner: "Rohan D.",
      image_placeholder: "🔊",
      description: "100W JBL party speaker with Bluetooth, mic input, and glowing party lights.",
      coordinates: { x: 75, y: 55 },
      is_primary: true,
      condition: "New",
    },
    {
      id: "mock-oven-1",
      title: "OTG Convection Oven",
      category: "Kitchen",
      daily_price: 120,
      deposit_amount: 400,
      average_rating: 4.3,
      reviews_count: 7,
      distance: "0.6 km",
      owner: "Meera A.",
      image_placeholder: "🍰",
      description: "Borosil 19L oven toaster grill. Great for baking cakes, pizzas, and grilling paneer.",
      coordinates: { x: 15, y: 65 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-backpack-1",
      title: "Hiking Backpack (65L)",
      category: "Camping",
      daily_price: 70,
      deposit_amount: 300,
      average_rating: 4.6,
      reviews_count: 11,
      distance: "0.8 km",
      owner: "Nitin S.",
      image_placeholder: "🎒",
      description: "Ergonomic mountain rucksack with rain cover and steel back support.",
      coordinates: { x: 45, y: 75 },
      is_primary: true,
      condition: "Good",
    },
  ],
  "Whitefield, Bengaluru": [
    {
      id: "mock-drill-4",
      title: "Skill Impact Drill",
      category: "Tools",
      daily_price: 110,
      deposit_amount: 400,
      average_rating: 4.5,
      reviews_count: 10,
      distance: "0.4 km",
      owner: "Harish S.",
      image_placeholder: "🔌",
      description: "Skill 550W impact drill machine. Ideal for home drilling on wood, metal or concrete. Easy speed control.",
      coordinates: { x: 40, y: 40 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-tent-2",
      title: "Camping Tent (2-person)",
      category: "Camping",
      daily_price: 150,
      deposit_amount: 500,
      average_rating: 4.7,
      reviews_count: 14,
      distance: "0.7 km",
      owner: "Sneha G.",
      image_placeholder: "⛺",
      description: "Double layer waterproof dome tent. Spacious room for 2 adults. Comes with stakes and carrying pouch.",
      coordinates: { x: 60, y: 60 },
      is_primary: true,
      condition: "Good",
    },
    {
      id: "mock-cooker-1",
      title: "Prestige Pressure Cooker",
      category: "Kitchen",
      daily_price: 50,
      deposit_amount: 200,
      average_rating: 4.6,
      reviews_count: 14,
      distance: "0.5 km",
      owner: "Kiran B.",
      image_placeholder: "🍲",
      description: "5L Aluminium outer lid pressure cooker. Ideal for quick rice boiling and stews cooking.",
      coordinates: { x: 30, y: 50 },
      is_primary: true,
      condition: "Good",
    },
  ]
};

// Store local mocks to localStorage for other pages to retrieve easily
localStorage.setItem("share_neighbour_mocks", JSON.stringify(LOCAL_MOCK_ITEMS));

const CATEGORIES = [
  { name: "Tools", icon: Wrench, color: "text-orange-500 bg-orange-50 hover:bg-orange-100" },
  { name: "Sports", icon: Trophy, color: "text-amber-500 bg-amber-50 hover:bg-amber-100" },
  { name: "Party", icon: Sparkles, color: "text-pink-500 bg-pink-50 hover:bg-pink-100" },
  { name: "Kitchen", icon: ChefHat, color: "text-emerald-500 bg-emerald-50 hover:bg-emerald-100" },
  { name: "Camping", icon: Tent, color: "text-indigo-500 bg-indigo-50 hover:bg-indigo-100" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [dbItems, setDbItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom interactive states
  const [locationName, setLocationName] = useState(
    localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru"
  );
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWelcome, setShowWelcome] = useState(
    localStorage.getItem("share_neighbour_hide_welcome") !== "true"
  );
  
  // UI states
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("share_neighbour_dark_mode") === "true"
  );
  
  const [favorites, setFavorites] = useState(
    JSON.parse(localStorage.getItem("share_neighbour_favs") || "{}")
  );

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("share_neighbour_dark_mode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("share_neighbour_dark_mode", "false");
    }
  }, [isDarkMode]);

  // Sync with AppShell location changes
  useEffect(() => {
    const handleLocationChange = () => {
      const newLoc = localStorage.getItem("share_neighbour_location") || "Koramangala, Bengaluru";
      setLocationName(newLoc);
    };

    window.addEventListener("locationChanged", handleLocationChange);
    return () => {
      window.removeEventListener("locationChanged", handleLocationChange);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    resourceApi.list({ page_size: 20 })
      .then(({ data }) => {
        const items = data?.items || [];
        setDbItems(items);
      })
      .catch((err) => {
        console.log("Database fetch failed, using local mock data.", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [locationName]);

  const toggleFavorite = (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const updated = {
      ...favorites,
      [itemId]: !favorites[itemId]
    };
    setFavorites(updated);
    localStorage.setItem("share_neighbour_favs", JSON.stringify(updated));
    toast.success(updated[itemId] ? "Added to Wishlist! ❤️" : "Removed from Wishlist.");
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
    const baseItems = LOCAL_MOCK_ITEMS[locationName] || LOCAL_MOCK_ITEMS["Koramangala, Bengaluru"];
    
    let merged = [...baseItems];
    if (dbItems.length > 0) {
      dbItems.forEach(dbItem => {
        if (!merged.find(m => m.title.toLowerCase() === dbItem.title.toLowerCase())) {
          merged.push({
            id: dbItem.id,
            title: dbItem.title,
            category: dbItem.category?.name || "Tools",
            daily_price: dbItem.deposit_amount ? Math.round(dbItem.deposit_amount * 0.1) : 100,
            deposit_amount: dbItem.deposit_amount || 300,
            average_rating: dbItem.average_rating || 5.0,
            reviews_count: dbItem.total_borrows || 0,
            distance: "0.6 km",
            owner: dbItem.owner?.full_name || "Neighbor",
            image_placeholder: "🛠️",
            description: dbItem.description,
            is_primary: true,
            condition: dbItem.condition || "Good",
          });
        }
      });
    }

    return merged.filter(item => {
      const matchCat = activeCategory ? item.category.toLowerCase() === activeCategory.toLowerCase() : true;
      const matchSearch = searchQuery
        ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.owner.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchCat && matchSearch;
    });
  };

  const filteredItems = getFilteredItems();

  // Helper to compile liked elements
  const getFavoriteItems = () => {
    const allMocks = [];
    Object.values(LOCAL_MOCK_ITEMS).forEach(arr => allMocks.push(...arr));
    return allMocks.filter(item => favorites[item.id]);
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
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.name;
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(isSelected ? null : cat.name)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap active:scale-95 border border-transparent ${
                  isSelected
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/10"
                    : `bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800`
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-500"}`} />
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
                    <span className="text-6xl transition-transform duration-500 group-hover:scale-115 select-none">{item.image_placeholder}</span>
                    
                    {/* Floating Distance Badge */}
                    <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-xs select-none">
                      📍 {item.distance}
                    </span>

                    {/* Bookmark Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute top-3 right-3 rounded-xl bg-white/95 dark:bg-slate-800/95 p-2.5 text-slate-400 dark:text-slate-500 shadow-md backdrop-blur-xs transition-all hover:bg-white hover:text-red-500 dark:hover:text-red-400 active:scale-90"
                    >
                      <Heart className={`h-4.5 w-4.5 ${favorites[item.id] ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400" : ""}`} />
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
                        {item.average_rating}
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
                  onClick={() => setIsDarkMode(!isDarkMode)}
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
                {["Koramangala, Bengaluru", "Indiranagar, Bengaluru", "HSR Layout, Bengaluru", "Whitefield, Bengaluru"].map((loc) => (
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
                  {sessionStorage.getItem("share_neighbour_user_score") || "15"}
                </p>
              </div>
            </div>
          </div>

          {/* Return Reminder Card (Screen 8 Clock icon) */}
          <div className="rounded-3xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/40 dark:bg-rose-950/5 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm flex-shrink-0">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-rose-700 dark:text-rose-450 leading-none">Due Tomorrow</h4>
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider mt-1">Return Alert</p>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 leading-normal">
              Return reminder: Bosch Drill Machine is due tomorrow by 6:00 PM.
            </p>
            
            <Link
              to="/borrow-requests"
              className="inline-flex items-center justify-center w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2 text-[10px] font-bold transition-colors shadow-sm shadow-rose-600/10 active:scale-95"
            >
              Mark as Returned
            </Link>
          </div>

          {/* Recent booking alerts list (Screen 8 checkmark/mail icons) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Recent Activity</h3>
              <Link to="/notifications" className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline">
                View All
              </Link>
            </div>
            
            <div className="space-y-3.5">
              {[
                { title: "Rahul Sharma accepted", msg: "Accepted request for Aluminium Ladder", time: "2m ago", type: "check" },
                { title: "Arjun Patel requested", msg: "Requested to borrow Bosch Drill Machine", time: "1h ago", type: "request" }
              ].map((act, i) => (
                <div key={i} className="flex gap-3 items-start border-b border-slate-50 dark:border-slate-850 last:border-0 pb-3 last:pb-0">
                  {act.type === "check" ? (
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
                      <span className="text-[9px] text-slate-400 font-semibold">{act.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">{act.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
