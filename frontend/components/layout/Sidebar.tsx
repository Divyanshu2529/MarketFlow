"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import {
  BarChart3,
  Bot,
  FileText,
  GitCompare,
  LayoutDashboard,
  Search,
  Settings,
  Star,
  TrendingUp,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Research",
    href: "/research",
    icon: Search,
  },
  {
    label: "MarketFlow Bot",
    href: "/assistant",
    icon: Bot,
  },
  {
    label: "Stock Analysis",
    href: "/stocks",
    icon: TrendingUp,
  },
  {
    label: "Compare",
    href: "/compare",
    icon: GitCompare,
  },
  {
    label: "Watchlist",
    href: "/watchlist",
    icon: Star,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

type SidebarProps = {
  isAuthenticated?: boolean;
  onProtectedAction?: (label: string) => void;
};

export function Sidebar({
  isAuthenticated = false,
  onProtectedAction,
}: SidebarProps) {
  const pathname = usePathname();

  function handleNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    label: string,
    href: string
  ) {
    const isDashboard = href === "/dashboard";

    if (!isAuthenticated && !isDashboard) {
      event.preventDefault();
      onProtectedAction?.(label);
    }
  }

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-border bg-card px-5 py-7 lg:flex">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <BarChart3 size={22} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-card-foreground">
            MarketFlow
          </h1>

          <p className="text-xs text-muted-foreground">
            AI Equity Research
          </p>
        </div>
      </div>

      <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Workspace
      </p>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) =>
                handleNavigation(
                  event,
                  item.label,
                  item.href
                )
              }
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-5">
        <div className="rounded-2xl border border-primary/10 bg-accent p-4">
          <p className="text-xs font-semibold text-primary">
            Research workspace
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Market intelligence in one place.
          </p>
        </div>
      </div>
    </aside>
  );
}