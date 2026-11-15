"use client";

import {
  DashboardLayout,
  useDashboardAuth,
} from "@/components/layout/DashboardLayout";
import { NewsFeed } from "@/components/news/NewsFeed";
import { PublicNewsPreview } from "@/components/news/PublicNewsPreview";

function DashboardNews() {
  const { user, isLoading } = useDashboardAuth();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading market preview...
      </div>
    );
  }

  return user ? <NewsFeed /> : <PublicNewsPreview />;
}

export default function DashboardPage() {
  return (
    <DashboardLayout
      allowGuest
      assistantContext={{
        currentPage: "/dashboard",
        pageTitle: "MarketFlow Dashboard",
        section: "Public Market Preview",

        availableSections: [
          "Public market preview",
          "Company updates",
          "Market updates",
          "Stock-related news",
          "Search and research",
        ],

        availableActions: [
          "Explain a news article",
          "Summarize market news",
          "Find more news about a company",
          "Explain how news may affect a stock",
          "Open company research",
          "Analyze a stock",
        ],

        assistantInstructions:
          "Guests can view the public market preview only. Ask users to log in or sign up before using protected research tools.",
      }}
    >
      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            MarketFlow overview
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            Welcome to MarketFlow
          </h1>

          <p className="mt-3 text-muted-foreground">
            Stay updated with the companies and markets that
            matter to you.
          </p>
        </div>

        <DashboardNews />
      </div>
    </DashboardLayout>
  );
}