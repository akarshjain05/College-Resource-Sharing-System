import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Compass, Plus, PackageOpen, Users, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet-async";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/resources?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/resources");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body text-slate-800 dark:text-slate-100 transition-colors duration-200 flex flex-col">
      <Helmet>
        <title>Campus Resource Sharing System</title>
      </Helmet>

      {/* Modern Floating Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 p-1">
              <img src="/logo.png" className="h-full w-full object-contain" alt="CRSS Logo" />
            </div>
            <span className="font-display text-[15px] font-extrabold text-ink-900 dark:text-white tracking-tight hidden sm:block">
              Campus Resource <span className="text-primary-600 dark:text-primary-400">Sharing</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/resources"
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all shadow-sm active:scale-95"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all shadow-sm active:scale-95"
                >
                  Join Now
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary-50/80 to-transparent dark:from-primary-900/10 z-0 pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/50 dark:bg-indigo-900/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-200/50 dark:bg-blue-900/20 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10 flex flex-col items-center text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Live for Campus Students</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-ink-900 dark:text-white tracking-tight leading-[1.1] max-w-4xl mb-6">
            Share resources securely.<br className="hidden sm:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">Save money together.</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl font-medium mb-10 leading-relaxed">
            Borrow cameras, lab equipment, textbooks, and sports gear from your peers. Why buy when you can borrow from your campus community?
          </p>

          {/* Huge Search Bar */}
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 mb-10 flex items-center">
            <form onSubmit={handleSearch} className="flex-1 flex items-center relative">
              <Search className="absolute left-4 h-6 w-6 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you need today?"
                className="w-full pl-14 pr-4 py-3 sm:py-4 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 text-lg sm:text-xl font-medium outline-none"
              />
              <button 
                type="submit" 
                className="hidden sm:flex shrink-0 items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 ml-2"
              >
                Search <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/resources"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold shadow-sm transition-all"
            >
              <Compass className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Explore All Items
            </Link>
            <Link
              to="/wanted"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold shadow-sm transition-all"
            >
              <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Post a Campus Need
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                <PackageOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 dark:text-white mb-2">Reduce Waste</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Share items that are rarely used and help create a sustainable campus.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 dark:text-white mb-2">Secure & Verified</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Only verified campus members can access the platform. Safe deposits protect your gear.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 dark:text-white mb-2">Community First</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Connect with peers, build trust, and help each other succeed academically.</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} Campus Resource Sharing System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
