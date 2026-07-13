import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RevenueChart } from "@/components/charts/RevenueChart";

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
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-purple-600">
          {company.exchange}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          {company.name} ({company.ticker})
        </h1>

        <p className="mt-3 text-slate-500">
          AI-powered company overview and financial snapshot.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <MetricCard title="Market Cap" value={company.market_cap} />
        <MetricCard title="Revenue" value={company.revenue} />
        <MetricCard title="P/E Ratio" value={company.pe_ratio.toString()} />
        <MetricCard title="EPS" value={`$${company.eps}`} />
        <MetricCard title="Profit Margin" value={company.profit_margin} />
        <MetricCard title="Debt" value={company.debt} />
        <MetricCard title="Cash Flow" value={company.cash_flow} />
      </div>

      <div className="mt-8">
        <RevenueChart />
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}