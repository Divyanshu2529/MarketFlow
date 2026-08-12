"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Competitor = {
  company: string;
  ticker: string;
  marketCap: number | null;
  revenue: number | null;
  peRatio: number | null;
  eps: number | null;
  profitMargin: number | null;
};

type CompetitorComparisonProps = {
  ticker: string;
};

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
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

function formatPercent(value: number | null) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function CompetitorComparison({
  ticker,
}: CompetitorComparisonProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompetitors() {
      try {
        const response = await api.get<Competitor[]>(
          `/api/company/${ticker}/competitors`
        );

        setCompetitors(response.data);
      } catch (error) {
        console.error(
          "Failed to load competitor comparison:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadCompetitors();
  }, [ticker]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Competitor Comparison
        </h2>

        <p className="text-sm text-slate-500">
          Side-by-side comparison of key financial metrics.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">
          Loading competitor data...
        </p>
      ) : competitors.length === 0 ? (
        <p className="text-sm text-slate-500">
          Competitor data is currently unavailable.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Company
                </th>
                <th className="px-4 py-3 font-medium">
                  Market Cap
                </th>
                <th className="px-4 py-3 font-medium">
                  Revenue
                </th>
                <th className="px-4 py-3 font-medium">
                  P/E
                </th>
                <th className="px-4 py-3 font-medium">
                  EPS
                </th>
                <th className="px-4 py-3 font-medium">
                  Profit Margin
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {competitors.map((item) => (
                <tr
                  key={item.ticker}
                  className={
                    item.ticker === ticker
                      ? "bg-purple-50"
                      : "hover:bg-purple-50/40"
                  }
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {item.company}
                    </p>

                    <p className="text-xs text-slate-500">
                      {item.ticker}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    {formatCurrency(item.marketCap)}
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    {formatCurrency(item.revenue)}
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    {item.peRatio !== null
                      ? item.peRatio.toFixed(2)
                      : "N/A"}
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    {item.eps !== null
                      ? item.eps.toFixed(2)
                      : "N/A"}
                  </td>

                  <td className="px-4 py-4 text-slate-700">
                    {formatPercent(item.profitMargin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}