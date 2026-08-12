"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type SentimentResponse = {
  positive: number;
  neutral: number;
  negative: number;
  overall: string;
};

type SentimentCardProps = {
  ticker: string;
};

export function SentimentCard({
  ticker,
}: SentimentCardProps) {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSentiment() {
      try {
        const response = await api.get<SentimentResponse>(
          `/api/company/${ticker}/sentiment`
        );

        setData(response.data);
      } catch (error) {
        console.error("Failed to load sentiment:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSentiment();
  }, [ticker]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Market Sentiment
        </p>

        <p className="mt-6 text-sm text-slate-500">
          Analyzing recent news...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Market Sentiment
        </p>

        <p className="mt-6 text-sm text-slate-500">
          Sentiment unavailable.
        </p>
      </div>
    );
  }

  const dominantValue =
    data.overall === "Positive"
      ? data.positive
      : data.overall === "Negative"
        ? data.negative
        : data.neutral;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        Market Sentiment
      </p>

      <div className="mt-6 flex items-center gap-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-emerald-500 bg-emerald-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {dominantValue}%
            </p>

            <p className="text-xs text-emerald-600">
              {data.overall}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <SentimentRow
            label="Positive"
            value={`${data.positive}%`}
            color="bg-emerald-500"
          />

          <SentimentRow
            label="Neutral"
            value={`${data.neutral}%`}
            color="bg-amber-400"
          />

          <SentimentRow
            label="Negative"
            value={`${data.negative}%`}
            color="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
}

function SentimentRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="w-16 text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}