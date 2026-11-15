"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { logout, type User } from "@/lib/api";

type NavbarProps = {
  user: User | null;
};

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  const initials =
    user?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ?? "";

  return (
    <header className="flex min-h-20 items-center justify-between border-b border-border bg-card px-5 py-4 sm:px-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
          MarketFlow Intelligence
        </p>

        <h2 className="mt-1 text-lg font-bold text-card-foreground">
          Dashboard
        </h2>
      </div>

      {user ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-card-foreground">
              {user.name}
            </p>

            <p className="text-xs text-muted-foreground">
              Research account
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={16} />

            <span className="hidden sm:inline">
              {isLoggingOut ? "Logging out..." : "Log out"}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <LogIn size={16} />
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
}