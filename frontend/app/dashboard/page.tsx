import { NewsFeed } from "@/components/news/NewsFeed";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
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