import { Link, useNavigate } from "react-router-dom";
import { SearchX, ArrowLeft, Home } from "lucide-react";

export default function NotFoundPage({ message = "The page or item you're looking for doesn't exist or has been removed." }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm">
        <SearchX className="h-14 w-14 text-slate-400 dark:text-slate-500" />
        <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-extrabold shadow-sm">
          404
        </div>
      </div>
      
      <h1 className="font-display text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
        Not Found
      </h1>
      
      <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-10 text-base leading-relaxed">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 text-sm font-bold transition-all shadow-sm shadow-primary-600/20 active:scale-95"
        >
          <Home className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
