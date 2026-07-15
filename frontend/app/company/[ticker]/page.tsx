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
  peRatio?: number | null;
  price?: number;
  eps?: number;
  profitMargin?: number;
  debt?: number;
  cashFlow?: number;
};

function formatCurrency(value?: number) {
  if (!value) return "N/A";

  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  return `$${value.toLocaleString()}`;
}

function formatPercent(value?: number) {
  if (value === undefined || value === null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  const response = await api.get<Company>(`/api/company/${ticker}`);
  const company = response.data;

  const calculatedPeRatio =
    company.peRatio ?? (company.price && company.eps ? company.price / company.eps : 0);

  return (
    <DashboardLayout>
      <CompanyHeader
        name={company.companyName}
        ticker={company.symbol}
        exchange={company.exchange}
      />

      <FinancialMetrics
        marketCap={formatCurrency(company.marketCap)}
        revenue={formatCurrency(company.revenue)}
        peRatio={Number(calculatedPeRatio.toFixed(2))}
        eps={company.eps ?? 0}
        profitMargin={formatPercent(company.profitMargin)}
        debt={formatCurrency(company.debt)}
        cashFlow={formatCurrency(company.cashFlow)}
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