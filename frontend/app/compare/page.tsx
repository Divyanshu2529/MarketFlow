"use client";

import { FormEvent, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api, searchCompanies } from "@/lib/api";

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

type CompanyOverviewResponse = {
  company: Company;
};

type SearchResult = {
  symbol?: string;
  ticker?: string;
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

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return value.toFixed(2);
}

async function resolveTicker(input: string): Promise<string> {
  const response = await searchCompanies(input);

  const results = (response.results ?? []) as SearchResult[];

  const normalizedInput = input.trim().toUpperCase();

  const exactMatch = results.find((result) => {
    const symbol = result.symbol ?? result.ticker;

    return symbol?.toUpperCase() === normalizedInput;
  });

  const usTickerMatch = results.find((result) => {
    const symbol = result.symbol ?? result.ticker;

    return symbol && !symbol.includes(".");
  });

  const selectedResult =
    exactMatch ?? usTickerMatch ?? results[0];

  const resolvedTicker =
    selectedResult?.symbol ??
    selectedResult?.ticker;

  if (!resolvedTicker) {
    throw new Error("Company not found");
  }

  return resolvedTicker.toUpperCase();
}

export default function ComparePage() {
  const [tickers, setTickers] = useState(["AAPL", "MSFT"]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function addCompany() {
    setTickers((currentTickers) => [
      ...currentTickers,
      "",
    ]);
  }

  function removeCompany(index: number) {
    if (tickers.length <= 2) {
      return;
    }

    setTickers((currentTickers) =>
      currentTickers.filter(
        (_, tickerIndex) => tickerIndex !== index
      )
    );
  }

  function updateTicker(index: number, value: string) {
    setTickers((currentTickers) =>
      currentTickers.map((ticker, tickerIndex) =>
        tickerIndex === index
          ? value
          : ticker
      )
    );
  }

  async function handleCompare(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setCompanies([]);

    const inputs = tickers
      .map((ticker) => ticker.trim())
      .filter(Boolean);

    if (inputs.length < 2) {
      setError("Please enter at least two companies.");
      return;
    }

    setIsLoading(true);

    try {
      const resolvedTickers = await Promise.all(
        inputs.map((input) => resolveTicker(input))
      );

      const uniqueTickers = new Set(resolvedTickers);

      if (uniqueTickers.size !== resolvedTickers.length) {
        throw new Error("Duplicate company");
      }

      const responses = await Promise.all(
        resolvedTickers.map((ticker) =>
          api.get<CompanyOverviewResponse>(
            `/api/company/${ticker}/overview`
          )
        )
      );

      setCompanies(
        responses.map((response) => response.data.company)
      );
    } catch {
      setError(
        "One or more companies could not be found or loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Compare Companies
          </h1>

          <p className="mt-2 text-slate-500">
            Compare companies using names or ticker symbols.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <form
            onSubmit={handleCompare}
            className="space-y-5"
          >
            <div className="space-y-3">
              {tickers.map((ticker, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1">
                    <label
                      htmlFor={`ticker-${index}`}
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Company {index + 1}
                    </label>

                    <input
                      id={`ticker-${index}`}
                      value={ticker}
                      onChange={(event) =>
                        updateTicker(
                          index,
                          event.target.value
                        )
                      }
                      placeholder="Example: Apple or AAPL"
                      className="w-full rounded-lg border px-3 py-2 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>

                  {tickers.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeCompany(index)
                      }
                      className="mt-7 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addCompany}
                className="rounded-lg border border-purple-600 px-4 py-2.5 font-medium text-purple-600 transition hover:bg-purple-50"
              >
                + Add Company
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading
                  ? "Comparing..."
                  : "Compare Companies"}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </form>
        </div>

        {companies.length > 0 && (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                      Metric
                    </th>

                    {companies.map((company) => (
                      <th
                        key={company.symbol}
                        className="px-6 py-4 text-left"
                      >
                        <div className="font-bold text-slate-900">
                          {company.companyName}
                        </div>

                        <div className="text-sm text-purple-600">
                          {company.symbol}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <ComparisonRow
                    label="Exchange"
                    values={companies.map(
                      (company) =>
                        company.exchange || "N/A"
                    )}
                  />

                  <ComparisonRow
                    label="Price"
                    values={companies.map((company) =>
                      company.price !== undefined &&
                      company.price !== null
                        ? `$${company.price.toFixed(2)}`
                        : "N/A"
                    )}
                  />

                  <ComparisonRow
                    label="Market Cap"
                    values={companies.map((company) =>
                      formatCurrency(company.marketCap)
                    )}
                  />

                  <ComparisonRow
                    label="Revenue"
                    values={companies.map((company) =>
                      formatCurrency(company.revenue)
                    )}
                  />

                  <ComparisonRow
                    label="P/E Ratio"
                    values={companies.map((company) =>
                      formatNumber(company.peRatio)
                    )}
                  />

                  <ComparisonRow
                    label="EPS"
                    values={companies.map((company) =>
                      formatNumber(company.eps)
                    )}
                  />

                  <ComparisonRow
                    label="Profit Margin"
                    values={companies.map((company) =>
                      formatPercent(company.profitMargin)
                    )}
                  />

                  <ComparisonRow
                    label="Debt"
                    values={companies.map((company) =>
                      formatCurrency(company.debt)
                    )}
                  />

                  <ComparisonRow
                    label="Cash Flow"
                    values={companies.map((company) =>
                      formatCurrency(company.cashFlow)
                    )}
                  />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {companies.length === 0 &&
          !isLoading &&
          !error && (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                Add companies to compare
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Try names like Apple, Microsoft, or NVIDIA.
              </p>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
}

function ComparisonRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-6 py-4 text-sm font-medium text-slate-600">
        {label}
      </td>

      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className="px-6 py-4 text-sm text-slate-900"
        >
          {value}
        </td>
      ))}
    </tr>
  );
}