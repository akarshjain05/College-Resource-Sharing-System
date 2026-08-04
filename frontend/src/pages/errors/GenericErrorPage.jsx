import { Link } from "react-router-dom";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";

export default function GenericErrorPage({ message = "Something went wrong on our end. Please try again later.", onRetry }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm">
        <AlertOctagon className="h-14 w-14 text-slate-400 dark:text-slate-500" />
      </div>
      
      <h1 className="font-display text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
        Oops! Something went wrong
      </h1>
      
      <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-10 text-base leading-relaxed">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {onRetry ? (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        ) : null}
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
