"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  searchCompanies,
  WatchlistItem,
} from "@/lib/api";

type SearchResult = {
  symbol?: string;
  ticker?: string;
};

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

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    async function loadWatchlist() {
      try {
        const items = await getWatchlist();
        setWatchlist(items);
      } catch {
        setError("Unable to load your watchlist.");
      } finally {
        setIsLoading(false);
      }
    }

    loadWatchlist();
  }, []);

  async function handleAdd(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const input = ticker.trim();

    if (!input) {
      setError("Enter a company name or ticker.");
      return;
    }

    setError("");
    setIsAdding(true);

    try {
      const normalizedTicker = await resolveTicker(input);

      const newItem = await addToWatchlist(
        normalizedTicker
      );

      setWatchlist((currentItems) => [
        newItem,
        ...currentItems,
      ]);

      setTicker("");
    } catch {
      setError(
        "Company not found or already in your watchlist."
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(tickerToRemove: string) {
    setError("");

    try {
      await removeFromWatchlist(tickerToRemove);

      setWatchlist((currentItems) =>
        currentItems.filter(
          (item) => item.ticker !== tickerToRemove
        )
      );
    } catch {
      setError("Unable to remove this company.");
    }
  }

  return (
    <DashboardLayout
      assistantContext={{
        currentPage: "/watchlist",
        pageTitle: "Personal Watchlist",
        section: "User Watchlist",

        watchlistLoaded: !isLoading,
        watchlistCount: watchlist.length,
        watchlist,

        trackedTickers: watchlist.map(
          (item) => item.ticker
        ),

        availableActions: [
          "View tracked companies",
          "Add a company by name",
          "Add a company by ticker",
          "Remove a company",
          "Open company research",
        ],

        assistantInstructions:
          "Answer questions about the authenticated user's watchlist using the watchlist data shown on this page. Use the get_my_watchlist tool when the user asks for updated watchlist information. Do not expose another user's data.",
      }}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Watchlist
          </h1>

          <p className="mt-2 text-slate-500">
            Track the companies you care about.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={ticker}
              onChange={(event) =>
                setTicker(event.target.value)
              }
              placeholder="Enter company name or ticker, e.g. Apple or AAPL"
              className="flex-1 rounded-lg border px-3 py-2 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            <button
              type="submit"
              disabled={isAdding}
              className="rounded-lg bg-purple-600 px-5 py-2.5 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAdding ? "Adding..." : "Add Company"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
            Loading your watchlist...
          </div>
        ) : watchlist.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Your watchlist is empty
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Add a company name or ticker above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {item.ticker}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Added{" "}
                      {new Date(
                        item.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemove(item.ticker)
                    }
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>

                <Link
                  href={`/company/${item.ticker}`}
                  className="mt-5 block rounded-lg bg-purple-50 px-4 py-2 text-center text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                >
                  View Research
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}