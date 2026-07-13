import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to MarketFlow
          </h1>

          <p className="mt-2 text-slate-500">
            AI-powered equity research platform.
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Search Company</h2>

          <input
            placeholder="Search by company name or ticker..."
            className="mt-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-purple-500"
          />
        </div>

        {/* Featured Companies */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">
            Featured Companies
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <CompanyCard
              ticker="AAPL"
              name="Apple"
            />

            <CompanyCard
              ticker="NVDA"
              name="NVIDIA"
            />

            <CompanyCard
              ticker="MSFT"
              name="Microsoft"
            />

            <CompanyCard
              ticker="AMZN"
              name="Amazon"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function CompanyCard({
  ticker,
  name,
}: {
  ticker: string;
  name: string;
}) {
  return (
    <a
      href={`/company/${ticker}`}
      className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md hover:border-purple-400"
    >
      <h3 className="font-semibold text-slate-900">{name}</h3>

      <p className="mt-2 text-sm text-slate-500">
        {ticker}
      </p>
    </a>
  );
}