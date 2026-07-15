import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { FinancialMetrics } from "@/components/company/FinancialMetrics";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { EPSChart } from "@/components/charts/EPSChart";
import { AIRecommendationCard } from "@/components/company/AIRecommendationCard";
import { SentimentCard } from "@/components/company/SentimentCard";
import { NewsSection } from "@/components/company/NewsSection";
import { SECFilings } from "@/components/company/SECFilings";
import { CompetitorComparison } from "@/components/company/CompetitorComparison";

type Company = {
  symbol: string;
  companyName: string;
  exchange: string;
  marketCap?: number;
  revenue?: number;
  pe?: number;
  eps?: number;
  profitMargin?: number;
  debt?: number;
  cashFlow?: number;
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  const response = await api.get<Company>(`/api/company/${ticker}`);
  const company = response.data;

  return (
    <DashboardLayout>
      <CompanyHeader
        name={company.companyName}
        ticker={company.symbol}
        exchange={company.exchange}
      />

      <FinancialMetrics
        marketCap={company.marketCap ? `$${company.marketCap.toLocaleString()}` : "N/A"}
        revenue={company.revenue ? `$${company.revenue.toLocaleString()}` : "N/A"}
        peRatio={company.pe ?? 0}
        eps={company.eps ?? 0}
        profitMargin={company.profitMargin ? `${company.profitMargin}%` : "N/A"}
        debt={company.debt ? `$${company.debt.toLocaleString()}` : "N/A"}
        cashFlow={company.cashFlow ? `$${company.cashFlow.toLocaleString()}` : "N/A"}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>

        <AIRecommendationCard />

        <div className="lg:col-span-2">
          <EPSChart />
        </div>

        <SentimentCard />
      </div>

      <div className="mt-8">
        <NewsSection />
      </div>

      <div className="mt-8">
        <SECFilings />
      </div>

      <div className="mt-8">
        <CompetitorComparison />
      </div>
    </DashboardLayout>
  );
}