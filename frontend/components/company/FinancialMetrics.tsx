type FinancialMetricsProps = {
  marketCap: string;
  revenue: string;
  peRatio: number;
  eps: number;
  profitMargin: string;
  debt: string;
  cashFlow: string;
};

export function FinancialMetrics({
  marketCap,
  revenue,
  peRatio,
  eps,
  profitMargin,
  debt,
  cashFlow,
}: FinancialMetricsProps) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-4">
      <MetricCard title="Market Cap" value={marketCap} />
      <MetricCard title="Revenue" value={revenue} />
      <MetricCard title="P/E Ratio" value={peRatio.toString()} />
      <MetricCard title="EPS" value={`$${eps}`} />
      <MetricCard title="Profit Margin" value={profitMargin} />
      <MetricCard title="Debt" value={debt} />
      <MetricCard title="Cash Flow" value={cashFlow} />
    </div>
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