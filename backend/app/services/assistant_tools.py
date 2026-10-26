from __future__ import annotations

import asyncio
from typing import Any

from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report
from app.models.watchlist_item import WatchlistItem
from app.services.company_service import (
    get_company_competitors,
    get_company_filings,
    get_company_overview,
    get_company_recommendation,
    get_company_sentiment,
    search_companies,
)
from app.services.news_service import get_company_news
from app.services.stock_analysis_service import get_stock_analysis


def _normalize_ticker(value: Any) -> str:
    return str(value or "").strip().upper()[:20]


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()[:150]


TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_companies",
        description=(
            "Searches for companies by name or ticker symbol."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Company name or ticker.",
                }
            },
            "required": ["query"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_overview",
        description=(
            "Gets financial overview data for a company."
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
        name="get_stock_analysis",
        description=(
            "Gets technical stock analysis, indicators, "
            "price history, and BUY, HOLD, or AVOID signals."
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
        name="get_company_news",
        description="Gets recent news about a company.",
        parameters={
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "Company name or ticker.",
                }
            },
            "required": ["company_name"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_recommendation",
        description="Gets the available company recommendation.",
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
        description="Gets company sentiment analysis.",
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
        description="Gets SEC filings for a company.",
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
        description="Gets competitor information.",
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
        description="Gets overview data for multiple companies.",
        parameters={
            "type": "object",
            "properties": {
                "tickers": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "At least two ticker symbols.",
                }
            },
            "required": ["tickers"],
        },
    ),
    types.FunctionDeclaration(
        name="get_my_watchlist",
        description=(
            "Gets the authenticated user's saved watchlist "
            "companies."
        ),
        parameters={
            "type": "object",
            "properties": {},
        },
    ),
    types.FunctionDeclaration(
        name="get_my_saved_reports",
        description=(
            "Gets the authenticated user's saved research reports."
        ),
        parameters={
            "type": "object",
            "properties": {},
        },
    ),
    types.FunctionDeclaration(
        name="get_saved_report",
        description=(
            "Gets the full contents of one saved research report."
        ),
        parameters={
            "type": "object",
            "properties": {
                "report_id": {
                    "type": "integer",
                    "description": "The saved report ID.",
                }
            },
            "required": ["report_id"],
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
    user_id: int | None = None,
    db: AsyncSession | None = None,
) -> Any:
    try:
        if name == "search_companies":
            query = _normalize_text(arguments.get("query"))

            if not query:
                return {"error": "A search query is required."}

            return await search_companies(query)

        if name == "get_company_overview":
            ticker = _normalize_ticker(arguments.get("ticker"))
            result = await get_company_overview(ticker)

            return result or {
                "error": f"No overview found for {ticker}."
            }

        if name == "get_stock_analysis":
            ticker = _normalize_ticker(arguments.get("ticker"))
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
            ticker = _normalize_ticker(arguments.get("ticker"))
            result = await get_company_recommendation(ticker)

            return result or {
                "error": (
                    f"No recommendation found for {ticker}."
                )
            }

        if name == "get_company_sentiment":
            ticker = _normalize_ticker(arguments.get("ticker"))
            result = await get_company_sentiment(ticker)

            return result or {
                "error": (
                    f"No sentiment data found for {ticker}."
                )
            }

        if name == "get_company_filings":
            ticker = _normalize_ticker(arguments.get("ticker"))
            return await get_company_filings(ticker)

        if name == "get_company_competitors":
            ticker = _normalize_ticker(arguments.get("ticker"))
            return await get_company_competitors(ticker)

        if name == "compare_companies":
            raw_tickers = arguments.get("tickers", [])

            if not isinstance(raw_tickers, list):
                return {"error": "Tickers must be a list."}

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

            return {"companies": companies}

        if name == "get_my_watchlist":
            if user_id is None or db is None:
                return {
                    "error": (
                        "User watchlist access is unavailable."
                    )
                }

            result = await db.scalars(
                select(WatchlistItem)
                .where(WatchlistItem.user_id == user_id)
                .order_by(WatchlistItem.created_at.desc())
            )

            items = result.all()

            return {
                "watchlist": [
                    {
                        "ticker": item.ticker,
                        "created_at": (
                            item.created_at.isoformat()
                            if item.created_at
                            else None
                        ),
                    }
                    for item in items
                ]
            }

        if name == "get_my_saved_reports":
            if user_id is None or db is None:
                return {
                    "error": (
                        "Saved report access is unavailable."
                    )
                }

            result = await db.scalars(
                select(Report)
                .where(Report.user_id == user_id)
                .order_by(Report.created_at.desc())
                .limit(10)
            )

            reports = result.all()

            return {
                "reports": [
                    {
                        "id": report.id,
                        "ticker": report.ticker,
                        "company_name": report.company_name,
                        "title": report.title,
                        "report_type": report.report_type,
                        "created_at": (
                            report.created_at.isoformat()
                            if report.created_at
                            else None
                        ),
                    }
                    for report in reports
                ]
            }

        if name == "get_saved_report":
            if user_id is None or db is None:
                return {
                    "error": (
                        "Saved report access is unavailable."
                    )
                }

            try:
                report_id = int(arguments.get("report_id"))
            except (TypeError, ValueError):
                return {
                    "error": "A valid report ID is required."
                }

            report = await db.scalar(
                select(Report).where(
                    Report.id == report_id,
                    Report.user_id == user_id,
                )
            )

            if report is None:
                return {
                    "error": "Saved report was not found."
                }

            return {
                "id": report.id,
                "ticker": report.ticker,
                "company_name": report.company_name,
                "title": report.title,
                "report_type": report.report_type,
                "created_at": (
                    report.created_at.isoformat()
                    if report.created_at
                    else None
                ),
                "report_data": report.report_data or {},
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