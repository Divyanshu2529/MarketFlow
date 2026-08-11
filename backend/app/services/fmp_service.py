import asyncio
import os
from typing import Any, Awaitable

import httpx
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

FMP_API_KEY = os.getenv("FMP_API_KEY")

if not FMP_API_KEY:
    raise RuntimeError("FMP_API_KEY is missing from .env")

FMP_BASE_URL = "https://financialmodelingprep.com/stable"

REQUEST_TIMEOUT = httpx.Timeout(15.0)

# Search results can remain cached for one hour.
search_cache: TTLCache[str, list[dict[str, Any]]] = TTLCache(
    maxsize=500,
    ttl=60 * 60,
)

# Company profiles can remain cached for one hour.
profile_cache: TTLCache[str, dict[str, Any] | None] = TTLCache(
    maxsize=500,
    ttl=60 * 60,
)

# Financial statements can remain cached for 30 minutes.
financials_cache: TTLCache[str, dict[str, Any]] = TTLCache(
    maxsize=500,
    ttl=30 * 60,
)

# Historical annual statements change infrequently.
history_cache: TTLCache[str, list[dict[str, Any]]] = TTLCache(
    maxsize=500,
    ttl=6 * 60 * 60,
)

# Prevent identical simultaneous requests from reaching FMP more than once.
search_tasks: dict[str, asyncio.Task[list[dict[str, Any]]]] = {}
profile_tasks: dict[str, asyncio.Task[dict[str, Any] | None]] = {}
financials_tasks: dict[str, asyncio.Task[dict[str, Any]]] = {}
history_tasks: dict[str, asyncio.Task[list[dict[str, Any]]]] = {}


async def _get_fmp_json(
    endpoint: str,
    params: dict[str, Any],
) -> Any:
    """
    Make one request to FMP and return the decoded JSON response.
    """

    request_params = {
        **params,
        "apikey": FMP_API_KEY,
    }

    async with httpx.AsyncClient(
        base_url=FMP_BASE_URL,
        timeout=REQUEST_TIMEOUT,
    ) as client:
        response = await client.get(
            endpoint,
            params=request_params,
        )

        response.raise_for_status()
        return response.json()


async def _run_single_flight(
    key: str,
    tasks: dict[str, asyncio.Task[Any]],
    operation: Awaitable[Any],
) -> Any:
    """
    Ensure concurrent calls using the same key share one running operation.
    """

    existing_task = tasks.get(key)

    if existing_task is not None:
        return await existing_task

    task = asyncio.create_task(operation)
    tasks[key] = task

    try:
        return await task
    finally:
        tasks.pop(key, None)


async def search_companies(query: str) -> list[dict[str, Any]]:
    normalized_query = query.strip().lower()

    if len(normalized_query) < 2:
        return []

    cached_results = search_cache.get(normalized_query)

    if cached_results is not None:
        print(f"FMP SEARCH CACHE HIT: {normalized_query}")
        return cached_results

    async def fetch_search_results() -> list[dict[str, Any]]:
        # Check again because another request may have populated the cache.
        cached = search_cache.get(normalized_query)

        if cached is not None:
            return cached

        try:
            print(f"FMP SEARCH REQUEST: {normalized_query}")

            data = await _get_fmp_json(
                "/search-name",
                {
                    "query": normalized_query,
                },
            )

            results = data if isinstance(data, list) else []
            search_cache[normalized_query] = results

            return results

        except (httpx.HTTPStatusError, httpx.RequestError) as error:
            print(f"FMP search failed for '{normalized_query}': {error}")
            return []

    return await _run_single_flight(
        normalized_query,
        search_tasks,
        fetch_search_results(),
    )


async def get_company_profile(
    ticker: str,
) -> dict[str, Any] | None:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return None

    if normalized_ticker in profile_cache:
        print(f"FMP PROFILE CACHE HIT: {normalized_ticker}")
        return profile_cache[normalized_ticker]

    async def fetch_profile() -> dict[str, Any] | None:
        if normalized_ticker in profile_cache:
            return profile_cache[normalized_ticker]

        try:
            print(f"FMP PROFILE REQUEST: {normalized_ticker}")

            data = await _get_fmp_json(
                "/profile",
                {
                    "symbol": normalized_ticker,
                },
            )

            profile = data[0] if isinstance(data, list) and data else None
            profile_cache[normalized_ticker] = profile

            return profile

        except (httpx.HTTPStatusError, httpx.RequestError) as error:
            print(
                f"FMP profile failed for {normalized_ticker}: {error}"
            )
            return None

    return await _run_single_flight(
        normalized_ticker,
        profile_tasks,
        fetch_profile(),
    )


async def get_company_financials(
    ticker: str,
) -> dict[str, Any]:
    normalized_ticker = ticker.strip().upper()

    empty_financials = {
        "revenue": None,
        "eps": None,
        "profitMargin": None,
        "peRatio": None,
        "debt": None,
        "cashFlow": None,
    }

    if not normalized_ticker:
        return empty_financials

    cached_financials = financials_cache.get(normalized_ticker)

    if cached_financials is not None:
        print(f"FMP FINANCIALS CACHE HIT: {normalized_ticker}")
        return cached_financials

    async def fetch_financials() -> dict[str, Any]:
        cached = financials_cache.get(normalized_ticker)

        if cached is not None:
            return cached

        try:
            print(f"FMP FINANCIALS REQUEST: {normalized_ticker}")

            common_params = {
                "symbol": normalized_ticker,
                "period": "annual",
                "limit": 1,
            }

            (
                income,
                balance,
                cashflow,
                ratios,
            ) = await asyncio.gather(
                _get_fmp_json(
                    "/income-statement",
                    common_params,
                ),
                _get_fmp_json(
                    "/balance-sheet-statement",
                    common_params,
                ),
                _get_fmp_json(
                    "/cash-flow-statement",
                    common_params,
                ),
                _get_fmp_json(
                    "/ratios",
                    common_params,
                ),
            )

            latest_income = (
                income[0]
                if isinstance(income, list) and income
                else {}
            )

            latest_balance = (
                balance[0]
                if isinstance(balance, list) and balance
                else {}
            )

            latest_cashflow = (
                cashflow[0]
                if isinstance(cashflow, list) and cashflow
                else {}
            )

            latest_ratios = (
                ratios[0]
                if isinstance(ratios, list) and ratios
                else {}
            )

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

            financials_cache[normalized_ticker] = financials
            return financials

        except (httpx.HTTPStatusError, httpx.RequestError) as error:
            print(
                f"FMP financials failed for "
                f"{normalized_ticker}: {error}"
            )
            return empty_financials

    return await _run_single_flight(
        normalized_ticker,
        financials_tasks,
        fetch_financials(),
    )


async def get_income_statement_history(
    ticker: str,
) -> list[dict[str, Any]]:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return []

    cached_history = history_cache.get(normalized_ticker)

    if cached_history is not None:
        print(f"FMP HISTORY CACHE HIT: {normalized_ticker}")
        return cached_history

    async def fetch_history() -> list[dict[str, Any]]:
        cached = history_cache.get(normalized_ticker)

        if cached is not None:
            return cached

        try:
            print(f"FMP HISTORY REQUEST: {normalized_ticker}")

            data = await _get_fmp_json(
                "/income-statement",
                {
                    "symbol": normalized_ticker,
                    "period": "annual",
                    "limit": 5,
                },
            )

            if not isinstance(data, list):
                return []

            history = [
                {
                    "year": item.get("fiscalYear"),
                    "revenue": item.get("revenue"),
                    "eps": item.get("eps"),
                }
                for item in reversed(data)
            ]

            history_cache[normalized_ticker] = history
            return history

        except (httpx.HTTPStatusError, httpx.RequestError) as error:
            print(
                f"FMP history failed for "
                f"{normalized_ticker}: {error}"
            )
            return []

    return await _run_single_flight(
        normalized_ticker,
        history_tasks,
        fetch_history(),
    )