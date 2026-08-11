"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { api } from "@/lib/api";

type CompanySearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
};

type CompanySearchResponse = {
  results: CompanySearchResult[];
};

export function CompanySearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] =
    useState<CompanySearchResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  async function submitCompanySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // After a company has been selected, Search only navigates.
    if (selectedCompany) {
      router.push(`/company/${selectedCompany.symbol}`);
      return;
    }

    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2 || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);
    setResults([]);

    try {
      // Exactly one request for this submitted search.
      const response = await api.get<CompanySearchResponse>(
        "/api/company/search",
        {
          params: {
            q: normalizedQuery,
          },
        }
      );

      setResults(response.data.results ?? []);
    } catch (error) {
      console.error("Company search failed:", error);
      setError("Unable to search companies. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function selectCompany(company: CompanySearchResult) {
    setSelectedCompany(company);
    setQuery(`${company.name} (${company.symbol})`);
    setResults([]);
    setHasSearched(false);
    setError("");
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedCompany(null);
    setResults([]);
    setHasSearched(false);
    setError("");
  }

  return (
    <div className="relative">
      <form
        onSubmit={submitCompanySearch}
        className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"
      >
        <Search size={18} className="shrink-0 text-slate-400" />

        <input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Search by company name or ticker..."
          className="w-full outline-none"
        />

        <button
          type="submit"
          disabled={
            loading ||
            (!selectedCompany && query.trim().length < 2)
          }
          className="rounded-lg bg-purple-500 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching..." : selectedCompany ? "Open" : "Search"}
        </button>
      </form>

      {(results.length > 0 || error || hasSearched) && !selectedCompany && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {error && (
            <p className="p-4 text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && hasSearched && results.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              No companies found.
            </p>
          )}

          {!loading &&
            results.map((company, index) => (
              <button
                key={`${company.symbol}-${company.exchange ?? "unknown"}-${index}`}
                type="button"
                onClick={() => selectCompany(company)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-purple-50"
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

                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                  {company.symbol}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}