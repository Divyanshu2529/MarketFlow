"use client";

import Link from "next/link";
import { useState } from "react";

import { api, createReport } from "@/lib/api";

type SaveReportButtonProps = {
  ticker: string;
  companyName: string;
  reportData: Record<string, unknown>;
};

async function fetchOptionalComponent(
  path: string
): Promise<unknown> {
  try {
    const response = await api.get(path);
    return response.data;
  } catch (error) {
    console.warn(`Unable to load ${path}:`, error);
    return null;
  }
}

export function SaveReportButton({
  ticker,
  companyName,
  reportData,
}: SaveReportButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      const encodedTicker = encodeURIComponent(ticker);

      const [
        recommendation,
        sentiment,
        filings,
        competitors,
      ] = await Promise.all([
        fetchOptionalComponent(
          `/api/company/${encodedTicker}/recommendation`
        ),
        fetchOptionalComponent(
          `/api/company/${encodedTicker}/sentiment`
        ),
        fetchOptionalComponent(
          `/api/company/${encodedTicker}/filings`
        ),
        fetchOptionalComponent(
          `/api/company/${encodedTicker}/competitors`
        ),
      ]);

      await createReport({
        ticker,
        company_name: companyName,
        report_type: "Equity Research",
        report_data: {
          ...reportData,
          recommendation,
          sentiment,
          filings,
          competitors,
        },
      });

      setIsSaved(true);
    } catch (requestError) {
      console.error("Unable to save report:", requestError);
      setError("Unable to save this report.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isSaved) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-medium text-green-700">
          Report saved
        </span>

        <Link
          href="/reports"
          className="text-sm font-medium text-purple-600 hover:text-purple-800"
        >
          View saved reports
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving report..." : "Save Report"}
      </button>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}