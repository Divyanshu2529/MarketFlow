"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser, logout, User } from "@/lib/api";

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
    }

    loadUser();
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div>
        <p className="text-sm text-slate-400">
          AI Equity Research Platform
        </p>

        <h2 className="text-lg font-semibold text-white">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-300">
          {user?.name ?? "Loading..."}
        </span>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-red-900/50 hover:text-red-300 disabled:opacity-60"
        >
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </header>
  );
}