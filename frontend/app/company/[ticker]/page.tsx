import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { FinancialMetrics } from "@/components/company/FinancialMetrics";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { EPSChart } from "@/components/charts/EPSChart";
import { AIRecommendationCard } from "@/components/company/AIRecommendationCard";
import { SentimentCard } from "@/components/company/SentimentCard";

type Company = {
  ticker: string;
  name: string;
  exchange: string;
  market_cap: string;
  revenue: string;
  pe_ratio: number;
  eps: number;
  profit_margin: string;
  debt: string;
  cash_flow: string;
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
        name={company.name}
        ticker={company.ticker}
        exchange={company.exchange}
      />

      <FinancialMetrics
        marketCap={company.market_cap}
        revenue={company.revenue}
        peRatio={company.pe_ratio}
        eps={company.eps}
        profitMargin={company.profit_margin}
        debt={company.debt}
        cashFlow={company.cash_flow}
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
    </DashboardLayout>
  );
}