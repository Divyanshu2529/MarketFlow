"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  ExternalLink,
  Newspaper,
} from "lucide-react";

import {
  getPublicNewsFeed,
  type NewsArticle,
} from "@/lib/api";

function formatPublishedDate(
  date?: string | null
) {
  if (!date) {
    return "Recent";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function ArticleImage({
  article,
  featured = false,
}: {
  article: NewsArticle;
  featured?: boolean;
}) {
  if (article.image) {
    return (
      <img
        src={article.image}
        alt=""
        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
          featured ? "min-h-72" : "h-40"
        }`}
        loading={featured ? "eager" : "lazy"}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`flex h-full min-h-40 items-center justify-center bg-gradient-to-br from-accent via-orange-100 to-primary/50 ${
        featured ? "min-h-72" : ""
      }`}
    >
      {featured ? (
        <BarChart3
          size={58}
          className="text-primary/70"
        />
      ) : (
        <Newspaper
          size={38}
          className="text-primary/70"
        />
      )}
    </div>
  );
}

export function PublicNewsPreview() {
  const [articles, setArticles] = useState<
    NewsArticle[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPublicNews() {
      try {
        const publicArticles =
          await getPublicNewsFeed();

        if (isMounted) {
          setArticles(publicArticles);
        }
      } catch {
        if (isMounted) {
          setError(
            "Live public news is temporarily unavailable."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPublicNews();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div>
          <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />

          <div className="mt-4 h-10 w-72 animate-pulse rounded-xl bg-muted" />

          <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded-full bg-muted" />
        </div>

        <div className="grid overflow-hidden rounded-[2rem] border border-border bg-card lg:grid-cols-2">
          <div className="min-h-72 animate-pulse bg-muted" />

          <div className="space-y-5 p-8">
            <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
            <div className="h-14 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </section>
    );
  }

  if (error || articles.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-card p-10 text-center">
        <Newspaper
          size={34}
          className="mx-auto text-primary"
        />

        <h2 className="mt-4 text-xl font-bold text-card-foreground">
          Public news is currently unavailable
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Please refresh the page and try again later.
        </p>
      </section>
    );
  }

  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 4);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Public market feed
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Latest market news
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Stay informed with current financial and
            business headlines. Create an account to
            personalize your feed.
          </p>
        </div>

        <span className="w-fit rounded-full border border-primary/20 bg-accent px-3 py-1.5 text-xs font-medium text-primary">
          Public news
        </span>
      </div>

      <article className="grid overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
        <a
          href={featuredArticle.url}
          target="_blank"
          rel="noreferrer"
          className="group relative block min-h-72 overflow-hidden bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
          aria-label={`Read ${featuredArticle.title}`}
        >
          <ArticleImage
            article={featuredArticle}
            featured
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6 pt-20">
            <p className="text-sm font-medium text-white/85">
              {featuredArticle.publisher ??
                "Market news"}
            </p>

            <p className="mt-1 text-xs text-white/70">
              {formatPublishedDate(
                featuredArticle.publishedDate
              )}
            </p>
          </div>
        </a>

        <div className="flex flex-col justify-center p-7 sm:p-9">
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              {featuredArticle.publisher ??
                "Market news"}
            </span>

            <span>
              {formatPublishedDate(
                featuredArticle.publishedDate
              )}
            </span>
          </div>

          <h3 className="mt-5 text-2xl font-bold leading-tight text-card-foreground">
            {featuredArticle.title}
          </h3>

          {featuredArticle.summary && (
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
              {featuredArticle.summary}
            </p>
          )}

          <a
            href={featuredArticle.url}
            target="_blank"
            rel="noreferrer"
            className="mt-7 flex w-fit items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            Read full article
            <ArrowUpRight size={16} />
          </a>
        </div>
      </article>

      {secondaryArticles.length > 0 && (
        <div className="grid gap-5 md:grid-cols-3">
          {secondaryArticles.map((article) => (
            <article
              key={article.url}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                aria-label={`Read ${article.title}`}
              >
                <div className="h-40 overflow-hidden bg-accent">
                  <ArticleImage article={article} />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">
                      {article.publisher ??
                        "Market news"}
                    </span>

                    <span className="shrink-0">
                      {formatPublishedDate(
                        article.publishedDate
                      )}
                    </span>
                  </div>

                  <h3 className="mt-4 line-clamp-3 text-lg font-bold leading-snug text-card-foreground">
                    {article.title}
                  </h3>

                  {article.summary && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {article.summary}
                    </p>
                  )}

                  <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                    Open article
                    <ExternalLink size={15} />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}