import os
from collections.abc import Sequence
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

if not NEWS_API_KEY:
    raise RuntimeError("NEWS_API_KEY is missing from .env")


NEWS_API_BASE_URL = "https://newsapi.org/v2"
NEWS_API_TIMEOUT = 15


FINANCIAL_NEWS_QUERY = (
    '"stock market" OR stocks OR shares OR equities OR '
    "investing OR finance OR markets OR earnings OR "
    '"financial results" OR revenue OR profit OR '
    '"price target" OR dividend OR merger OR acquisition OR '
    "IPO OR bonds OR commodities OR economy OR "
    '"interest rates" OR inflation OR "Federal Reserve" OR '
    '"quarterly results" OR guidance OR forecast'
)


GENERAL_MARKET_QUERY = (
    '"stock market" OR stocks OR shares OR equities OR '
    "investing OR finance OR markets OR earnings OR "
    '"financial results" OR IPO OR bonds OR commodities OR '
    'economy OR "interest rates" OR inflation OR '
    '"Federal Reserve" OR company OR business'
)


def clean_query_value(value: str) -> str:
    return value.replace('"', "").strip()[:100]


async def fetch_news(
    query: str,
    page_size: int = 20,
) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(
        timeout=NEWS_API_TIMEOUT
    ) as client:
        response = await client.get(
            f"{NEWS_API_BASE_URL}/everything",
            params={
                "q": query,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": min(page_size, 100),
                "apiKey": NEWS_API_KEY,
            },
        )

        response.raise_for_status()

        data = response.json()

        if data.get("status") == "error":
            raise RuntimeError(
                data.get(
                    "message",
                    "NewsAPI request failed",
                )
            )

        articles = data.get("articles", [])
        results: list[dict[str, Any]] = []
        seen_urls: set[str] = set()

        for article in articles:
            title = article.get("title")
            url = article.get("url")

            if (
                not title
                or not url
                or title == "[Removed]"
                or url in seen_urls
            ):
                continue

            seen_urls.add(url)

            results.append(
                {
                    "title": title,
                    "publisher": (
                        article.get("source", {}) or {}
                    ).get("name"),
                    "publishedDate": article.get(
                        "publishedAt"
                    ),
                    "url": url,
                    "image": article.get("urlToImage"),
                    "summary": article.get("description"),
                }
            )

        return results


def merge_news(
    personalized_articles: list[dict[str, Any]],
    market_articles: list[dict[str, Any]],
    limit: int = 20,
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for article in [
        *personalized_articles,
        *market_articles,
    ]:
        url = article.get("url")

        if not url or url in seen_urls:
            continue

        seen_urls.add(url)
        merged.append(article)

        if len(merged) >= limit:
            break

    return merged


async def get_company_news(
    company_name: str,
) -> list[dict[str, Any]]:
    clean_company_name = clean_query_value(company_name)

    query = (
        f'("{clean_company_name}" OR '
        f'"{clean_company_name} stock" OR '
        f'"{clean_company_name} earnings") '
        f"AND ({FINANCIAL_NEWS_QUERY})"
    )

    return await fetch_news(query, page_size=10)


async def get_personalized_news(
    interests: Sequence[dict[str, str]],
) -> list[dict[str, Any]]:
    company_terms: list[str] = []

    for interest in interests[:8]:
        company_name = clean_query_value(
            interest.get("company_name", "")
        )
        ticker = clean_query_value(
            interest.get("ticker", "")
        )

        terms: list[str] = []

        if company_name:
            terms.append(f'"{company_name}"')

        if ticker:
            terms.append(ticker)

        if terms:
            company_terms.append(
                f"({' OR '.join(terms)})"
            )

    if not company_terms:
        return await fetch_news(
            GENERAL_MARKET_QUERY,
            page_size=20,
        )

    company_query = " OR ".join(company_terms)

    personalized_query = (
        f"({company_query}) "
        f"AND ({FINANCIAL_NEWS_QUERY})"
    )

    personalized_articles = await fetch_news(
        personalized_query,
        page_size=14,
    )

    market_articles = await fetch_news(
        GENERAL_MARKET_QUERY,
        page_size=8,
    )

    return merge_news(
        personalized_articles,
        market_articles,
        limit=20,
    )