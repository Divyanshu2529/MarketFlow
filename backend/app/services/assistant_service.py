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

from app.schemas.assistant import AssistantChatRequest
from app.services.assistant_tools import (
    ASSISTANT_TOOLS,
    execute_assistant_tool,
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


def _shorten_text(
    value: Any,
    max_chars: int = 350,
) -> str:
    text = " ".join(str(value or "").split())

    if len(text) > max_chars:
        return text[:max_chars].rstrip() + "..."

    return text


def _extract_records(
    value: Any,
    possible_keys: tuple[str, ...],
) -> list[Any]:
    if isinstance(value, list):
        return value

    if isinstance(value, dict):
        for key in possible_keys:
            records = value.get(key)

            if isinstance(records, list):
                return records

        return [value]

    return []


def _compact_news(
    value: Any,
) -> list[dict[str, Any]]:
    records = _extract_records(
        value,
        (
            "articles",
            "news",
            "results",
        ),
    )

    compact_articles = []

    for record in records[:5]:
        if not isinstance(record, dict):
            continue

        source = record.get("publisher") or record.get(
            "source"
        )

        if isinstance(source, dict):
            source = source.get("name")

        article: dict[str, Any] = {}

        title = record.get("title")

        if title:
            article["title"] = _shorten_text(
                title,
                220,
            )

        if source:
            article["publisher"] = str(source)

        published_date = (
            record.get("publishedDate")
            or record.get("publishedAt")
            or record.get("date")
        )

        if published_date:
            article["publishedDate"] = str(
                published_date
            )[:30]

        summary = (
            record.get("summary")
            or record.get("description")
            or record.get("content")
        )

        if summary:
            article["summary"] = _shorten_text(
                summary,
                350,
            )

        url = record.get("url") or record.get("link")

        if url:
            article["url"] = str(url)

        if article:
            compact_articles.append(article)

    return compact_articles


def _compact_filings(
    value: Any,
) -> list[dict[str, Any]]:
    records = _extract_records(
        value,
        (
            "filings",
            "results",
            "data",
        ),
    )

    compact_filings = []

    for record in records[:5]:
        if not isinstance(record, dict):
            continue

        filing: dict[str, Any] = {}

        form = (
            record.get("form")
            or record.get("formType")
            or record.get("filingType")
            or record.get("type")
        )

        if form:
            filing["form"] = str(form)

        filing_date = (
            record.get("filingDate")
            or record.get("filedDate")
            or record.get("date")
        )

        if filing_date:
            filing["filingDate"] = str(
                filing_date
            )[:30]

        summary = (
            record.get("summary")
            or record.get("description")
            or record.get("title")
        )

        if summary:
            filing["summary"] = _shorten_text(
                summary,
                400,
            )

        link = (
            record.get("link")
            or record.get("url")
            or record.get("filingUrl")
            or record.get("finalLink")
        )

        if link:
            filing["link"] = str(link)

        if filing:
            compact_filings.append(filing)

    return compact_filings


def _compact_tool_result(
    tool_name: str,
    result: Any,
) -> Any:
    if tool_name == "get_company_news":
        return {
            "articles": _compact_news(result)
        }

    if tool_name == "get_company_filings":
        return {
            "filings": _compact_filings(result)
        }

    if tool_name == "get_company_overview":
        if not isinstance(result, dict):
            return result

        compact_result = dict(result)

        if "news" in compact_result:
            compact_result["news"] = _compact_news(
                compact_result["news"]
            )

        if isinstance(
            compact_result.get("history"),
            list,
        ):
            compact_result["history"] = (
                compact_result["history"][-5:]
            )

        return compact_result

    if tool_name == "get_company_competitors":
        if isinstance(result, list):
            return result[:8]

        return result

    if tool_name == "get_stock_analysis":
        if not isinstance(result, dict):
            return result

        compact_result = dict(result)

        for key in (
            "priceHistory",
            "price_history",
            "history",
        ):
            history = compact_result.get(key)

            if isinstance(history, list):
                compact_result[key] = history[-30:]
                break

        return compact_result

    return result


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

7. You may answer general educational finance questions using your
   general knowledge.

8. Never invent prices, financial metrics, news, release dates,
   or company facts.

9. If a tool returns an error, explain that the requested live data
   could not be retrieved instead of making up an answer.

10. Do not provide guaranteed investment advice. Explain risks and
    encourage independent research.

Formatting rules:

11. Never display raw JSON, Python dictionaries, or API objects.

12. Never show a naked URL. Always use a Markdown link, such as:
    [View filing](https://example.com).

13. For SEC filings, show no more than five filings. Format each one
    like this:

    ### Form 8-K — Filed July 30, 2026
    One short sentence explaining what the filing contains.
    [View filing](URL)

14. For news, show only the title, publisher, date, and a short
    explanation. Do not copy the full article.

15. For financial metrics, use a compact table or short bullet list.
    Format currency, percentages, and ratios clearly.

16. Keep normal responses under 250 words unless the user asks
    for a detailed explanation.

17. Use simple headings and compact bullet points. Do not create
    deeply nested lists or empty bullet points.

18. Do not repeat the same information multiple times.

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

            raw_result = await execute_assistant_tool(
                function_name,
                dict(function_arguments),
            )

            compact_result = _compact_tool_result(
                function_name,
                raw_result,
            )

            response_kwargs: dict[str, Any] = {
                "name": function_name,
                "response": {
                    "result": compact_result,
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
            for article in result[:5]
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
            "### Screen Summary",
        ]

        if company_name or ticker:
            company_label = company_name or "Company"

            if ticker:
                company_label += f" ({ticker})"

            lines.append(
                f"- **Company:** {company_label}"
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
                        f"- **{label}:** "
                        f"{_format_value(value)}"
                    )

        calculated_pe = context.get(
            "calculatedPeRatio"
        )

        if calculated_pe is not None:
            lines.append(
                "- **Calculated P/E Ratio:** "
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
                    f"- **Stock Signal:** {signal_value}"
                )

        return "\n".join(lines)

    if related_news:
        lines = [
            "### Recent Related News",
        ]

        for article in related_news:
            title = article.get("title")

            if title:
                lines.append(
                    f"- **{title}**"
                )

        return "\n".join(lines)

    return (
        "The assistant is temporarily unavailable. "
        "Please try again in a moment."
    )


async def generate_assistant_answer(
    request: AssistantChatRequest,
) -> str:
    try:
        return await _run_gemini_with_tools(request)

    except Exception as error:
        logger.exception(
            "Assistant request failed: %s",
            error,
        )

        related_news = await _get_fallback_news(
            request
        )

        return _build_fallback_answer(
            request,
            related_news,
        )