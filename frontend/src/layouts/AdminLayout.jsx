import { Link, Outlet, useLocation } from "react-router-dom";

const TABS = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/complaints", label: "Complaints" },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-ink-100">
        {TABS.map((tab) => {
          const active = tab.exact ? location.pathname === tab.to : location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-4 py-2 text-sm font-semibold ${
                active ? "border-b-2 border-brass-500 text-brass-700" : "text-ink-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
