import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  TrendingUp,
  Package,
  MapPin,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  Award,
  MessageSquare,
} from "lucide-react";
import { usersApi } from "../../api/endpoints";
import ResourceCard from "../../components/ResourceCard";
import StatCard from "../../components/StatCard";
import NotFoundPage from "../errors/NotFoundPage";
import { useAuth } from "../../context/AuthContext";

export default function PublicProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sharedResources, setSharedResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("listings");

  const isOwnProfile = currentUser && (currentUser.id === userId || currentUser.id === profile?.id);

  useEffect(() => {
    setLoading(true);
    usersApi
      .getPublicProfile(userId)
      .then((res) => {
        setProfile(res.data.user);
        setSharedResources(res.data.shared_resources || []);
        setStats(res.data.stats);
        setRecentReviews(res.data.recent_reviews || []);
      })
      .catch((err) => setError(err.response?.status === 404 ? "404" : err.response?.data?.detail || "Failed to load user profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return <NotFoundPage message="This user profile doesn't exist or has been removed." />;
  }

  if (!profile) return null;
  const fullName = profile.full_name || "Neighbor User";

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
        {/* Banner Gradient */}
        <div className="h-36 bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 dark:from-slate-950 dark:via-primary-950 dark:to-slate-900 relative p-6">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Verified Member
            </span>
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar Circle */}
            <div className="-mt-14 h-28 w-28 rounded-3xl border-4 border-white dark:border-slate-900 bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-4xl font-extrabold text-white shadow-xl flex-shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>

            <div className="pt-3 flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-2.5xl font-black text-slate-900 dark:text-white tracking-tight">
                      {fullName}
                    </h1>
                    <span className="rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                      {profile.role || "Student"}
                    </span>
                  </div>

                  {profile.department && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <MapPin className="h-4 w-4 text-primary-500 flex-shrink-0" />
                      <span>
                        {profile.department} {profile.course && `• ${profile.course}`} {profile.year_of_study && `(Year ${profile.year_of_study})`}
                      </span>
                    </div>
                  )}
                </div>

                {isOwnProfile ? (
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                ) : (
                  <Link
                    to={`/complaints?against_user_id=${profile.id}&category=user_behavior&subject=${encodeURIComponent(`Report User: ${fullName}`)}`}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 px-4 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
                    title="Report user to platform admin"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Report User</span>
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Sharing Scores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Trust Score" value={profile.trust_score ?? 100} icon={Star} accent="brass" infoTooltip="Calculated from successful returns, verified transactions, and community feedback." />
        <StatCard label="Sharing Score" value={profile.sharing_score ?? 0} icon={TrendingUp} accent="emerald" infoTooltip="Points earned by lending items and contributing to campus resource sharing." />
      </div>

      {/* Community History Grid */}
      {stats && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-primary-600 dark:text-primary-400" /> Community Activity & Reputation
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-xl font-black text-slate-900 dark:text-white">
                <span>{stats.avg_borrower_rating ?? "5.0"}</span>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Borrower Rating</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {stats.returned_on_time ?? 0} <span className="text-xs text-slate-400 font-normal">/ {stats.total_borrows ?? 0}</span>
              </p>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Returned On Time</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-xl font-black text-slate-900 dark:text-white">
                <span>{stats.avg_lender_rating ?? "5.0"}</span>
                <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Lender Rating</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total_lends ?? 0}</p>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Total Items Lent</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Controls: Active Listings vs Reviews */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("listings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "listings"
                ? "bg-primary-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Actively Sharing ({sharedResources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "reviews"
                ? "bg-primary-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Community Reviews ({recentReviews.length})</span>
          </button>
        </div>

        {/* Tab 1: Shared Resources */}
        {activeTab === "listings" && (
          <div>
            {sharedResources.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Package className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                {fullName.split(" ")[0]} is not currently sharing any items on campus.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedResources.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reviews */}
        {activeTab === "reviews" && (
          <div>
            {recentReviews.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Star className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                No text reviews written yet for {fullName.split(" ")[0]}.
              </div>
            ) : (
              <div className="space-y-3">
                {recentReviews.map((r) => (
                  <div
                    key={r.id + r.role}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {r.reviewer_id ? (
                          <Link
                            to={`/users/${r.reviewer_id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                          >
                            {r.reviewer_name}
                          </Link>
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-white">{r.reviewer_name}</span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          As {r.role}
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-current" : "text-slate-200 dark:text-slate-800"}`} />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">"{r.review}"</p>

                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                      Regarding{" "}
                      {r.resource_id ? (
                        <Link to={`/resources/${r.resource_id}`} className="hover:underline font-bold text-slate-600 dark:text-slate-400 hover:text-primary-600">
                          {r.resource_title}
                        </Link>
                      ) : (
                        r.resource_title
                      )}{" "}
                      • {r.date ? new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
