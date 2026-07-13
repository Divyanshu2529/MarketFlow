import Link from "next/link";
import {
  BarChart3,
  Search,
  GitCompare,
  Star,
  FileText,
  Settings,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Research", href: "/company/AAPL", icon: Search },
  { label: "Compare", href: "/compare", icon: GitCompare },
  { label: "Watchlist", href: "/watchlist", icon: Star },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white px-4 py-6 lg:block">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
          <BarChart3 size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">MarketFlow</h1>
          <p className="text-xs text-slate-500">AI Equity Research</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-purple-50 hover:text-purple-700"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}