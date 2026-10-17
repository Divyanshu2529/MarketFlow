"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  deleteReport,
  downloadReport,
  getReports,
} from "@/lib/api";
import type {
  Report,
  ReportDownloadFormat,
} from "@/lib/api";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingReportId, setDownloadingReportId] =
    useState<number | null>(null);

  const [selectedFormats, setSelectedFormats] = useState<
    Record<number, ReportDownloadFormat>
  >({});

  useEffect(() => {
    async function loadReports() {
      try {
        const savedReports = await getReports();
        setReports(savedReports);
      } catch {
        setError("Unable to load your saved reports.");
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, []);

  function handleFormatChange(
    reportId: number,
    format: ReportDownloadFormat
  ) {
    setSelectedFormats((currentFormats) => ({
      ...currentFormats,
      [reportId]: format,
    }));
  }

  async function handleDownload(reportId: number) {
    const format =
      selectedFormats[reportId] ?? "pdf";

    setError("");
    setDownloadingReportId(reportId);

    try {
      await downloadReport(reportId, format);
    } catch (downloadError) {
      console.error(
        "Unable to download report:",
        downloadError
      );
      setError("Unable to download this report.");
    } finally {
      setDownloadingReportId(null);
    }
  }

  async function handleDelete(reportId: number) {
    setError("");

    try {
      await deleteReport(reportId);

      setReports((currentReports) =>
        currentReports.filter(
          (report) => report.id !== reportId
        )
      );
    } catch {
      setError("Unable to delete this report.");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Research Reports
            </h1>

            <p className="mt-2 text-slate-500">
              Download and manage your saved equity research.
            </p>
          </div>

          <Link
            href="/research"
            className="rounded-lg bg-purple-600 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-purple-700"
          >
            Create New Report
          </Link>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
            Loading your reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No saved reports yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Open a company research page and save a report.
            </p>

            <Link
              href="/research"
              className="mt-5 inline-block rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              Start Research
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const selectedFormat =
                selectedFormats[report.id] ?? "pdf";

              const isDownloading =
                downloadingReportId === report.id;

              return (
                <div
                  key={report.id}
                  className="rounded-2xl border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      {report.ticker}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(report.id)
                      }
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>

                  <h2 className="mt-5 text-xl font-semibold text-slate-900">
                    {report.company_name}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {report.report_type}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Created{" "}
                    {new Date(
                      report.created_at
                    ).toLocaleDateString()}
                  </p>

                  <div className="mt-6 flex flex-col gap-3">
                    <select
                      value={selectedFormat}
                      onChange={(event) =>
                        handleFormatChange(
                          report.id,
                          event.target
                            .value as ReportDownloadFormat
                        )
                      }
                      className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    >
                      <option value="pdf">
                        PDF document
                      </option>

                      <option value="docx">
                        Word document
                      </option>

                      <option value="json">
                        JSON data
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(report.id)
                      }
                      disabled={isDownloading}
                      className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDownloading
                        ? "Downloading..."
                        : "Download Report"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}