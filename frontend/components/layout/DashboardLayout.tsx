"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Bot } from "lucide-react";

import { AIAssistant } from "@/components/assistant/AIAssistant";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { getCurrentUser, type User } from "@/lib/api";

import { Navbar } from "./navbar";
import { Sidebar } from "./Sidebar";

type DashboardAuthContextValue = {
  user: User | null;
  isLoading: boolean;
};

const DashboardAuthContext =
  createContext<DashboardAuthContextValue | null>(
    null
  );

export function useDashboardAuth() {
  const context = useContext(DashboardAuthContext);

  if (!context) {
    throw new Error(
      "useDashboardAuth must be used inside DashboardLayout"
    );
  }

  return context;
}

type DashboardLayoutProps = {
  children: ReactNode;
  assistantContext?: Record<string, unknown>;
  allowGuest?: boolean;
};

export function DashboardLayout({
  children,
  assistantContext = {},
  allowGuest = false,
}: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthPromptOpen, setIsAuthPromptOpen] =
    useState(false);
  const [protectedFeature, setProtectedFeature] =
    useState("this feature");

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!allowGuest && !isLoading && !user) {
      setProtectedFeature("the MarketFlow workspace");
      setIsAuthPromptOpen(true);
    }
  }, [allowGuest, isLoading, user]);

  function requestAuthentication(feature: string) {
    if (user) {
      return;
    }

    setProtectedFeature(feature);
    setIsAuthPromptOpen(true);
  }

  const canRenderChildren =
    allowGuest || (!isLoading && Boolean(user));

  return (
    <DashboardAuthContext.Provider
      value={{
        user,
        isLoading,
      }}
    >
      <div className="flex min-h-screen bg-background">
        <Sidebar
          isAuthenticated={Boolean(user)}
          onProtectedAction={requestAuthentication}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar user={user} />

          <main className="flex-1 p-4 sm:p-6">
            {canRenderChildren ? (
              children
            ) : (
              <div className="min-h-[calc(100vh-4rem)]" />
            )}
          </main>
        </div>

        {user ? (
          <AIAssistant context={assistantContext} />
        ) : (
          <button
            type="button"
            aria-label="Log in to use MarketFlow Bot"
            onClick={() =>
              requestAuthentication("MarketFlow Bot")
            }
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 hover:bg-primary/90"
          >
            <Bot size={23} />
          </button>
        )}

        <AuthPromptModal
          open={isAuthPromptOpen}
          feature={protectedFeature}
          onClose={() => setIsAuthPromptOpen(false)}
        />
      </div>
    </DashboardAuthContext.Provider>
  );
}