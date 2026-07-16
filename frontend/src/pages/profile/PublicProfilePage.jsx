import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, TrendingUp, BookMarked, MapPin } from "lucide-react";
import { usersApi } from "../../api/endpoints";
import ResourceCard from "../../components/ResourceCard";
import StatCard from "../../components/StatCard";

export default function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [sharedResources, setSharedResources] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    usersApi.getPublicProfile(userId)
      .then((res) => {
        setProfile(res.data.user);
        setSharedResources(res.data.shared_resources);
        setStats(res.data.stats);
      })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-xl bg-ink-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-ink-100" />
          <div className="h-24 animate-pulse rounded-lg bg-ink-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="card p-10 text-center text-red-500">{error}</div>;
  }

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="card overflow-hidden">
        <div className="h-32 bg-forest-700"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="-mt-12 h-24 w-24 rounded-full border-4 border-white bg-forest-100 flex items-center justify-center text-3xl font-bold text-forest-800 shadow-md">
              {profile.full_name.charAt(0)}
            </div>
            <div className="pt-2 flex-1">
              <h1 className="font-display text-2xl font-bold text-ink-900">{profile.full_name}</h1>
              {profile.department && (
                <div className="mt-1 flex items-center gap-1 text-sm text-ink-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{profile.department} {profile.course && `• ${profile.course}`}</span>
                </div>
              )}
              {profile.bio && (
                <p className="mt-4 text-sm text-ink-700 max-w-2xl leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Scores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Trust Score" value={profile.trust_score} icon={Star} accent="brass" />
        <StatCard label="Sharing Score" value={profile.sharing_score} icon={TrendingUp} accent="forest" />
      </div>

      {/* Borrow/Lend Stats */}
      {stats && (
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Community History</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-ink-900">{stats.avg_borrower_rating} <Star className="inline h-4 w-4 text-brass-500 fill-brass-500 mb-1" /></p>
              <p className="text-xs text-ink-500 uppercase tracking-wide font-semibold mt-1">Borrower Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">{stats.returned_on_time} / {stats.total_borrows}</p>
              <p className="text-xs text-ink-500 uppercase tracking-wide font-semibold mt-1">Returned On Time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">{stats.avg_lender_rating} <Star className="inline h-4 w-4 text-forest-500 fill-forest-500 mb-1" /></p>
              <p className="text-xs text-ink-500 uppercase tracking-wide font-semibold mt-1">Lender Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">{stats.total_lends}</p>
              <p className="text-xs text-ink-500 uppercase tracking-wide font-semibold mt-1">Total Items Lent</p>
            </div>
          </div>
        </div>
      )}

      {/* Shared Resources */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-forest-700" />
          <h2 className="font-display text-xl font-semibold text-ink-900">Actively Sharing</h2>
        </div>
        {sharedResources.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-500">
            {profile.full_name.split(" ")[0]} is not currently sharing any resources.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedResources.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
