import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Eye, Plus, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
    <div className="min-h-screen bg-[#07244C] flex flex-col relative overflow-hidden font-body text-slate-100">
      {/* Background styling - Subtle dots pattern and glowing orbs */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl mix-blend-screen pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl mix-blend-screen pointer-events-none z-0"></div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 group-hover:scale-105 transition-all duration-300">
            <img src="/logo.png" className="h-full w-full object-contain" alt="Logo" />
          </div>
        </Link>

        {/* Center Links (Desktop only) */}
        <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
          <Link to="/" className="text-white hover:text-primary-300 transition-colors">Home</Link>
          <Link to="/resources" className="text-slate-300 hover:text-white transition-colors">Explore Resources</Link>
        </div>

        {/* Right Auth Section */}
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              to="/resources"
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all backdrop-blur-md"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-6 py-2 rounded-full border border-white/30 bg-transparent hover:bg-white/10 text-white font-semibold text-sm transition-all backdrop-blur-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mx-auto mt-[-5vh]">
        {/* Large Logo & Title */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="flex h-24 w-24 sm:h-32 sm:w-32 shrink-0 items-center justify-center rounded-3xl bg-white p-2 sm:p-4 mb-6 shadow-2xl shadow-black/20">
            <img src="/logo.png" className="h-full w-full object-contain" alt="CRSS Logo" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Campus Resource <br className="hidden sm:block" />
            <span className="text-primary-400">Sharing System</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl font-medium">
            A secure, campus-only platform to lend, borrow, and share items securely instead of buying things that sit idle.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl mb-8">
          <form onSubmit={handleSearch} className="relative group flex items-center">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 sm:py-5 border-none rounded-full leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/30 sm:text-lg font-medium shadow-xl transition-all"
              placeholder="Search for textbooks, lab coats, calculators..."
            />
            <button 
              type="submit" 
              className="hidden sm:flex absolute right-2 top-2 bottom-2 items-center justify-center px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-full transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/resources"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-all backdrop-blur-md"
          >
            <Eye className="w-5 h-5" />
            Explore Resources
          </Link>
          <Link
            to="/wanted"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-50 font-bold shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Post a Need
          </Link>
        </div>
      </main>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[60px] sm:h-[100px]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.71,73.47,137.93,80.7,212.15,75.46,249.25,72.84,285.82,63.06,321.39,56.44Z" fill="#f8fafc"></path>
        </svg>
      </div>
    </div>
  );
}
