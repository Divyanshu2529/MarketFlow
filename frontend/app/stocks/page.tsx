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

const chartTick = {
  fontSize: 12,
  fill: "var(--muted-foreground)",
};

const chartTooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
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
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Technical workspace
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Stock Analysis
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Analyze price behavior, momentum, trend strength,
            volatility, and possible entry or exit signals.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-orange-100 dark:focus-within:ring-orange-500/10">
              <Search
                size={19}
                className="shrink-0 text-muted-foreground"
              />

              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setResults([]);
                  setError("");
                }}
                placeholder="Search a company or ticker..."
                className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSearching || query.trim().length < 2
              }
              className="rounded-2xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Analyze Stock"}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              {results.map((company, index) => (
                <button
                  key={`${company.symbol}-${index}`}
                  type="button"
                  onClick={() => loadStockAnalysis(company)}
                  className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-accent"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {company.name}
                    </p>

                    {company.exchange && (
                      <p className="text-sm text-muted-foreground">
                        {company.exchange}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-primary">
                    {company.symbol}
                  </span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
        </section>

        {!analysis && !isLoading && (
          <section className="rounded-3xl border border-dashed border-border bg-muted p-16 text-center">
            <TrendingUp
              size={42}
              className="mx-auto text-primary"
            />

            <h2 className="mt-5 text-xl font-semibold text-foreground">
              Choose a stock to begin
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              This workspace focuses only on technical stock
              behavior and does not duplicate your Research page.
            </p>
          </section>
        )}

        {isLoading && (
          <section className="rounded-3xl border border-border bg-card p-16 text-center text-muted-foreground shadow-sm">
            Loading technical analysis...
          </section>
        )}

        {analysis && !isLoading && (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50 p-6 text-foreground shadow-sm dark:border-orange-900/30 dark:from-[#191715] dark:via-[#191715] dark:to-[#2a1b13] md:p-8">
              <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Technical signal
                  </p>

                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    {analysis.quote.name ?? analysis.ticker}
                  </h2>

                  <p className="mt-1 text-muted-foreground">
                    {analysis.ticker}
                    {analysis.quote.exchange
                      ? ` · ${analysis.quote.exchange}`
                      : ""}
                  </p>
                </div>

                <div
                  className={`rounded-2xl px-6 py-4 text-center shadow-sm ${ratingClasses(
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

              <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-5 dark:border-orange-900/30 dark:bg-white/10">
                  <p className="text-sm text-muted-foreground">
                    Current price
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {formatCurrency(analysis.quote.price)}
                  </p>

                  <p
                    className={`mt-2 text-sm font-medium ${
                      (analysis.quote.changePercentage ?? 0) >= 0
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-red-600 dark:text-red-300"
                    }`}
                  >
                    {formatPercent(
                      analysis.quote.changePercentage
                    )}{" "}
                    today
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-5 dark:border-orange-900/30 dark:bg-white/10">
                  <p className="text-sm text-muted-foreground">
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

                  <p className="mt-2 text-sm text-muted-foreground">
                    Based on the 20-day trend.
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-5 dark:border-orange-900/30 dark:bg-white/10">
                  <p className="text-sm text-muted-foreground">
                    Risk level
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {analysis.signal.riskLevel}
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Signal score: {analysis.signal.score}
                  </p>
                </div>
              </div>

              <p className="relative z-10 mt-6 max-w-3xl text-sm leading-6 text-muted-foreground">
                {ratingDescription(analysis.signal.rating)}{" "}
                This is an educational technical signal, not
                financial advice or a guaranteed prediction.
              </p>

              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/10" />
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
                value={formatNumber(analysis.quote.volume)}
              />

              <MetricCard
                label="Market cap"
                value={formatCurrency(
                  analysis.quote.marketCap
                )}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Price trend
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
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
                      stroke="var(--border)"
                    />

                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        String(value).slice(5)
                      }
                      tick={chartTick}
                    />

                    <YAxis
                      tickFormatter={(value) =>
                        `$${Number(value).toFixed(0)}`
                      }
                      tick={chartTick}
                    />

                    <Tooltip
                      contentStyle={chartTooltipStyle}
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
                      stroke="#df6b32"
                      strokeWidth={3}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="sma20"
                      stroke="#c98246"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="sma50"
                      stroke="#64748b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <LegendDot
                    color="bg-primary"
                    label="Close"
                  />

                  <LegendDot
                    color="bg-orange-400"
                    label="SMA 20"
                  />

                  <LegendDot
                    color="bg-slate-500"
                    label="SMA 50"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground">
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
                      analysis.indicators.annualizedVolatility
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingUp
                    size={21}
                    className="text-emerald-600"
                  />

                  <h2 className="text-xl font-semibold text-foreground">
                    Entry timing signal
                  </h2>
                </div>

                <p className="mt-5 leading-7 text-muted-foreground">
                  {analysis.signal.entrySignal}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <TrendingDown
                    size={21}
                    className="text-red-500"
                  />

                  <h2 className="text-xl font-semibold text-foreground">
                    Exit-risk signal
                  </h2>
                </div>

                <p className="mt-5 leading-7 text-muted-foreground">
                  {analysis.signal.exitSignal}
                </p>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground">
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
                        stroke="var(--border)"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          String(value).slice(5)
                        }
                        tick={chartTick}
                      />

                      <YAxis
                        domain={[0, 100]}
                        tick={chartTick}
                      />

                      <Tooltip
                        contentStyle={chartTooltipStyle}
                      />

                      <Area
                        type="monotone"
                        dataKey="rsi"
                        stroke="#df6b32"
                        fill="#fed7aa"
                        strokeWidth={2}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground">
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
                        stroke="var(--border)"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          String(value).slice(5)
                        }
                        tick={chartTick}
                      />

                      <YAxis
                        tickFormatter={(value) =>
                          `${(
                            Number(value) / 1_000_000
                          ).toFixed(0)}M`
                        }
                        tick={chartTick}
                      />

                      <Tooltip
                        contentStyle={chartTooltipStyle}
                      />

                      <Bar
                        dataKey="volume"
                        fill="#df6b32"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-muted p-6">
              <h2 className="text-xl font-semibold text-foreground">
                Why this signal was generated
              </h2>

              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {analysis.signal.reasons.map(
                  (reason, index) => (
                    <li
                      key={`${reason}-${index}`}
                      className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground shadow-sm"
                    >
                      {reason}
                    </li>
                  )
                )}
              </ul>

              <p className="mt-6 text-xs leading-5 text-muted-foreground">
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-foreground">
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
    <div className="flex items-center justify-between border-b border-border pb-4 last:border-b-0">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="font-semibold text-foreground">
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