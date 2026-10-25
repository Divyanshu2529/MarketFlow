from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from app.schemas.assistant import AssistantChatRequest


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

    news_keywords = (
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
        for keyword in news_keywords
    )


async def _get_related_news(
    message: str,
    context: dict[str, Any],
) -> list[dict[str, Any]]:
    if not _needs_news(message):
        return []

    company_name, ticker = _get_company_details(context)
    message_lower = message.lower()

    if "iphone" in message_lower:
        search_query = (
            f"{company_name or 'Apple'} iPhone"
        )
    elif company_name:
        search_query = company_name
    elif ticker:
        search_query = ticker
    else:
        search_query = message

    try:
        from app.services.news_service import (
            get_company_news,
        )

        articles = await get_company_news(
            search_query[:200]
        )

        return [
            article
            for article in articles[:6]
            if isinstance(article, dict)
        ]

    except Exception:
        logger.exception(
            "Unable to load news for assistant"
        )
        return []


def _is_summary_question(message: str) -> bool:
    message_lower = message.lower()

    summary_phrases = (
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
        for phrase in summary_phrases
    )


def _format_fallback_value(value: Any) -> str:
    if value is None:
        return "N/A"

    if isinstance(value, float):
        return f"{value:.2f}"

    if isinstance(value, dict):
        return _safe_json(value, 500)

    if isinstance(value, list):
        return _safe_json(value, 500)

    return str(value)


def _build_fallback_answer(
    request: AssistantChatRequest,
    context: dict[str, Any],
    related_news: list[dict[str, Any]],
) -> str:
    company_name, ticker = _get_company_details(context)

    if _is_summary_question(request.message):
        lines = [
            "Here is a summary of the data currently shown:"
        ]

        if company_name or ticker:
            company_label = company_name or "Company"

            if ticker:
                company_label += f" ({ticker})"

            lines.append(f"- Company: {company_label}")

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
                        f"{_format_fallback_value(value)}"
                    )

        calculated_pe = context.get(
            "calculatedPeRatio"
        )

        if calculated_pe is not None:
            lines.append(
                "- Calculated P/E Ratio: "
                f"{_format_fallback_value(calculated_pe)}"
            )

        history = context.get("incomeHistory")

        if isinstance(history, list) and history:
            history_items = []

            for item in history[-5:]:
                if not isinstance(item, dict):
                    continue

                year = item.get("year", "Year")
                revenue = item.get("revenue")

                if revenue is not None:
                    history_items.append(
                        f"{year}: {revenue}"
                    )

            if history_items:
                lines.append(
                    "- Revenue history: "
                    + ", ".join(history_items)
                )

        signal = context.get("signal")

        if isinstance(signal, dict):
            signal_label = (
                signal.get("label")
                or signal.get("action")
                or signal.get("signal")
            )

            if signal_label:
                lines.append(
                    f"- Stock signal: {signal_label}"
                )

        if len(lines) == 1:
            lines.append(
                "- Detailed page data was not available "
                "in the assistant context."
            )

        return "\n".join(lines)

    if related_news:
        lines = [
            "I could not reach the AI service, "
            "but I found these recent related headlines:"
        ]

        for article in related_news:
            title = article.get("title")

            if not title:
                continue

            publisher = article.get("publisher")
            published_date = article.get(
                "publishedDate"
            )

            details = []

            if publisher:
                details.append(str(publisher))

            if published_date:
                details.append(str(published_date)[:10])

            suffix = (
                f" ({', '.join(details)})"
                if details
                else ""
            )

            lines.append(f"- {title}{suffix}")

        return "\n".join(lines)

    return (
        "I could not connect to the AI service right now. "
        "Please try again in a moment."
    )


def _build_prompt(
    request: AssistantChatRequest,
    related_news: list[dict[str, Any]],
) -> str:
    context_json = _safe_json(request.context)

    news_json = (
        _safe_json(related_news, max_chars=9000)
        if related_news
        else "No related live news was retrieved."
    )

    history_text = "\n".join(
        f"{message.role}: {message.content}"
        for message in request.history[-10:]
    )

    return f"""
You are the MarketFlow AI Assistant.

MarketFlow is an equity research platform that helps users
understand company financials, stock analysis, market news,
comparisons, watchlists, and reports.

Answer the user's question directly and clearly.

Important rules:

1. If the question asks about the current page or screen,
   summarize the supplied page context.

2. You may answer general educational questions about finance,
   companies, stocks, products, and markets using your general
   knowledge.

3. For current news, product releases, announcements, or recent
   updates, use the related news data when available.

4. Never invent financial values, news headlines, prices,
   release dates, or company facts.

5. If live information is unavailable, clearly say that the
   live information could not be verified, but still provide
   useful general context instead of only saying that the data
   is unavailable.

6. Do not provide guaranteed investment advice. Explain that
   buy, sell, or hold decisions require independent research.

7. Keep the answer concise but complete. Use bullet points when
   they make the explanation easier to read.

Current page context:
{context_json}

Related live news:
{news_json}

Previous conversation:
{history_text or "No previous conversation."}

User question:
{request.message}
""".strip()


async def _generate_with_gemini(
    prompt: str,
) -> str:
    if not GEMINI_API_KEY:
        raise AssistantUnavailable(
            "GEMINI_API_KEY is not configured."
        )

    try:
        from google import genai

        client = genai.Client(
            api_key=GEMINI_API_KEY
        )

        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=prompt,
        )

        answer = getattr(response, "text", None)

        if not answer or not answer.strip():
            raise AssistantUnavailable(
                "The AI service returned an empty response."
            )

        return answer.strip()

    except AssistantUnavailable:
        raise

    except Exception as error:
        logger.exception(
            "Gemini assistant request failed: %s",
            error,
        )

        raise AssistantUnavailable(
            "The AI service is temporarily unavailable."
        ) from error


async def generate_assistant_answer(
    request: AssistantChatRequest,
) -> str:
    context = request.context or {}

    related_news = await _get_related_news(
        request.message,
        context,
    )

    prompt = _build_prompt(
        request,
        related_news,
    )

    try:
        return await _generate_with_gemini(prompt)

    except AssistantUnavailable:
        logger.warning(
            "Using fallback assistant response."
        )

        return _build_fallback_answer(
            request,
            context,
            related_news,
        )