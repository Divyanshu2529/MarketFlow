import asyncio
from typing import Any

import httpx

from app.cache.redis_cache import redis_cache
from app.services.ai_service import (
    generate_investment_recommendation,
    generate_news_sentiment,
)
from app.services.fmp_client import fmp_client
from app.services.news_service import get_company_news


SEARCH_CACHE_TTL = 60 * 60
COMPANY_OVERVIEW_CACHE_TTL = 30 * 60
AI_RECOMMENDATION_CACHE_TTL = 60 * 60
SENTIMENT_CACHE_TTL = 60 * 60


async def search_companies(query: str) -> list[dict[str, Any]]:
    normalized_query = query.strip().lower()

    if len(normalized_query) < 2:
        return []

    cache_key = f"search:{normalized_query}"

    try:
        cached_results = await redis_cache.get(cache_key)

        if cached_results is not None:
            print(f"REDIS SEARCH CACHE HIT: {normalized_query}")
            return cached_results

    except Exception as error:
        print(f"Redis search cache read failed: {error}")

    try:
        print(f"FMP SEARCH REQUEST: {normalized_query}")

        data = await fmp_client.get(
            "/search-name",
            {
                "query": normalized_query,
            },
        )

        results = data if isinstance(data, list) else []

        try:
            await redis_cache.set(
                cache_key,
                results,
                ttl=SEARCH_CACHE_TTL,
            )

            print(f"REDIS SEARCH CACHE STORED: {normalized_query}")

        except Exception as error:
            print(f"Redis search cache write failed: {error}")

        return results

    except (httpx.HTTPStatusError, httpx.RequestError) as error:
        print(f"Company search failed: {error}")
        return []


async def get_company_overview(
    ticker: str,
) -> dict[str, Any] | None:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return None

    cache_key = f"overview:{normalized_ticker}"

    try:
        cached_overview = await redis_cache.get(cache_key)

        if cached_overview is not None:
            print(
                f"REDIS COMPANY OVERVIEW CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached_overview

    except Exception as error:
        print(f"Redis overview cache read failed: {error}")

    try:
        print(f"FMP PROFILE REQUEST: {normalized_ticker}")

        profile_data = await fmp_client.get(
            "/profile",
            {
                "symbol": normalized_ticker,
            },
        )

        if not isinstance(profile_data, list) or not profile_data:
            return None

        company = profile_data[0]

        company_name = company.get(
            "companyName",
            normalized_ticker,
        )

        print(f"FMP COMPANY DATA REQUESTS: {normalized_ticker}")

        (
            income_data,
            balance_data,
            cashflow_data,
            ratios_data,
            news,
        ) = await asyncio.gather(
            fmp_client.get(
                "/income-statement",
                {
                    "symbol": normalized_ticker,
                    "period": "annual",
                    "limit": 5,
                },
            ),
            fmp_client.get(
                "/balance-sheet-statement",
                {
                    "symbol": normalized_ticker,
                    "period": "annual",
                    "limit": 1,
                },
            ),
            fmp_client.get(
                "/cash-flow-statement",
                {
                    "symbol": normalized_ticker,
                    "period": "annual",
                    "limit": 1,
                },
            ),
            fmp_client.get(
                "/ratios",
                {
                    "symbol": normalized_ticker,
                    "period": "annual",
                    "limit": 1,
                },
            ),
            get_company_news(company_name),
        )

        income = income_data if isinstance(income_data, list) else []
        balance = balance_data if isinstance(balance_data, list) else []
        cashflow = cashflow_data if isinstance(cashflow_data, list) else []
        ratios = ratios_data if isinstance(ratios_data, list) else []

        latest_income = income[0] if income else {}
        latest_balance = balance[0] if balance else {}
        latest_cashflow = cashflow[0] if cashflow else {}
        latest_ratios = ratios[0] if ratios else {}

        financials = {
            "revenue": latest_income.get("revenue"),
            "eps": latest_income.get("eps"),
            "profitMargin": latest_ratios.get(
                "netProfitMargin"
            ),
            "peRatio": latest_ratios.get(
                "priceEarningsRatio"
            ),
            "debt": latest_balance.get("totalDebt"),
            "cashFlow": latest_cashflow.get(
                "freeCashFlow"
            ),
        }

        history = [
            {
                "year": item.get("fiscalYear"),
                "revenue": item.get("revenue"),
                "eps": item.get("eps"),
            }
            for item in reversed(income)
        ]

        overview = {
            "company": {
                **company,
                **financials,
            },
            "history": history,
            "news": news,
        }

        try:
            await redis_cache.set(
                cache_key,
                overview,
                ttl=COMPANY_OVERVIEW_CACHE_TTL,
            )

            print(
                f"REDIS COMPANY OVERVIEW STORED: "
                f"{normalized_ticker}"
            )

        except Exception as error:
            print(f"Redis overview cache write failed: {error}")

        return overview

    except (httpx.HTTPStatusError, httpx.RequestError) as error:
        print(
            f"Company overview failed for "
            f"{normalized_ticker}: {error}"
        )

        return None


async def get_company_recommendation(
    ticker: str,
) -> dict[str, Any] | None:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return None

    cache_key = f"ai-recommendation:{normalized_ticker}"

    try:
        cached = await redis_cache.get(cache_key)

        if cached is not None:
            print(
                f"REDIS AI RECOMMENDATION CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached

    except Exception as error:
        print(f"Redis AI cache read failed: {error}")

    overview = await get_company_overview(normalized_ticker)

    if overview is None:
        return None

    recommendation = await generate_investment_recommendation(
        overview
    )

    try:
        await redis_cache.set(
            cache_key,
            recommendation,
            ttl=AI_RECOMMENDATION_CACHE_TTL,
        )

        print(
            f"REDIS AI RECOMMENDATION STORED: "
            f"{normalized_ticker}"
        )

    except Exception as error:
        print(f"Redis AI cache write failed: {error}")

    return recommendation


async def get_company_sentiment(
    ticker: str,
) -> dict[str, Any] | None:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return None

    cache_key = f"sentiment:{normalized_ticker}"

    try:
        cached = await redis_cache.get(cache_key)

        if cached is not None:
            print(
                f"REDIS SENTIMENT CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached

    except Exception as error:
        print(f"Redis sentiment cache read failed: {error}")

    overview = await get_company_overview(normalized_ticker)

    if overview is None:
        return None

    news = overview.get("news", [])

    sentiment = await generate_news_sentiment(news)

    try:
        await redis_cache.set(
            cache_key,
            sentiment,
            ttl=SENTIMENT_CACHE_TTL,
        )

        print(
            f"REDIS SENTIMENT STORED: "
            f"{normalized_ticker}"
        )

    except Exception as error:
        print(f"Redis sentiment cache write failed: {error}")

    return sentiment