from __future__ import annotations

import asyncio
from typing import Any

from google.genai import types

from app.services.company_service import (
    get_company_competitors,
    get_company_filings,
    get_company_overview,
    get_company_recommendation,
    get_company_sentiment,
    search_companies,
)
from app.services.news_service import get_company_news
from app.services.stock_analysis_service import (
    get_stock_analysis,
)


def _normalize_ticker(value: Any) -> str:
    return str(value or "").strip().upper()[:20]


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()[:150]


TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_companies",
        description=(
            "Searches for companies by name or ticker symbol. "
            "Use this before requesting company data when the "
            "user provides a company name instead of a ticker."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Company name or ticker, such as "
                        "'Apple' or 'AAPL'."
                    ),
                }
            },
            "required": ["query"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_overview",
        description=(
            "Gets a company's financial overview, including "
            "market cap, revenue, price, EPS, P/E ratio, debt, "
            "cash flow, and historical revenue."
        ),
        parameters={
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": (
                        "The company's ticker symbol, such as AAPL."
                    ),
                }
            },
            "required": ["ticker"],
        },
    ),
    types.FunctionDeclaration(
        name="get_stock_analysis",
        description=(
            "Gets technical stock analysis, including price "
            "history, moving averages, RSI, volatility, momentum, "
            "and the calculated BUY, HOLD, or AVOID signal."
        ),
        parameters={
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": (
                        "The company's ticker symbol, such as AAPL."
                    ),
                }
            },
            "required": ["ticker"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_news",
        description=(
            "Gets recent news articles about a company, product, "
            "announcement, or market update."
        ),
        parameters={
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": (
                        "Company name, ticker, or product name. "
                        "Examples: Apple, AAPL, Apple iPhone."
                    ),
                }
            },
            "required": ["company_name"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_recommendation",
        description=(
            "Gets the AI recommendation currently available "
            "for a company."
        ),
        parameters={
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Company ticker symbol.",
                }
            },
            "required": ["ticker"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_sentiment",
        description=(
            "Gets the available sentiment analysis for a company."
        ),
        parameters={
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Company ticker symbol.",
                }
            },
            "required": ["ticker"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_filings",
        description=(
            "Gets available SEC filings for a company."
        ),
        parameters={
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Company ticker symbol.",
                }
            },
            "required": ["ticker"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_competitors",
        description=(
            "Gets competitor information for a company."
        ),
        parameters={
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Company ticker symbol.",
                }
            },
            "required": ["ticker"],
        },
    ),
    types.FunctionDeclaration(
        name="compare_companies",
        description=(
            "Gets overview data for multiple companies so they "
            "can be compared."
        ),
        parameters={
            "type": "object",
            "properties": {
                "tickers": {
                    "type": "array",
                    "items": {
                        "type": "string",
                    },
                    "description": (
                        "At least two company ticker symbols."
                    ),
                }
            },
            "required": ["tickers"],
        },
    ),
]


ASSISTANT_TOOLS = [
    types.Tool(
        function_declarations=TOOL_DECLARATIONS
    )
]


async def execute_assistant_tool(
    name: str,
    arguments: dict[str, Any],
) -> Any:
    try:
        if name == "search_companies":
            query = _normalize_text(
                arguments.get("query")
            )

            if not query:
                return {"error": "A search query is required."}

            return await search_companies(query)

        if name == "get_company_overview":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            result = await get_company_overview(ticker)

            return result or {
                "error": f"No overview found for {ticker}."
            }

        if name == "get_stock_analysis":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            return await get_stock_analysis(ticker)

        if name == "get_company_news":
            company_name = _normalize_text(
                arguments.get("company_name")
            )

            if not company_name:
                return {
                    "error": (
                        "A company name or ticker is required."
                    )
                }

            return await get_company_news(company_name)

        if name == "get_company_recommendation":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            result = await get_company_recommendation(ticker)

            return result or {
                "error": (
                    f"No recommendation found for {ticker}."
                )
            }

        if name == "get_company_sentiment":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            result = await get_company_sentiment(ticker)

            return result or {
                "error": (
                    f"No sentiment data found for {ticker}."
                )
            }

        if name == "get_company_filings":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            return await get_company_filings(ticker)

        if name == "get_company_competitors":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            return await get_company_competitors(ticker)

        if name == "compare_companies":
            raw_tickers = arguments.get("tickers", [])

            if not isinstance(raw_tickers, list):
                return {
                    "error": "Tickers must be a list."
                }

            tickers = [
                _normalize_ticker(ticker)
                for ticker in raw_tickers
            ]

            tickers = list(
                dict.fromkeys(
                    ticker
                    for ticker in tickers
                    if ticker
                )
            )

            if len(tickers) < 2:
                return {
                    "error": (
                        "At least two companies are required."
                    )
                }

            results = await asyncio.gather(
                *[
                    get_company_overview(ticker)
                    for ticker in tickers
                ],
                return_exceptions=True,
            )

            companies = []

            for ticker, result in zip(tickers, results):
                if isinstance(result, Exception):
                    companies.append(
                        {
                            "ticker": ticker,
                            "error": (
                                "Unable to load this company."
                            ),
                        }
                    )
                elif result is None:
                    companies.append(
                        {
                            "ticker": ticker,
                            "error": (
                                "Company data was not found."
                            ),
                        }
                    )
                else:
                    companies.append(result)

            return {
                "companies": companies,
            }

        return {
            "error": f"Unknown assistant tool: {name}"
        }

    except Exception:
        return {
            "error": (
                f"The tool '{name}' could not retrieve "
                "data right now."
            )
        }