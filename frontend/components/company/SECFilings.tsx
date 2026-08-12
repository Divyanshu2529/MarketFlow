"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Filing = {
  type: string;
  date: string;
  url: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
};

type SECFilingsProps = {
  ticker: string;
};

export function SECFilings({ ticker }: SECFilingsProps) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFilings() {
      try {
        const response = await api.get<Filing[]>(
          `/api/company/${ticker}/filings`
        );

        setFilings(response.data);
      } catch (error) {
        console.error("Failed to load SEC filings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFilings();
  }, [ticker]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          SEC Filing Summary
        </h2>

        <p className="text-sm text-slate-500">
          AI-generated summaries of the latest 10-K, 10-Q, and 8-K filings.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">
          Loading recent SEC filings...
        </p>
      ) : filings.length === 0 ? (
        <p className="text-sm text-slate-500">
          No SEC filings available.
        </p>
      ) : (
        <div className="space-y-5">
          {filings.map((filing) => {
            const summaryUnavailable =
              filing.summary
                .toLowerCase()
                .includes("temporarily unavailable");

            return (
              <div
                key={`${filing.type}-${filing.date}`}
                className="rounded-xl border p-5 transition hover:border-purple-300 hover:bg-purple-50/30"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                    {filing.type}
                  </span>

                  <span className="text-sm text-slate-500">
                    {filing.date}
                  </span>
                </div>

                {summaryUnavailable ? (
                  <p className="text-sm leading-6 text-slate-500">
                    AI summary is temporarily unavailable. You can still view
                    the original SEC filing below.
                  </p>
                ) : (
                  <>
                    <p className="text-sm leading-6 text-slate-600">
                      {filing.summary}
                    </p>

                    {filing.keyPoints.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Key Points
                        </p>

                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                          {filing.keyPoints.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {filing.risks.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Risks
                        </p>

                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                          {filing.risks.map((risk) => (
                            <li key={risk}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                <a
                  href={filing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-purple-600 hover:underline"
                >
                  View {filing.type} Filing
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}