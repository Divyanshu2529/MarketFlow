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

type IncomeHistoryItem = {
  year: string;
  revenue: number;
  eps: number;
};

type NewsItem = {
  title: string;
  publisher: string;
  publishedDate: string;
  summary: string;
  url: string;
};

type CompanyOverviewResponse = {
  company: Company;
  history: IncomeHistoryItem[];
  news: NewsItem[];
};

type AIRecommendation = {
  recommendation: string;
  confidence: number;
  reasoning: string;
};

type SentimentResponse = {
  positive: number;
  neutral: number;
  negative: number;
  overall: string;
};

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) {
    return "N/A";
  }

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

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return `${(value * 100).toFixed(1)}%`;
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  const normalizedTicker = ticker.trim().toUpperCase();

  const [
    overviewResponse,
    recommendationResponse,
    sentimentResponse,
  ] = await Promise.all([
    api.get<CompanyOverviewResponse>(
      `/api/company/${normalizedTicker}/overview`
    ),
    api.get<AIRecommendation>(
      `/api/company/${normalizedTicker}/recommendation`
    ),
    api.get<SentimentResponse>(
      `/api/company/${normalizedTicker}/sentiment`
    ),
  ]);

  const {
    company,
    history: incomeHistory,
    news,
  } = overviewResponse.data;

  const recommendation = recommendationResponse.data;
  const sentiment = sentimentResponse.data;

  const calculatedPeRatio =
    company.peRatio ??
    (company.price && company.eps
      ? company.price / company.eps
      : 0);

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
          <RevenueChart data={incomeHistory} />
        </div>

        <AIRecommendationCard
          recommendation={recommendation.recommendation}
          confidence={recommendation.confidence}
          reasoning={recommendation.reasoning}
        />

        <div className="lg:col-span-2">
          <EPSChart data={incomeHistory} />
        </div>

        <SentimentCard
          positive={sentiment.positive}
          neutral={sentiment.neutral}
          negative={sentiment.negative}
          overall={sentiment.overall}
        />
      </div>

      <div className="mt-8">
        <NewsSection news={news} />
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