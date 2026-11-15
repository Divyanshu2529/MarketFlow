"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        await getCurrentUser();

        if (isMounted) {
          router.replace("/dashboard");
        }
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Checking your session...
    </main>
  );
}