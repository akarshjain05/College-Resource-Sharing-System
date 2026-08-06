import { Link } from "react-router-dom";

export default function ErrorState({ code, title, message, primaryAction, secondaryAction }) {
  return (
    <div className="min-h-[80vh] flex flex-col md:flex-row items-center justify-center p-6 gap-10 md:gap-16 animate-in fade-in duration-300">
      {/* Wireframe Graphic (LeetCode Style) */}
      <div className="relative flex flex-col items-center justify-center w-72 h-56 border-4 border-slate-200 dark:border-slate-800 rounded-3xl bg-transparent">
        <div className="absolute top-5 left-5 flex gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="text-7xl font-black text-slate-300 dark:text-slate-700 tracking-tighter font-display mt-4">
          {`{${code}}`}
        </div>
      </div>
      
      {/* Text Content */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm">
        <h1 className="font-display text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 font-medium">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {secondaryAction && (
            secondaryAction.onClick ? (
              <button
                onClick={secondaryAction.onClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-transparent px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
              >
                {secondaryAction.icon} {secondaryAction.label}
              </button>
            ) : (
              <Link
                to={secondaryAction.to}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-transparent px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
              >
                {secondaryAction.icon} {secondaryAction.label}
              </Link>
            )
          )}

          {primaryAction && (
            primaryAction.onClick ? (
              <button
                onClick={primaryAction.onClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 text-sm font-bold transition-all shadow-lg shadow-primary-600/20 active:scale-95"
              >
                {primaryAction.icon} {primaryAction.label}
              </button>
            ) : (
              <Link
                to={primaryAction.to}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 text-sm font-bold transition-all shadow-lg shadow-primary-600/20 active:scale-95"
              >
                {primaryAction.icon} {primaryAction.label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
