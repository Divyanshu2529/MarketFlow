import { NewsFeed } from "@/components/news/NewsFeed";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout
      assistantContext={{
        currentPage: "/dashboard",
        pageTitle: "MarketFlow Dashboard",
        section: "Personalized Market News",

        availableSections: [
          "Personalized financial news",
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
          "The dashboard contains a personalized financial news feed based on the user's interests and searched companies. Use live news tools when the user asks about current events, recent headlines, or a specific company. Never invent news.",
      }}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to MarketFlow
          </h1>

          <p className="mt-2 text-slate-500">
            Stay updated with the companies and markets that
            matter to you.
          </p>
        </div>

        <NewsFeed />
      </div>
    </DashboardLayout>
  );
}