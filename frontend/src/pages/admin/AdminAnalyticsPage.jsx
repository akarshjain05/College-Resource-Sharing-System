import { useEffect, useState } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { Users, Package, IndianRupee, Gavel, Laptop, CheckCircle, AlertTriangle } from "lucide-react";
import { adminApi } from "../../api/endpoints";
import StatCard from "../../components/StatCard";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 shadow-lg rounded-xl">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-sm font-bold text-blue-600">
          Items Borrowed: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.dashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError("Failed to load analytics data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-96 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (error || !data) {
    return <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl border border-red-200">{error}</div>;
  }

  const { kpis, borrowing_trends, popular_categories, recent_activity } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-blue-100 p-2 rounded-full">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-slate-500">Total Active Users</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.total_active_users.toLocaleString()}</span>
          <span className="text-xs font-semibold text-emerald-500 mt-2 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Live
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-indigo-100 p-2 rounded-full">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-500">Total Items Shared</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.total_items_shared.toLocaleString()}</span>
          <span className="text-xs font-semibold text-emerald-500 mt-2 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Active
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-emerald-100 p-2 rounded-full">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-slate-500">Community Value (INR)</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2">₹{kpis.community_value_inr.toLocaleString()}</span>
          <span className="text-xs font-semibold text-emerald-500 mt-2 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Est.
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-rose-100 p-2 rounded-full">
            <Gavel className="w-5 h-5 text-rose-600" />
          </div>
          <span className="text-sm font-semibold text-slate-500">Active Disputes</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.active_disputes}</span>
          <span className="text-xs font-semibold text-rose-500 mt-2 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            Action Required
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Line Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Borrowing Trends Over Semester</h2>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={borrowing_trends} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBorrow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="items_borrowed" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorBorrow)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center">
            <div className="w-full sm:w-1/2">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Popular Categories</h2>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={popular_categories}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {popular_categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-3 pl-0 sm:pl-8 mt-4 sm:mt-0">
              {popular_categories.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 rounded-sm mr-3 shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-sm font-semibold text-slate-700 flex-1">{entry.name}</span>
                  <span className="text-sm font-bold text-slate-900">{entry.percentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Recent Activity) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col h-full max-h-[600px]">
          <h2 className="text-lg font-bold text-slate-800 mb-4 shrink-0">Recent Activity</h2>
          
          <div className="overflow-y-auto flex-1 pr-2 space-y-5 custom-scrollbar">
            {recent_activity.map((item, idx) => {
              const isListing = item.type === "listing";
              const isReturn = item.type === "return";
              const isDispute = item.type === "dispute";
              
              const date = new Date(item.timestamp);
              const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={item.id} className="flex gap-3 relative">
                  {/* Line connecting icons */}
                  {idx !== recent_activity.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-[-20px] w-0.5 bg-slate-100 z-0"></div>
                  )}
                  
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    isListing ? "bg-blue-100 text-blue-600" :
                    isReturn ? "bg-emerald-100 text-emerald-600" :
                    "bg-rose-100 text-rose-600"
                  }`}>
                    {isListing && <Laptop className="w-4 h-4" />}
                    {isReturn && <CheckCircle className="w-4 h-4" />}
                    {isDispute && <Gavel className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex flex-col pt-0.5 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 mb-1">{timeString}</span>
                    <span className="text-sm font-bold text-slate-800 leading-tight">{item.title}</span>
                    <span className="text-xs font-semibold text-slate-500 mt-0.5">{item.user}</span>
                  </div>
                </div>
              );
            })}
            
            {recent_activity.length === 0 && (
              <div className="text-center text-slate-500 text-sm font-medium py-10">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
