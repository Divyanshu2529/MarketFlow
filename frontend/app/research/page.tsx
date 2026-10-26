import Link from "next/link";

import { CompanySearch } from "@/components/company/CompanySearch";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const featuredCompanies = [
  {
    ticker: "AAPL",
    name: "Apple",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA",
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
  },
  {
    ticker: "AMZN",
    name: "Amazon",
  },
];

export default function ResearchPage() {
  return (
    <DashboardLayout
      assistantContext={{
        currentPage: "/research",
        pageTitle: "Company Research",
        pagePurpose:
          "Search for companies and open detailed financial research.",
        availableActions: [
          "Search by company name or ticker",
          "View financial metrics",
          "Read company news",
          "Analyze stock performance",
          "Compare companies",
        ],
        featuredCompanies,
      }}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Company Research
          </h1>

          <p className="mt-2 text-slate-500">
            Search for a company to view its financial
            research, news, and AI insights.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Search Company
          </h2>

          <div className="mt-4">
            <CompanySearch />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Featured Companies
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            {featuredCompanies.map((company) => (
              <Link
                key={company.ticker}
                href={`/company/${company.ticker}`}
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-purple-400 hover:shadow-md"
              >
                <h3 className="font-semibold text-slate-900">
                  {company.name}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {company.ticker}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}