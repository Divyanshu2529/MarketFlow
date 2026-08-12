import asyncio
from typing import Any

import httpx

from app.cache.redis_cache import redis_cache
from app.services.ai_service import (
    generate_investment_recommendation,
    generate_news_sentiment,
    generate_sec_filing_summary,
)
from app.services.fmp_client import fmp_client
from app.services.news_service import get_company_news
from app.services.sec_service import (
    get_filing_text,
    get_recent_filings,
)


SEARCH_CACHE_TTL = 60 * 60
COMPANY_OVERVIEW_CACHE_TTL = 30 * 60
AI_RECOMMENDATION_CACHE_TTL = 60 * 60
SENTIMENT_CACHE_TTL = 60 * 60
SEC_FILINGS_CACHE_TTL = 6 * 60 * 60


async def search_companies(
    query: str,
) -> list[dict[str, Any]]:
    normalized_query = query.strip().lower()

    if len(normalized_query) < 2:
        return []

    cache_key = f"search:{normalized_query}"

    try:
        cached_results = await redis_cache.get(cache_key)

        if cached_results is not None:
            print(
                f"REDIS SEARCH CACHE HIT: "
                f"{normalized_query}"
            )
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

            print(
                f"REDIS SEARCH CACHE STORED: "
                f"{normalized_query}"
            )

        except Exception as error:
            print(
                f"Redis search cache write failed: "
                f"{error}"
            )

        return results

    except (
        httpx.HTTPStatusError,
        httpx.RequestError,
    ) as error:
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
        cached_overview = await redis_cache.get(
            cache_key
        )

        if cached_overview is not None:
            print(
                f"REDIS COMPANY OVERVIEW CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached_overview

    except Exception as error:
        print(
            f"Redis overview cache read failed: "
            f"{error}"
        )

    try:
        print(
            f"FMP PROFILE REQUEST: "
            f"{normalized_ticker}"
        )

        profile_data = await fmp_client.get(
            "/profile",
            {
                "symbol": normalized_ticker,
            },
        )

        if (
            not isinstance(profile_data, list)
            or not profile_data
        ):
            return None

        company = profile_data[0]

        company_name = company.get(
            "companyName",
            normalized_ticker,
        )

        print(
            f"FMP COMPANY DATA REQUESTS: "
            f"{normalized_ticker}"
        )

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

        income = (
            income_data
            if isinstance(income_data, list)
            else []
        )

        balance = (
            balance_data
            if isinstance(balance_data, list)
            else []
        )

        cashflow = (
            cashflow_data
            if isinstance(cashflow_data, list)
            else []
        )

        ratios = (
            ratios_data
            if isinstance(ratios_data, list)
            else []
        )

        latest_income = (
            income[0]
            if income
            else {}
        )

        latest_balance = (
            balance[0]
            if balance
            else {}
        )

        latest_cashflow = (
            cashflow[0]
            if cashflow
            else {}
        )

        latest_ratios = (
            ratios[0]
            if ratios
            else {}
        )

        financials = {
            "revenue": latest_income.get(
                "revenue"
            ),
            "eps": latest_income.get(
                "eps"
            ),
            "profitMargin": latest_ratios.get(
                "netProfitMargin"
            ),
            "peRatio": latest_ratios.get(
                "priceEarningsRatio"
            ),
            "debt": latest_balance.get(
                "totalDebt"
            ),
            "cashFlow": latest_cashflow.get(
                "freeCashFlow"
            ),
        }

        history = [
            {
                "year": item.get(
                    "fiscalYear"
                ),
                "revenue": item.get(
                    "revenue"
                ),
                "eps": item.get(
                    "eps"
                ),
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
            print(
                f"Redis overview cache write failed: "
                f"{error}"
            )

        return overview

    except (
        httpx.HTTPStatusError,
        httpx.RequestError,
    ) as error:
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

    cache_key = (
        f"ai-recommendation:"
        f"{normalized_ticker}"
    )

    try:
        cached = await redis_cache.get(cache_key)

        if cached is not None:
            print(
                f"REDIS AI RECOMMENDATION CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached

    except Exception as error:
        print(
            f"Redis AI cache read failed: "
            f"{error}"
        )

    overview = await get_company_overview(
        normalized_ticker
    )

    if overview is None:
        return None

    recommendation = (
        await generate_investment_recommendation(
            overview
        )
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
        print(
            f"Redis AI cache write failed: "
            f"{error}"
        )

    return recommendation


async def get_company_sentiment(
    ticker: str,
) -> dict[str, Any] | None:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return None

    cache_key = (
        f"sentiment:{normalized_ticker}"
    )

    try:
        cached = await redis_cache.get(cache_key)

        if cached is not None:
            print(
                f"REDIS SENTIMENT CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached

    except Exception as error:
        print(
            f"Redis sentiment cache read failed: "
            f"{error}"
        )

    overview = await get_company_overview(
        normalized_ticker
    )

    if overview is None:
        return None

    news = overview.get(
        "news",
        [],
    )

    sentiment = await generate_news_sentiment(
        news
    )

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
        print(
            f"Redis sentiment cache write failed: "
            f"{error}"
        )

    return sentiment


async def get_company_filings(
    ticker: str,
) -> list[dict[str, Any]]:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return []

    filings = await get_recent_filings(normalized_ticker)

    async def process_filing(
        filing: dict[str, Any],
    ) -> dict[str, Any] | None:
        accession = filing["accessionNumber"]

        cache_key = (
            f"sec-summary:"
            f"{normalized_ticker}:"
            f"{accession}"
        )

        try:
            cached = await redis_cache.get(cache_key)

            if cached is not None:
                print(
                    f"REDIS SEC SUMMARY CACHE HIT: "
                    f"{normalized_ticker} "
                    f"{filing['type']}"
                )

                return {
                    **filing,
                    **cached,
                }

        except Exception as error:
            print(
                f"Redis SEC summary read failed: {error}"
            )

        try:
            filing_text = await get_filing_text(
                filing["url"]
            )

            summary = await generate_sec_filing_summary(
                filing["type"],
                filing_text,
            )

            # Do not cache Gemini failures.
            if not summary.get(
                "summary",
                "",
            ).startswith(
                "SEC filing summary is temporarily"
            ):
                try:
                    await redis_cache.set(
                        cache_key,
                        summary,
                        ttl=SEC_FILINGS_CACHE_TTL,
                    )

                    print(
                        f"REDIS SEC SUMMARY STORED: "
                        f"{normalized_ticker} "
                        f"{filing['type']}"
                    )

                except Exception as error:
                    print(
                        f"Redis SEC summary write failed: "
                        f"{error}"
                    )

            return {
                **filing,
                **summary,
            }

        except Exception as error:
            print(
                f"SEC filing processing failed for "
                f"{normalized_ticker}: {error}"
            )

            return None

    processed = await asyncio.gather(
        *[
            process_filing(filing)
            for filing in filings
        ]
    )

    return [
        filing
        for filing in processed
        if filing is not None
    ]

COMPETITOR_CACHE_TTL = 60 * 60


async def get_company_competitors(
    ticker: str,
) -> list[dict[str, Any]]:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return []

    cache_key = f"competitors:{normalized_ticker}"

    try:
        cached = await redis_cache.get(cache_key)

        if cached is not None:
            print(
                f"REDIS COMPETITOR CACHE HIT: "
                f"{normalized_ticker}"
            )
            return cached

    except Exception as error:
        print(
            f"Redis competitor cache read failed: {error}"
        )

    try:
        peer_data = await fmp_client.get(
            "/stock-peers",
            {
                "symbol": normalized_ticker,
            },
        )

        peer_symbols: list[str] = []

        if isinstance(peer_data, list):
            for item in peer_data:
                symbol = item.get("symbol")

                if (
                    symbol
                    and symbol != normalized_ticker
                    and symbol not in peer_symbols
                ):
                    peer_symbols.append(symbol)

        # Keep API usage reasonable.
        selected_symbols = [
            normalized_ticker,
            *peer_symbols[:2],
        ]

        async def fetch_metrics(
            symbol: str,
        ) -> dict[str, Any] | None:
            try:
                (
                    profile_data,
                    income_data,
                    ratios_data,
                ) = await asyncio.gather(
                    fmp_client.get(
                        "/profile",
                        {
                            "symbol": symbol,
                        },
                    ),
                    fmp_client.get(
                        "/income-statement",
                        {
                            "symbol": symbol,
                            "period": "annual",
                            "limit": 1,
                        },
                    ),
                    fmp_client.get(
                        "/ratios",
                        {
                            "symbol": symbol,
                            "period": "annual",
                            "limit": 1,
                        },
                    ),
                )

                profile = (
                    profile_data[0]
                    if isinstance(profile_data, list)
                    and profile_data
                    else {}
                )

                income = (
                    income_data[0]
                    if isinstance(income_data, list)
                    and income_data
                    else {}
                )

                ratios = (
                    ratios_data[0]
                    if isinstance(ratios_data, list)
                    and ratios_data
                    else {}
                )

                if not profile:
                    return None

                return {
                    "company": profile.get(
                        "companyName",
                        symbol,
                    ),
                    "ticker": symbol,
                    "marketCap": profile.get(
                        "marketCap"
                    ),
                    "revenue": income.get(
                        "revenue"
                    ),
                    "peRatio": ratios.get(
                        "priceEarningsRatio"
                    ),
                    "eps": income.get("eps"),
                    "profitMargin": ratios.get(
                        "netProfitMargin"
                    ),
                }

            except (
                httpx.HTTPStatusError,
                httpx.RequestError,
            ) as error:
                print(
                    f"Competitor data failed for "
                    f"{symbol}: {error}"
                )

                return None

        processed = await asyncio.gather(
            *[
                fetch_metrics(symbol)
                for symbol in selected_symbols
            ]
        )

        competitors = [
            item
            for item in processed
            if item is not None
        ]

        try:
            await redis_cache.set(
                cache_key,
                competitors,
                ttl=COMPETITOR_CACHE_TTL,
            )

            print(
                f"REDIS COMPETITOR DATA STORED: "
                f"{normalized_ticker}"
            )

        except Exception as error:
            print(
                f"Redis competitor cache write failed: "
                f"{error}"
            )

        return competitors

    except (
        httpx.HTTPStatusError,
        httpx.RequestError,
    ) as error:
        print(
            f"Competitor lookup failed for "
            f"{normalized_ticker}: {error}"
        )

        return []
