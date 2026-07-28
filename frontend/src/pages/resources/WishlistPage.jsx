import { useEffect, useState } from "react";
import { BookMarked, SearchX } from "lucide-react";
import { wishlistApi } from "../../api/endpoints";
import ResourceCard from "../../components/ResourceCard";
import { Link } from "react-router-dom";

export default function WishlistPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const { data } = await wishlistApi.list();
      // Ensure the resources show up as wishlisted
      setResources(data.map(item => ({ ...item, is_wishlisted: true })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistUpdate = (resourceId, isWishlisted) => {
    if (!isWishlisted) {
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          <BookMarked className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Your Wishlist</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Items you've saved for later</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {resources.map((resource) => (
            <ResourceCard 
              key={resource.id} 
              resource={resource} 
              onWishlistUpdate={handleWishlistUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm mb-4">
            <SearchX className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">Your wishlist is empty</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            When you see something you want to borrow later, tap the heart icon to save it here.
          </p>
          <Link to="/resources" className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-700 hover:shadow-md hover:scale-102 active:scale-95">
            Explore Items
          </Link>
        </div>
      )}
    </div>
  );
}
