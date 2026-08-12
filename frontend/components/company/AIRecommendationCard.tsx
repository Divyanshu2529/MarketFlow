"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AIRecommendation = {
  recommendation: string;
  confidence: number;
  reasoning: string;
};

type AIRecommendationCardProps = {
  ticker: string;
};

export function AIRecommendationCard({
  ticker,
}: AIRecommendationCardProps) {
  const [data, setData] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendation() {
      try {
        const response = await api.get<AIRecommendation>(
          `/api/company/${ticker}/recommendation`
        );

        setData(response.data);
      } catch (error) {
        console.error("Failed to load AI recommendation:", error);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendation();
  }, [ticker]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          AI Recommendation
        </p>

        <p className="mt-6 text-sm text-slate-500">
          Analyzing company data...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          AI Recommendation
        </p>

        <p className="mt-6 text-sm text-slate-500">
          AI recommendation unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        AI Recommendation
      </p>

      <h2 className="mt-3 text-3xl font-bold text-emerald-600">
        {data.recommendation}
      </h2>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-500">Confidence</span>

          <span className="font-semibold text-slate-900">
            {data.confidence}%
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-emerald-500"
            style={{
              width: `${data.confidence}%`,
            }}
          />
        </div>
      </div>

      <p className="mt-6 text-sm leading-6 text-slate-600">
        {data.reasoning}
      </p>
    </div>
  );
}