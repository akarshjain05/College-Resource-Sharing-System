import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Star,
  MapPin,
  Shield,
  Trash2,
  Edit3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Wallet,
  CreditCard,
  Heart,
  Clock
} from "lucide-react";
import { resourceApi, borrowApi, reviewApi, categoryApi, wishlistApi, getImageUrl } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

// Local Mock Items list matching Dashboard page to load details offline
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
      condition: "Good",
    },
  ]
};

export default function ResourceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [resource, setResource] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dates state
  const [startDate, setStartDate] = useState("2026-09-15");
  const [endDate, setEndDate] = useState("2026-09-17");
  const [submittingBorrow, setSubmittingBorrow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // Availability strip selected day (for mock calendar strip visual toggles)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(15);

  const load = () => {
    setLoading(true);
    
    // Check if loading a mock item
    if (id && id.startsWith("mock-")) {
      // Find item across all list categories
      const allMocks = [];
      const savedMocks = JSON.parse(localStorage.getItem("share_neighbour_mocks")) || LOCAL_MOCK_ITEMS;
      Object.values(savedMocks).forEach((arr) => allMocks.push(...arr));
      const found = allMocks.find((m) => m.id === id);

      if (found) {
        setResource({
          id: found.id,
          title: found.title,
          description: found.description || "No description provided.",
          condition: found.condition || "good",
          deposit_amount: found.deposit_amount,
          max_borrow_days: 7,
          pickup_location: found.distance + " away in Koramangala",
          average_rating: found.average_rating,
          reviews_count: found.reviews_count,
          total_borrows: found.reviews_count * 3,
          category: { id: "cat-1", name: found.category },
          owner: { id: "owner-1", full_name: found.owner, trust_score: 95 },
          images: [{ id: "img-1", image_url: found.image_placeholder, is_primary: true }],
        });

        // Inject high-fidelity reviews from mockups
        const mockReviews = [
          {
            id: "rev-1",
            rating: 5,
            comment: found.category === "Tools" 
              ? "Drill works perfectly. Rahul is very helpful and on time." 
              : "Excellent item, clean and fully operational. Highly recommend.",
            created_at: "2026-08-12T10:00:00Z",
            reviewer: { id: "rev-user-1", full_name: "Amit Verma" },
          },
          {
            id: "rev-2",
            rating: 5,
            comment: found.category === "Tools" 
              ? "Great ladder, very sturdy. Easy pickup and smooth experience." 
              : "Splendid transaction, neighbor was super flexible with returning.",
            created_at: "2026-08-05T10:00:00Z",
            reviewer: { id: "rev-user-2", full_name: "Priya Nair" },
          },
        ];
        setReviews(mockReviews);
        setLoading(false);
        return;
      }
    }

    // Actual database resource load
    Promise.all([resourceApi.get(id), reviewApi.listForResource(id)])
      .then(([resResp, revResp]) => {
        setResource(resResp.data);
        setReviews(revResp.data);
      })
      .catch((err) => {
        // Fallback item if DB throws error during demo
        toast.error("Could not fetch database item, displaying fallback.");
        const fallback = {
          id: id,
          title: "Aluminium Ladder (7 Step)",
          description: "Sturdy 7 step aluminium ladder. Perfect for home painting, bulb changing, etc.",
          condition: "Good",
          deposit_amount: 500,
          max_borrow_days: 7,
          pickup_location: "0.3 km away",
          average_rating: 4.7,
          reviews_count: 15,
          total_borrows: 45,
          category: { id: "cat-1", name: "Tools" },
          owner: { id: "owner-1", full_name: "Rahul Sharma", trust_score: 98, avg_response_seconds: 3600 },
          images: [{ id: "img-1", image_url: "🪜", is_primary: true }],
          is_wishlisted: false,
        };
        setResource(fallback);
      })
      .finally(() => {
        setLoading(false);
        if (resource) setIsWishlisted(resource.is_wishlisted);
      });
  };

  useEffect(() => {
    if (resource) setIsWishlisted(resource.is_wishlisted);
  }, [resource]);

  useEffect(() => {
    load();
  }, [id]);

  if (loading || !resource) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-3xl" />
          <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Calculate days difference
  const getDaysCount = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return isNaN(diffDays) ? 1 : diffDays;
  };

  const daysCount = getDaysCount();
  const dailyPrice = resource.daily_price || 90;
  const rentAmount = dailyPrice * daysCount;
  const securityDeposit = resource.deposit_amount || 500;
  const totalAmount = rentAmount + securityDeposit;

  const handleBorrowRequest = async (e) => {
    e.preventDefault();
    setSubmittingBorrow(true);

    const bookingRequestPayload = {
      id: "mock-book-" + Date.now(),
      resource: {
        id: resource.id,
        title: resource.title,
        image_placeholder: resource.images?.[0]?.image_url || "🪜",
      },
      requested_start_date: startDate,
      requested_end_date: endDate,
      total_days: daysCount,
      rent_amount: rentAmount,
      deposit_amount: securityDeposit,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: "requested",
      created_at: new Date().toISOString(),
      lender: {
        full_name: resource.owner.full_name,
      },
    };

    // Save mock booking locally
    const savedBookings = JSON.parse(localStorage.getItem("share_neighbour_bookings") || "[]");
    savedBookings.unshift(bookingRequestPayload);
    localStorage.setItem("share_neighbour_bookings", JSON.stringify(savedBookings));

    // Also trigger the API call if it's a real resource
    if (!id.startsWith("mock-")) {
      try {
        await borrowApi.create({
          resource_id: resource.id,
          requested_start_date: startDate,
          requested_end_date: endDate,
          purpose: "Borrowed via ShareNeighbour",
        });
      } catch (err) {
        console.log("Database booking request failed (might be offline):", err);
      }
    }

    // Add visual notification
    const savedNotifs = JSON.parse(localStorage.getItem("share_neighbour_notifs") || "[]");
    savedNotifs.unshift({
      id: "notif-" + Date.now(),
      title: "Booking request sent",
      message: `Your request to borrow ${resource.title} from ${resource.owner.full_name} has been sent successfully.`,
      created_at: new Date().toISOString(),
      is_read: false,
      type: "calendar",
    });
    localStorage.setItem("share_neighbour_notifs", JSON.stringify(savedNotifs));

    setTimeout(() => {
      setSubmittingBorrow(false);
      toast.success("Request sent to neighbor!");
      navigate("/borrow-requests");
    }, 800);
  };

  const isOwner = resource.owner?.id === user?.id;

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error("Please login to wishlist items");
      return;
    }
    try {
      if (isWishlisted) {
        await wishlistApi.remove(resource.id);
        setIsWishlisted(false);
      } else {
        await wishlistApi.add(resource.id);
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch (err) {
      toast.error("Failed to update wishlist");
    }
  };

  const formatAvgResponseTime = (seconds) => {
    if (seconds == null) return "No response data";
    if (seconds < 3600) return "Usually responds within an hour";
    if (seconds < 86400) return `Usually responds within ${Math.round(seconds / 3600)} hours`;
    return `Usually responds in ${Math.round(seconds / 86400)} days`;
  };

  // Visual Mock Calendar Strip selector
  const handleCalendarStripClick = (dayNumber) => {
    setSelectedCalendarDay(dayNumber);
    // Auto-update dates inputs to match Sept 13-16 flow in mockup
    setStartDate(`2026-09-${dayNumber}`);
    const nextDay = dayNumber + 2;
    setEndDate(`2026-09-${nextDay}`);
    toast.success(`Selected Dates: Sept ${dayNumber} to Sept ${nextDay}`);
  };

  return (
    <div className="space-y-6">
      {/* Back to explore */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Explore
      </button>

      {/* Main split details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Media Gallery, Desc, Reviews (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Gallery showcase */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden p-6 shadow-sm">
            <div className="relative aspect-video w-full rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
              <span className="text-8xl select-none">{resource.images?.[0]?.image_url || "🛠️"}</span>
              
              {/* Floating rating overlay */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200/80 px-3.5 py-1.5 shadow-sm flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-slate-800">{resource.average_rating}</span>
                <span className="text-[10px] text-slate-400 font-semibold">({resource.reviews_count} reviews)</span>
              </div>
              
              <button 
                onClick={handleWishlistToggle}
                className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm transition-all ${
                  isWishlisted 
                    ? "bg-red-50 text-red-500 shadow-sm border border-red-100" 
                    : "bg-white/80 text-slate-500 hover:bg-white hover:text-red-500 hover:shadow-sm border border-slate-200"
                }`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Title & Stats */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-600 uppercase">
                  {resource.category?.name || "Tools"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {resource.total_borrows || 45} bookings completed
                </span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-slate-900 leading-tight">
                {resource.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{resource.pickup_location || "Koramangala, Bengaluru"}</span>
              </div>
            </div>
          </div>

          {/* Owner details card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-base shadow-sm">
                {resource.owner?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium leading-none">Listed by Owner</p>
                <h3 className="font-bold text-slate-800 text-sm mt-1">{resource.owner?.full_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-slate-400 font-semibold">{resource.pickup_location?.split("away")[0]} away</p>
                  {resource.owner?.avg_response_seconds != null && (
                    <>
                      <span className="text-slate-300">•</span>
                      <p className="text-[10px] text-primary-600 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatAvgResponseTime(resource.owner?.avg_response_seconds)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => toast.success(`Viewing profile of ${resource.owner?.full_name}`)}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-all shadow-sm active:scale-95"
            >
              View Profile
            </button>
          </div>

          {/* Description */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {resource.description}
            </p>
          </div>

          {/* Availability Strips component (Screen 3) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Availability Calendar</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Select a start date from the calendar ribbon</p>
            </div>
            
            <div className="grid grid-cols-5 gap-2.5">
              {[
                { dayNum: 13, dayName: "SAT", isAvail: true },
                { dayNum: 14, dayName: "SUN", isAvail: true },
                { dayNum: 15, dayName: "MON", isAvail: true },
                { dayNum: 16, dayName: "TUE", isAvail: true },
              ].map((day) => (
                <button
                  key={day.dayNum}
                  onClick={() => handleCalendarStripClick(day.dayNum)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                    selectedCalendarDay === day.dayNum
                      ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/10 scale-102"
                      : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100/50 hover:text-slate-800"
                  }`}
                >
                  <span className="text-[9px] font-bold tracking-wider opacity-80">{day.dayName}</span>
                  <span className="text-base font-extrabold mt-1">{day.dayNum}</span>
                </button>
              ))}
              
              <button
                onClick={() => toast.success("Opening full calendar view...")}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-semibold text-center transition-all"
              >
                <span className="text-[9px] font-bold tracking-wider">MORE</span>
                <Calendar className="h-4 w-4 mt-1.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Reviews & Overall score card (Screen 6) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reviews & Trust Score</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                <span className="font-display text-5xl font-extrabold text-slate-900 leading-none">
                  {resource.average_rating}
                </span>
                <div className="flex justify-center gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                  Overall Rating <br />({resource.reviews_count} reviews)
                </p>
              </div>
              
              <div className="md:col-span-8 space-y-2">
                {[
                  { stars: 5, count: 11, percentage: "73%" },
                  { stars: 4, count: 3, percentage: "20%" },
                  { stars: 3, count: 1, percentage: "7%" },
                  { stars: 2, count: 0, percentage: "0%" },
                ].map((row) => (
                  <div key={row.stars} className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
                    <span className="w-3 text-right">{row.stars}★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: row.percentage }} />
                    </div>
                    <span className="w-5 text-slate-400 text-right">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List of comments */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {reviews.map((rev) => (
                <div key={rev.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {rev.reviewer?.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{rev.reviewer?.full_name}</h4>
                        <p className="text-[9px] text-slate-400 font-medium">12 Aug 2026</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-600 pl-9 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Request/Booking Widget & Sidebar Controls */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          
          {/* Owner Info Box (from main) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Shared by</p>
            <Link 
              to={`/users/${resource.owner.id}`} 
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-100 font-bold text-forest-700">
                {resource.owner.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-display text-base font-semibold text-ink-900 group-hover:text-forest-700 transition-colors">
                  {resource.owner.full_name}
                </p>
                <p className="text-sm text-ink-500">{resource.owner.department || "Campus member"}</p>
              </div>
            </Link>
            
            <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between text-xs">
              <span className="text-ink-500 font-medium">Security Deposit:</span>
              <span className={`font-semibold ${resource.deposit_amount > 0 ? "text-forest-700" : "text-ink-600"}`}>
                {resource.deposit_amount > 0 ? `₹${resource.deposit_amount}` : "No deposit required"}
              </span>
            </div>
          </div>

          {/* Regular Borrow Form (using your friend's wrapper styling, but main's logic) */}
          {!isOwner && resource.status === "available" && (
            <form onSubmit={handleBorrowRequest} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg space-y-5">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900">Request to Borrow</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Deposit-backed transaction</p>
              </div>

              {/* Date selections */}
              <div className="space-y-2.5">
                <label className="label">Select Dates</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">FROM</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value && endDate) {
                          const s = new Date(e.target.value);
                          const eDate = new Date(endDate);
                          const diffDays = Math.ceil((eDate - s) / (1000 * 60 * 60 * 24));
                          if (diffDays > resource.max_borrow_days) setEndDate("");
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">TO</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      max={
                        startDate
                          ? new Date(new Date(startDate).setDate(new Date(startDate).getDate() + resource.max_borrow_days)).toISOString().split("T")[0]
                          : undefined
                      }
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span>Total Days</span>
                  <span className="text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-lg text-[11px]">{daysCount} days</span>
                </div>
              </div>

              {/* Price Details breakdown */}
              <div className="space-y-2.5 bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Price Details</h3>
                
                <div className="space-y-2 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>₹{dailyPrice} x {daysCount} days</span>
                    <span className="font-bold text-slate-800">₹{rentAmount}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="inline-flex items-center gap-1">
                      Security Deposit <span className="text-[9px] font-bold text-primary-600 bg-primary-50 px-1 py-0.5 rounded">Refundable</span>
                    </span>
                    <span className="font-bold text-slate-800">₹{securityDeposit}</span>
                  </div>
                  
                  <div className="h-px bg-slate-200/80 my-2" />
                  
                  <div className="flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-primary-600">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="label">Payment Method</label>
                
                <div className="space-y-2">
                  {/* UPI */}
                  <label className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    paymentMethod === "upi"
                      ? "border-primary-600 bg-primary-50/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-primary-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">UPI Method</p>
                        <p className="text-[10px] text-slate-400 font-semibold">.... 8567@paytm</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_opt"
                      value="upi"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                      className="h-4.5 w-4.5 text-primary-600 focus:ring-primary-500"
                    />
                  </label>

                  {/* Wallet */}
                  <label className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                    paymentMethod === "wallet"
                      ? "border-primary-600 bg-primary-50/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Wallet className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">My Wallet Balance</p>
                        <p className="text-[10px] text-slate-400 font-semibold">₹320 available</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_opt"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                      className="h-4.5 w-4.5 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submittingBorrow}
                className="w-full btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3.5 text-xs font-bold shadow-md shadow-primary-600/10 transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-98 disabled:opacity-50"
              >
                {submittingBorrow ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Send Request</span>
                    <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded text-[10px]">Pay ₹{totalAmount}</span>
                  </>
                )}
              </button>
            </form>
          )}


          {/* Safety instructions */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4.5 flex gap-2.5 text-slate-500">
            <Shield className="h-4.5 w-4.5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-medium">
              <span className="font-bold text-slate-700">Safety Guarantee:</span> Deposit is held securely in escrow. It will be returned in full once the owner confirms the item is returned in working condition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
