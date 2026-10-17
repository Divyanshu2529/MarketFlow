"use client";

import { useEffect, useState } from "react";

import {
  getNewsFeed,
  NewsArticle,
} from "@/lib/api";

type CardLayout =
  | "hero"
  | "large"
  | "small"
  | "full";

const highImpactKeywords = [
  "breaking",
  "earnings",
  "revenue",
  "profit",
  "acquisition",
  "merger",
  "lawsuit",
  "regulatory",
  "forecast",
  "guidance",
  "price target",
  "all-time high",
  "stock split",
  "dividend",
  "partnership",
  "launch",
];

const fallbackGradients = [
  "linear-gradient(135deg, #172554, #6d28d9, #111827)",
  "linear-gradient(135deg, #064e3b, #0f766e, #111827)",
  "linear-gradient(135deg, #7c2d12, #be123c, #111827)",
  "linear-gradient(135deg, #0c4a6e, #2563eb, #111827)",
  "linear-gradient(135deg, #581c87, #c026d3, #111827)",
];

function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return "Recent";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isHighImpact(article: NewsArticle) {
  const text = `${article.title} ${
    article.summary ?? ""
  }`.toLowerCase();

  return highImpactKeywords.some((keyword) =>
    text.includes(keyword)
  );
}

function getCardLayout(
  article: NewsArticle,
  index: number,
  articles: NewsArticle[]
): CardLayout {
  if (index === 0) {
    return "hero";
  }

  const isLastArticle = index === articles.length - 1;
  const isOnlyArticleInRow =
    isLastArticle && (index - 1) % 2 === 0;

  if (isOnlyArticleInRow) {
    return "full";
  }

  const pairStartIndex =
    index % 2 === 1 ? index : index - 1;

  const pairEndIndex = pairStartIndex + 1;

  const firstArticle = articles[pairStartIndex];
  const secondArticle = articles[pairEndIndex];

  const firstIsImportant = isHighImpact(firstArticle);
  const secondIsImportant = secondArticle
    ? isHighImpact(secondArticle)
    : false;

  let largeCardIndex: number;

  if (firstIsImportant !== secondIsImportant) {
    largeCardIndex = firstIsImportant
      ? pairStartIndex
      : pairEndIndex;
  } else {
    const pairNumber = Math.floor(
      (pairStartIndex - 1) / 2
    );

    largeCardIndex =
      pairNumber % 2 === 0
        ? pairStartIndex
        : pairEndIndex;
  }

  return index === largeCardIndex ? "large" : "small";
}

function FallbackVisual({ index }: { index: number }) {
  const gradient =
    fallbackGradients[index % fallbackGradients.length];

  return (
    <div
      className="relative h-full min-h-[160px] overflow-hidden"
      style={{ backgroundImage: gradient }}
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="absolute bottom-8 left-8 flex items-end gap-2 opacity-70">
        <div className="h-8 w-3 rounded-t bg-white/50" />
        <div className="h-14 w-3 rounded-t bg-white/70" />
        <div className="h-10 w-3 rounded-t bg-white/40" />
        <div className="h-20 w-3 rounded-t bg-white/80" />
        <div className="h-12 w-3 rounded-t bg-white/50" />
      </div>

      <div className="absolute bottom-6 right-8 h-24 w-24 rounded-full border border-white/30" />

      <div className="relative z-10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
          MarketFlow
        </p>

        <p className="mt-2 text-lg font-semibold text-white">
          Market update
        </p>
      </div>
    </div>
  );
}

function NewsImage({
  article,
  layout,
  index,
}: {
  article: NewsArticle;
  layout: CardLayout;
  index: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageSize =
    layout === "hero"
      ? "min-h-[300px] lg:min-h-[390px]"
      : layout === "full"
        ? "h-[240px] md:h-[260px]"
        : layout === "large"
          ? "h-64"
          : "h-44";

  const showImage = Boolean(article.image) && !imageFailed;

  return (
    <div
      className={`relative overflow-hidden bg-slate-900 bg-cover bg-center ${imageSize}`}
    >
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image ?? ""}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        </>
      ) : (
        <FallbackVisual index={index} />
      )}
    </div>
  );
}

export function NewsFeed() {
  const [articles, setArticles] = useState<NewsArticle[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNews() {
      try {
        const newsArticles = await getNewsFeed();
        setArticles(newsArticles);
      } catch (requestError) {
        console.error("Unable to load news:", requestError);
        setError("Unable to load your personalized news.");
      } finally {
        setIsLoading(false);
      }
    }

    loadNews();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Loading personalized news...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
        <h3 className="font-semibold text-slate-900">
          No personalized updates yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Search for companies or add them to your watchlist
          to personalize your feed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
      {articles.map((article, index) => {
        const layout = getCardLayout(
          article,
          index,
          articles
        );

        const cardClasses =
          layout === "hero"
            ? "lg:col-span-12 grid overflow-hidden rounded-[2rem] border bg-white shadow-sm transition hover:-translate-y-1 hover:border-purple-400 hover:shadow-lg lg:grid-cols-[1.25fr_1fr]"
            : layout === "full"
              ? "lg:col-span-12 grid overflow-hidden rounded-[1.5rem] border bg-white shadow-sm transition hover:-translate-y-1 hover:border-purple-400 hover:shadow-md md:grid-cols-[280px_1fr]"
              : layout === "large"
                ? "lg:col-span-7 flex flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-sm transition hover:-translate-y-1 hover:border-purple-400 hover:shadow-md"
                : "lg:col-span-5 flex flex-col overflow-hidden rounded-[1.25rem] border bg-white shadow-sm transition hover:-translate-y-1 hover:border-purple-400 hover:shadow-md";

        const contentClasses =
          layout === "hero"
            ? "flex flex-col justify-center p-7"
            : layout === "full"
              ? "flex flex-col justify-center p-6"
              : layout === "large"
                ? "flex flex-1 flex-col justify-center p-6"
                : "flex flex-1 flex-col justify-center p-5";

        const titleClasses =
          layout === "hero"
            ? "line-clamp-3 text-2xl font-bold leading-tight text-slate-900 group-hover:text-purple-700"
            : layout === "large"
              ? "line-clamp-3 text-xl font-semibold leading-tight text-slate-900 group-hover:text-purple-700"
              : "line-clamp-3 text-lg font-semibold leading-tight text-slate-900 group-hover:text-purple-700";

        return (
          <a
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className={`group ${cardClasses}`}
          >
            <NewsImage
              article={article}
              layout={layout}
              index={index}
            />

            <div className={contentClasses}>
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span className="truncate">
                  {article.publisher ?? "Financial News"}
                </span>

                <span className="shrink-0">
                  {formatDate(article.publishedDate)}
                </span>
              </div>

              <h2 className={titleClasses}>
                {article.title}
              </h2>

              {article.summary && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">
                  {article.summary}
                </p>
              )}

              <p className="mt-5 text-sm font-medium text-purple-600">
                Read article →
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}