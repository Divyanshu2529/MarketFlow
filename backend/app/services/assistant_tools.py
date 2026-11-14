from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime
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


logger = logging.getLogger(__name__)


def _normalize_ticker(value: Any) -> str:
    return str(value or "").strip().upper()[:20]


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()[:150]


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return value


def _serialize_watchlist_item(
    item: WatchlistItem,
) -> dict[str, Any]:
    return {
        "id": item.id,
        "ticker": item.ticker,
        "created_at": _serialize_value(item.created_at),
    }


def _serialize_report(report: Report) -> dict[str, Any]:
    return {
        "id": report.id,
        "ticker": report.ticker,
        "company_name": report.company_name,
        "title": report.title,
        "report_type": report.report_type,
        "report_data": report.report_data or {},
        "created_at": _serialize_value(report.created_at),
    }


TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_companies",
        description=(
            "Searches for companies by name or ticker symbol. "
            "Use this when the user provides a company name "
            "instead of a ticker."
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
            "Gets company financial overview data, including "
            "market cap, revenue, price, EPS, P/E, debt, "
            "cash flow, and revenue history."
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
            "Gets technical stock analysis, including price "
            "history, moving averages, RSI, volatility, momentum, "
            "and the calculated stock signal."
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
        description=(
            "Gets recent news, announcements, product launches, "
            "and company updates."
        ),
        parameters={
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "Company, ticker, or product name.",
                }
            },
            "required": ["company_name"],
        },
    ),
    types.FunctionDeclaration(
        name="get_company_recommendation",
        description="Gets the available AI company recommendation.",
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
        description="Gets the available company news sentiment.",
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
        description="Gets recent SEC filings for a company.",
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
        description="Gets competitor information for a company.",
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
            "Gets overview data for multiple companies to compare."
        ),
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
        description="Gets the authenticated user's saved watchlist.",
        parameters={
            "type": "object",
            "properties": {},
        },
    ),
    types.FunctionDeclaration(
        name="get_my_saved_reports",
        description="Gets the authenticated user's saved reports.",
        parameters={
            "type": "object",
            "properties": {},
        },
    ),
    types.FunctionDeclaration(
        name="get_saved_report",
        description=(
            "Gets one saved report belonging to the authenticated user."
        ),
        parameters={
            "type": "object",
            "properties": {
                "report_id": {
                    "type": "integer",
                    "description": "Saved report ID.",
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
    arguments: dict[str, Any] | None = None,
    user_id: int | None = None,
    db: AsyncSession | None = None,
) -> Any:
    arguments = arguments or {}

    logger.info(
        "Assistant tool call: %s",
        name,
    )

    try:
        if name == "search_companies":
            query = _normalize_text(
                arguments.get("query")
            )

            if not query:
                return {
                    "error": "A search query is required."
                }

            return await search_companies(query)

        if name == "get_company_overview":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            result = await get_company_overview(ticker)

            return result or {
                "error": (
                    f"No overview found for {ticker}."
                )
            }

        if name == "get_stock_analysis":
            ticker = _normalize_ticker(
                arguments.get("ticker")
            )

            result = await get_stock_analysis(ticker)

            return result or {
                "error": (
                    f"No stock analysis found for {ticker}."
                )
            }

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
            raw_tickers = arguments.get(
                "tickers",
                [],
            )

            if not isinstance(raw_tickers, list):
                return {
                    "error": "Tickers must be a list."
                }

            tickers = list(
                dict.fromkeys(
                    ticker
                    for ticker in (
                        _normalize_ticker(value)
                        for value in raw_tickers
                    )
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

            for ticker, result in zip(
                tickers,
                results,
            ):
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

        if name in {
            "get_my_watchlist",
            "get_my_saved_reports",
            "get_saved_report",
        } and (
            user_id is None
            or db is None
        ):
            return {
                "error": (
                    "User-specific data is unavailable "
                    "for this request."
                )
            }

        if name == "get_my_watchlist":
            result = await db.execute(
                select(WatchlistItem)
                .where(
                    WatchlistItem.user_id == user_id
                )
                .order_by(
                    WatchlistItem.created_at.desc()
                )
                .limit(50)
            )

            items = result.scalars().all()

            return {
                "items": [
                    _serialize_watchlist_item(item)
                    for item in items
                ],
                "count": len(items),
            }

        if name == "get_my_saved_reports":
            result = await db.execute(
                select(Report)
                .where(
                    Report.user_id == user_id
                )
                .order_by(
                    Report.created_at.desc()
                )
                .limit(20)
            )

            reports = result.scalars().all()

            return {
                "reports": [
                    _serialize_report(report)
                    for report in reports
                ],
                "count": len(reports),
            }

        if name == "get_saved_report":
            try:
                report_id = int(
                    arguments.get("report_id")
                )
            except (TypeError, ValueError):
                return {
                    "error": (
                        "A valid report ID is required."
                    )
                }

            result = await db.execute(
                select(Report).where(
                    Report.id == report_id,
                    Report.user_id == user_id,
                )
            )

            report = result.scalar_one_or_none()

            if report is None:
                return {
                    "error": "Saved report not found."
                }

            return _serialize_report(report)

        return {
            "error": (
                f"Unknown assistant tool: {name}"
            )
        }

    except Exception:
        logger.exception(
            "Assistant tool failed: %s",
            name,
        )

        return {
            "error": (
                f"The tool '{name}' could not retrieve "
                "data right now."
            )
        }