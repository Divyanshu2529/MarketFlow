from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.assistant import AssistantChatRequest
from app.services.assistant_tools import (
    ASSISTANT_TOOLS,
    execute_assistant_tool,
)
from app.services.openai_service import (
    generate_openai_fallback_answer,
)


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path, override=True)

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash",
)


class AssistantUnavailable(Exception):
    pass


def _is_gemini_quota_error(error: Exception) -> bool:
    error_text = str(error).lower()

    quota_markers = (
        "resource_exhausted",
        "quota",
        "rate limit",
        "rate_limit",
        "429",
    )

    return any(
        marker in error_text
        for marker in quota_markers
    )


def _safe_json(
    value: Any,
    max_chars: int = 14000,
) -> str:
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    except Exception:
        text = str(value)

    return text[:max_chars]


def _get_company_details(
    context: dict[str, Any],
) -> tuple[str, str]:
    company = context.get("company")

    if not isinstance(company, dict):
        company = {}

    company_name = (
        company.get("companyName")
        or company.get("name")
        or context.get("companyName")
        or ""
    )

    ticker = (
        context.get("ticker")
        or company.get("symbol")
        or company.get("ticker")
        or ""
    )

    return (
        str(company_name).strip(),
        str(ticker).strip().upper(),
    )


def _needs_news(message: str) -> bool:
    message_lower = message.lower()

    keywords = (
        "news",
        "latest",
        "recent",
        "current",
        "today",
        "update",
        "announcement",
        "announced",
        "release",
        "released",
        "launch",
        "launched",
        "iphone",
        "product",
        "new",
    )

    return any(
        keyword in message_lower
        for keyword in keywords
    )


def _news_query(
    message: str,
    context: dict[str, Any],
) -> str:
    company_name, ticker = _get_company_details(context)
    message_lower = message.lower()

    if "iphone" in message_lower:
        return f"{company_name or 'Apple'} iPhone"

    if company_name:
        return company_name

    if ticker:
        return ticker

    return message


def _is_summary_question(message: str) -> bool:
    message_lower = message.lower()

    phrases = (
        "summarize",
        "summary",
        "on screen",
        "this screen",
        "this page",
        "what am i looking at",
        "what is shown",
        "data shown",
        "everything shown",
    )

    return any(
        phrase in message_lower
        for phrase in phrases
    )


def _format_value(value: Any) -> str:
    if value is None:
        return "N/A"

    if isinstance(value, float):
        return f"{value:.2f}"

    if isinstance(value, dict):
        return _safe_json(value, 500)

    if isinstance(value, list):
        return _safe_json(value, 500)

    return str(value)


def _build_prompt(
    request: AssistantChatRequest,
) -> str:
    context_json = _safe_json(
        request.context or {},
        max_chars=14000,
    )

    history_text = "\n".join(
        f"{message.role}: {message.content}"
        for message in request.history[-10:]
    )

    return f"""
You are the MarketFlow AI Assistant.

MarketFlow is an equity research platform that helps users
understand company financials, stock analysis, market news,
company comparisons, watchlists, SEC filings, and reports.

Answer the user's question directly and clearly.

Tool rules:

1. Use search_companies when the user gives a company name
   instead of a ticker symbol.

2. Use get_company_overview for financial metrics and company
   information.

3. Use get_stock_analysis for price trends, RSI, moving averages,
   momentum, volatility, and BUY/HOLD/AVOID signals.

4. Use get_company_news for current news, product launches,
   announcements, releases, and company updates.

5. Use compare_companies when the user asks to compare companies.

6. Use SEC filing, recommendation, sentiment, and competitor tools
   when those topics are requested.

7. Use get_my_watchlist when the user asks about their watchlist,
   saved companies, or tracked companies.

8. Use get_my_saved_reports when the user asks to see saved reports.

9. Use get_saved_report when the user asks to analyze a specific
   saved report.

10. You may answer general educational finance questions using
    your general knowledge.

11. Never invent prices, financial metrics, news, release dates,
    or company facts.

12. If a tool returns an error, explain that the requested live data
    could not be retrieved instead of making up an answer.

13. Do not provide guaranteed investment advice. Explain risks and
    encourage independent research.

14. Keep answers concise but complete. Use Markdown bullet points
    and headings when useful.

15. Do not show raw JSON or Python dictionaries. Convert tool
    results into readable English.

Current page context:
{context_json}

Previous conversation:
{history_text or "No previous conversation."}

User question:
{request.message}
""".strip()


def _build_contents(
    request: AssistantChatRequest,
    prompt: str,
) -> list[types.Content]:
    contents: list[types.Content] = []

    history = list(request.history[-10:])

    if history:
        last_message = history[-1]

        if (
            last_message.role == "user"
            and last_message.content.strip()
            == request.message.strip()
        ):
            history = history[:-1]

    for message in history:
        role = (
            "model"
            if message.role == "assistant"
            else "user"
        )

        contents.append(
            types.Content(
                role=role,
                parts=[
                    types.Part(
                        text=message.content
                    )
                ],
            )
        )

    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part(text=prompt)
            ],
        )
    )

    return contents


async def _run_gemini_with_tools(
    request: AssistantChatRequest,
    user_id: int | None = None,
    db: AsyncSession | None = None,
) -> str:
    if not GEMINI_API_KEY:
        raise AssistantUnavailable(
            "GEMINI_API_KEY is not configured."
        )

    client = genai.Client(
        api_key=GEMINI_API_KEY
    )

    prompt = _build_prompt(request)
    contents = _build_contents(request, prompt)

    config = types.GenerateContentConfig(
        tools=ASSISTANT_TOOLS,
        temperature=0.2,
    )

    for _ in range(4):
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=contents,
            config=config,
        )

        function_calls = (
            getattr(response, "function_calls", None)
            or []
        )

        if not function_calls:
            answer = getattr(response, "text", None)

            if not answer or not answer.strip():
                raise AssistantUnavailable(
                    "The AI service returned an empty response."
                )

            return answer.strip()

        if not response.candidates:
            raise AssistantUnavailable(
                "The AI service returned no candidates."
            )

        model_content = response.candidates[0].content

        if model_content is not None:
            contents.append(model_content)

        function_response_parts = []

        for function_call in function_calls:
            function_name = getattr(
                function_call,
                "name",
                "",
            )

            function_arguments = getattr(
                function_call,
                "args",
                {},
            ) or {}

            result = await execute_assistant_tool(
                function_name,
                dict(function_arguments),
                user_id=user_id,
                db=db,
            )

            response_kwargs: dict[str, Any] = {
                "name": function_name,
                "response": {
                    "result": result,
                },
            }

            function_call_id = getattr(
                function_call,
                "id",
                None,
            )

            if function_call_id:
                response_kwargs["id"] = function_call_id

            function_response_parts.append(
                types.Part.from_function_response(
                    **response_kwargs
                )
            )

        contents.append(
            types.Content(
                role="user",
                parts=function_response_parts,
            )
        )

    raise AssistantUnavailable(
        "The assistant used too many tool calls."
    )


async def _get_fallback_news(
    request: AssistantChatRequest,
) -> list[dict[str, Any]]:
    if not _needs_news(request.message):
        return []

    query = _news_query(
        request.message,
        request.context or {},
    )

    result = await execute_assistant_tool(
        "get_company_news",
        {
            "company_name": query,
        },
    )

    if isinstance(result, list):
        return [
            article
            for article in result[:6]
            if isinstance(article, dict)
        ]

    return []


def _build_fallback_answer(
    request: AssistantChatRequest,
    related_news: list[dict[str, Any]],
) -> str:
    context = request.context or {}
    company_name, ticker = _get_company_details(context)

    if _is_summary_question(request.message):
        lines = [
            "Here is a summary of the data currently shown:"
        ]

        if company_name or ticker:
            company_label = company_name or "Company"

            if ticker:
                company_label += f" ({ticker})"

            lines.append(
                f"- Company: {company_label}"
            )

        company = context.get("company")

        if isinstance(company, dict):
            fields = [
                ("Exchange", "exchange"),
                ("Price", "price"),
                ("Market Cap", "marketCap"),
                ("Revenue", "revenue"),
                ("P/E Ratio", "peRatio"),
                ("EPS", "eps"),
                ("Profit Margin", "profitMargin"),
                ("Debt", "debt"),
                ("Cash Flow", "cashFlow"),
            ]

            for label, key in fields:
                value = company.get(key)

                if value is not None:
                    lines.append(
                        f"- {label}: "
                        f"{_format_value(value)}"
                    )

        calculated_pe = context.get(
            "calculatedPeRatio"
        )

        if calculated_pe is not None:
            lines.append(
                "- Calculated P/E Ratio: "
                f"{_format_value(calculated_pe)}"
            )

        signal = context.get("signal")

        if isinstance(signal, dict):
            signal_value = (
                signal.get("label")
                or signal.get("action")
                or signal.get("signal")
            )

            if signal_value:
                lines.append(
                    f"- Stock signal: {signal_value}"
                )

        return "\n".join(lines)

    if related_news:
        lines = [
            "I could not reach the AI service, "
            "but here are related recent headlines:"
        ]

        for article in related_news:
            title = article.get("title")

            if title:
                lines.append(f"- {title}")

        return "\n".join(lines)

    return (
        "The assistant is temporarily unavailable. "
        "Please try again in a moment."
    )


async def generate_assistant_answer(
    request: AssistantChatRequest,
    user_id: int | None = None,
    db: AsyncSession | None = None,
) -> str:
    try:
        return await _run_gemini_with_tools(
            request,
            user_id=user_id,
            db=db,
        )

    except Exception as error:
        logger.exception(
            "Gemini assistant request failed: %s",
            error,
        )

        if _is_gemini_quota_error(error):
            try:
                return await generate_openai_fallback_answer(
                    request,
                    user_id=user_id,
                    db=db,
                )

            except Exception as fallback_error:
                logger.exception(
                    "OpenAI fallback request failed: %s",
                    fallback_error,
                )

        related_news = await _get_fallback_news(
            request
        )

        return _build_fallback_answer(
            request,
            related_news,
        )