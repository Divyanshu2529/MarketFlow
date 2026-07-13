const filings = [
  {
    type: "10-K",
    date: "2024-10-31",
    summary:
      "Annual report highlights strong services growth, continued cash generation, and AI investments across Apple's ecosystem.",
  },
  {
    type: "10-Q",
    date: "2025-02-01",
    summary:
      "Quarterly filing shows stable margins, record services revenue, and continued share repurchases.",
  },
];

export function SECFilings() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          SEC Filing Summary
        </h2>

        <p className="text-sm text-slate-500">
          AI-generated summaries of recent SEC filings.
        </p>
      </div>

      <div className="space-y-5">
        {filings.map((filing) => (
          <div
            key={`${filing.type}-${filing.date}`}
            className="rounded-xl border p-5 transition hover:border-purple-300 hover:bg-purple-50/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                {filing.type}
              </span>

              <span className="text-sm text-slate-500">
                {filing.date}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              {filing.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}