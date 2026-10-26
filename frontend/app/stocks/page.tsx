"use client";

import { FormEvent, useState } from "react";
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";

type SearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
};

type StockQuote = {
  name?: string | null;
  exchange?: string | null;
  price: number;
  change?: number | null;
  changePercentage?: number | null;
  volume?: number | null;
  dayLow?: number | null;
  dayHigh?: number | null;
  yearLow?: number | null;
  yearHigh?: number | null;
  marketCap?: number | null;
  priceAvg50?: number | null;
  priceAvg200?: number | null;
};

type StockChartPoint = {
  date: string;
  close: number;
  volume: number;
  sma20?: number | null;
  sma50?: number | null;
  rsi?: number | null;
};

type StockSignal = {
  rating: "BUY" | "HOLD" | "AVOID";
  score: number;
  riskLevel: string;
  entryRange: {
    lower: number;
    upper: number;
  };
  entrySignal: string;
  exitSignal: string;
  reasons: string[];
  methodology: string;
};

type StockAnalysis = {
  ticker: string;
  quote: StockQuote;
  indicators: {
    sma20?: number | null;
    sma50?: number | null;
    rsi14?: number | null;
    momentum20d?: number | null;
    annualizedVolatility?: number | null;
  };
  chart: StockChartPoint[];
  signal: StockSignal;
};

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return value.toLocaleString();
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return `${value.toFixed(2)}%`;
}

function ratingClasses(rating: StockSignal["rating"]) {
  if (rating === "BUY") {
    return "bg-emerald-500 text-white";
  }

  if (rating === "AVOID") {
    return "bg-red-500 text-white";
  }

  return "bg-amber-400 text-slate-950";
}

function ratingDescription(rating: StockSignal["rating"]) {
  if (rating === "BUY") {
    return "Technical conditions are currently constructive.";
  }

  if (rating === "AVOID") {
    return "Technical conditions currently show elevated weakness.";
  }

  return "Technical conditions are mixed. More confirmation may be useful.";
}

export default function StocksPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2 || isSearching) {
      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);

    try {
      const response = await api.get<{
        results: SearchResult[];
      }>("/api/company/search", {
        params: {
          q: normalizedQuery,
        },
      });

      const companies = response.data.results ?? [];
      setResults(companies);

      if (companies.length === 1) {
        await loadStockAnalysis(companies[0]);
      }
    } catch (requestError) {
      console.error("Stock search failed:", requestError);
      setError("Unable to search for that stock.");
    } finally {
      setIsSearching(false);
    }
  }

  async function loadStockAnalysis(company: SearchResult) {
    setIsLoading(true);
    setError("");
    setResults([]);
    setQuery(`${company.name} (${company.symbol})`);

    try {
      const response = await api.get<StockAnalysis>(
        `/api/stocks/${encodeURIComponent(
          company.symbol
        )}/analysis`
      );

      setAnalysis(response.data);
    } catch (requestError) {
      console.error(
        "Stock analysis request failed:",
        requestError
      );

      setError(
        "Technical data is unavailable for this stock right now."
      );
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }

  const chartData = analysis?.chart.slice(-120) ?? [];

  return (
    <DashboardLayout
      assistantContext={{
        currentPage: "/stocks",
        pageTitle: "Technical Stock Analysis",
        section: "Technical Stock Analysis",

        ticker: analysis?.ticker ?? null,
        companyName: analysis?.quote?.name ?? null,
        exchange: analysis?.quote?.exchange ?? null,

        analysisLoaded: Boolean(analysis),
        searchQuery: query,

        quote: analysis?.quote ?? null,
        indicators: analysis?.indicators ?? null,
        signal: analysis?.signal ?? null,

        recentChartData: chartData.slice(-30),

        availableSections: [
          "Current stock price",
          "Daily price change",
          "Day range",
          "52-week range",
          "Trading volume",
          "Market capitalization",
          "RSI",
          "Moving averages",
          "Momentum",
          "Volatility",
          "Entry timing signal",
          "Exit-risk signal",
          "BUY, HOLD, or AVOID signal",
          "Signal reasons",
        ],

        assistantInstructions:
          "Answer questions using the technical stock analysis shown on this page. Use live tools for current prices, updated technical indicators, and the latest stock analysis. Explain that signals are educational and not guaranteed financial advice.",
      }}
    >
      <div className="space-y-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-purple-600">
            Technical workspace
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-900">
            Stock Analysis
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Analyze price behavior, momentum, trend strength,
            volatility, and possible entry or exit signals.
          </p>
        </div>

        <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="flex flex-1 items-center gap-3 rounded-xl border px-4 py-3">
              <Search
                size={19}
                className="shrink-0 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setResults([]);
                  setError("");
                }}
                placeholder="Search a company or ticker..."
                className="w-full bg-transparent outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSearching || query.trim().length < 2
              }
              className="rounded-xl bg-purple-600 px-6 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Analyze Stock"}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border">
              {results.map((company, index) => (
                <button
                  key={`${company.symbol}-${index}`}
                  type="button"
                  onClick={() => loadStockAnalysis(company)}
                  className="flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-b-0 hover:bg-purple-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {company.name}
                    </p>

                    {company.exchange && (
                      <p className="text-sm text-slate-500">
                        {company.exchange}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                    {company.symbol}
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {!analysis && !isLoading && (
          <div className="rounded-[2rem] border border-dashed bg-slate-50 p-16 text-center">
            <TrendingUp
              size={42}
              className="mx-auto text-purple-500"
            />

            <h2 className="mt-5 text-xl font-semibold text-slate-900">
              Choose a stock to begin
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              This workspace focuses only on technical stock
              behavior and does not duplicate your Research page.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="rounded-[2rem] border bg-white p-16 text-center text-slate-500 shadow-sm">
            Loading technical analysis...
          </div>
        )}

        {analysis && !isLoading && (
          <>
            <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                    Technical signal
                  </p>

                  <h2 className="mt-2 text-3xl font-bold">
                    {analysis.quote.name ??
                      analysis.ticker}
                  </h2>

                  <p className="mt-1 text-slate-400">
                    {analysis.ticker}
                    {analysis.quote.exchange
                      ? ` · ${analysis.quote.exchange}`
                      : ""}
                  </p>
                </div>

                <div
                  className={`rounded-2xl px-6 py-4 text-center ${ratingClasses(
                    analysis.signal.rating
                  )}`}
                >
                  <p className="text-2xl font-black">
                    {analysis.signal.rating}
                  </p>

                  <p className="mt-1 text-xs font-medium">
                    Rule-based signal
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm text-slate-400">
                    Current price
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {formatCurrency(
                      analysis.quote.price
                    )}
                  </p>

                  <p
                    className={`mt-2 text-sm font-medium ${
                      (analysis.quote.changePercentage ?? 0) >= 0
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {formatPercent(
                      analysis.quote.changePercentage
                    )}{" "}
                    today
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm text-slate-400">
                    Potential entry range
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(
                      analysis.signal.entryRange.lower
                    )}{" "}
                    –{" "}
                    {formatCurrency(
                      analysis.signal.entryRange.upper
                    )}
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    Based on the 20-day trend.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-sm text-slate-400">
                    Risk level
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {analysis.signal.riskLevel}
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    Signal score: {analysis.signal.score}
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-300">
                {ratingDescription(
                  analysis.signal.rating
                )}{" "}
                This is an educational technical signal, not
                financial advice or a guaranteed prediction.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Day range"
                value={`${formatCurrency(
                  analysis.quote.dayLow
                )} – ${formatCurrency(
                  analysis.quote.dayHigh
                )}`}
              />

              <MetricCard
                label="52-week range"
                value={`${formatCurrency(
                  analysis.quote.yearLow
                )} – ${formatCurrency(
                  analysis.quote.yearHigh
                )}`}
              />

              <MetricCard
                label="Trading volume"
                value={formatNumber(
                  analysis.quote.volume
                )}
              />

              <MetricCard
                label="Market cap"
                value={formatCurrency(
                  analysis.quote.marketCap
                )}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-[2rem] border bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Price trend
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Closing price compared with 20-day and
                    50-day moving averages.
                  </p>
                </div>

                <ResponsiveContainer
                  width="100%"
                  height={350}
                >
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        String(value).slice(5)
                      }
                      tick={{ fontSize: 12 }}
                    />

                    <YAxis
                      tickFormatter={(value) =>
                        `$${Number(value).toFixed(0)}`
                      }
                      tick={{ fontSize: 12 }}
                    />

                    <Tooltip
                      formatter={(value, name) => [
                        `$${Number(value).toFixed(2)}`,
                        name === "close"
                          ? "Close"
                          : name === "sma20"
                            ? "SMA 20"
                            : "SMA 50",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="sma20"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="sma50"
                      stroke="#0f766e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                  <LegendDot
                    color="bg-purple-600"
                    label="Close"
                  />

                  <LegendDot
                    color="bg-amber-500"
                    label="SMA 20"
                  />

                  <LegendDot
                    color="bg-teal-700"
                    label="SMA 50"
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Key indicators
                </h2>

                <div className="mt-6 space-y-5">
                  <IndicatorRow
                    label="RSI 14"
                    value={formatNumber(
                      analysis.indicators.rsi14
                    )}
                  />

                  <IndicatorRow
                    label="20-day average"
                    value={formatCurrency(
                      analysis.indicators.sma20
                    )}
                  />

                  <IndicatorRow
                    label="50-day average"
                    value={formatCurrency(
                      analysis.indicators.sma50
                    )}
                  />

                  <IndicatorRow
                    label="20-day momentum"
                    value={formatPercent(
                      analysis.indicators.momentum20d
                    )}
                  />

                  <IndicatorRow
                    label="Annual volatility"
                    value={formatPercent(
                      analysis.indicators
                        .annualizedVolatility
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingUp
                    size={21}
                    className="text-emerald-600"
                  />

                  <h2 className="text-xl font-bold text-slate-900">
                    Entry timing signal
                  </h2>
                </div>

                <p className="mt-5 leading-7 text-slate-600">
                  {analysis.signal.entrySignal}
                </p>
              </div>

              <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingDown
                    size={21}
                    className="text-red-500"
                  />

                  <h2 className="text-xl font-bold text-slate-900">
                    Exit-risk signal
                  </h2>
                </div>

                <p className="mt-5 leading-7 text-slate-600">
                  {analysis.signal.exitSignal}
                </p>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Momentum
                </h2>

                <div className="mt-6">
                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >
                    <AreaChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          String(value).slice(5)
                        }
                        tick={{ fontSize: 12 }}
                      />

                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="rsi"
                        stroke="#db2777"
                        fill="#fbcfe8"
                        strokeWidth={2}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Trading activity
                </h2>

                <div className="mt-6">
                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >
                    <BarChart data={chartData.slice(-60)}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          String(value).slice(5)
                        }
                        tick={{ fontSize: 12 }}
                      />

                      <YAxis
                        tickFormatter={(value) =>
                          `${(
                            Number(value) / 1_000_000
                          ).toFixed(0)}M`
                        }
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="volume"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border bg-slate-50 p-6">
              <h2 className="text-xl font-bold text-slate-900">
                Why this signal was generated
              </h2>

              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {analysis.signal.reasons.map(
                  (reason, index) => (
                    <li
                      key={`${reason}-${index}`}
                      className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm"
                    >
                      {reason}
                    </li>
                  )
                )}
              </ul>

              <p className="mt-6 text-xs leading-5 text-slate-500">
                {analysis.signal.methodology}
              </p>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function IndicatorRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-4 last:border-b-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}