type CompanyHeaderProps = {
  name: string;
  ticker: string;
  exchange: string;
};

export function CompanyHeader({
  name,
  ticker,
  exchange,
}: CompanyHeaderProps) {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-purple-600">{exchange}</p>

      <h1 className="mt-2 text-4xl font-bold text-slate-900">
        {name} ({ticker})
      </h1>

      <p className="mt-3 text-slate-500">
        AI-powered company overview and financial snapshot.
      </p>
    </div>
  );
}