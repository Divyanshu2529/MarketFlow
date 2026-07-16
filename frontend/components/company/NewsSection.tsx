"use client";

type NewsItem = {
  title: string;
  publisher: string;
  publishedDate: string;
  summary: string;
  url: string;
};

type NewsSectionProps = {
  news: NewsItem[];
};

function formatPublishedDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewsSection({ news }: NewsSectionProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Latest News
        </h2>

        <p className="text-sm text-slate-500">
          Recent market headlines and company updates.
        </p>
      </div>

      <div className="space-y-4">
        {news.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border p-4 transition hover:border-purple-300 hover:bg-purple-50/40"
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="font-medium text-slate-900">
                {item.title}
              </p>

              <span className="whitespace-nowrap text-xs text-slate-400">
                {formatPublishedDate(item.publishedDate)}
              </span>
            </div>

            <p className="text-sm text-slate-500">
              {item.summary}
            </p>

            <p className="mt-3 text-xs font-medium text-purple-600">
              {item.publisher}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}