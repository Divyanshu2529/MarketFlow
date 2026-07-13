"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

type CompanySearchResult = {
  ticker: string;
  name: string;
  exchange: string;
};

export function CompanySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);

    if (value.trim().length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const response = await api.get<{ results: CompanySearchResult[] }>(
        `/api/company/search?q=${value}`
      );

      setResults(response.data.results);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function goToCompany(ticker: string) {
    setQuery("");
    setResults([]);
    router.push(`/company/${ticker}`);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
        <Search size={18} className="text-slate-400" />

        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by company name or ticker..."
          className="w-full outline-none"
        />
      </div>

      {query && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white shadow-lg">
          {loading && (
            <p className="p-4 text-sm text-slate-500">Searching...</p>
          )}

          {!loading && results.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No companies found.</p>
          )}

          {!loading &&
            results.map((company) => (
              <button
                key={company.ticker}
                onClick={() => goToCompany(company.ticker)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-purple-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{company.name}</p>
                  <p className="text-sm text-slate-500">{company.exchange}</p>
                </div>

                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                  {company.ticker}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}