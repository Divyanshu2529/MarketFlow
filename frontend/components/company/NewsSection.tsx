const newsItems = [
  {
    title: "Apple expands AI features across its product ecosystem",
    source: "MarketWatch",
    time: "2 hours ago",
    summary:
      "Apple continues to invest in AI-powered features across iPhone, Mac, and services.",
  },
  {
    title: "Apple services revenue remains a key growth driver",
    source: "CNBC",
    time: "5 hours ago",
    summary:
      "Analysts highlight services revenue and customer retention as major long-term strengths.",
  },
  {
    title: "Investors watch Apple margins ahead of next earnings report",
    source: "Reuters",
    time: "1 day ago",
    summary:
      "Wall Street is focused on hardware demand, services growth, and margin stability.",
  },
];

export function NewsSection() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">Latest News</h2>
        <p className="text-sm text-slate-500">
          Recent market headlines and company updates.
        </p>
      </div>

      <div className="space-y-4">
        {newsItems.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border p-4 transition hover:border-purple-300 hover:bg-purple-50/40"
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="font-medium text-slate-900">{item.title}</p>
              <span className="whitespace-nowrap text-xs text-slate-400">
                {item.time}
              </span>
            </div>

            <p className="text-sm text-slate-500">{item.summary}</p>

            <p className="mt-3 text-xs font-medium text-purple-600">
              {item.source}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}