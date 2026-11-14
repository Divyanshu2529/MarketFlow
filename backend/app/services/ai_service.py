from __future__ import annotations

import json
import os
from typing import Any

from dotenv import load_dotenv
from google import genai
from openai import AsyncOpenAI


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash",
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = (
    os.getenv("OPENAI_FALLBACK_MODEL")
    or os.getenv("OPENAI_MODEL")
    or "gpt-5-mini"
)

gemini_client = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)

openai_client = (
    AsyncOpenAI(api_key=OPENAI_API_KEY)
    if OPENAI_API_KEY
    else None
)


ALLOWED_RECOMMENDATIONS = {
    "Strong Buy",
    "Buy",
    "Hold",
    "Sell",
    "Strong Sell",
    "Unavailable",
}

ALLOWED_SENTIMENTS = {
    "Positive",
    "Neutral",
    "Negative",
}


def _serialize(value: Any) -> str:
    return json.dumps(
        value,
        indent=2,
        ensure_ascii=False,
        default=str,
    )


def _clean_json(text: str) -> str:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()

        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        cleaned = "\n".join(lines).strip()

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")

    if first_brace >= 0 and last_brace >= 0:
        cleaned = cleaned[first_brace:last_brace + 1]

    return cleaned


def _parse_json_object(text: str) -> dict[str, Any]:
    parsed = json.loads(_clean_json(text))

    if not isinstance(parsed, dict):
        raise ValueError("AI response must be a JSON object.")

    return parsed


def _safe_text(
    value: Any,
    fallback: str,
) -> str:
    if value is None:
        return fallback

    text = str(value).strip()

    return text or fallback


def _safe_int(
    value: Any,
    fallback: int = 0,
) -> int:
    try:
        if isinstance(value, str):
            value = value.strip().replace("%", "")

        return int(float(value))
    except (TypeError, ValueError):
        return fallback


def _safe_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    return [
        str(item).strip()
        for item in value
        if item is not None and str(item).strip()
    ]


async def _generate_with_gemini(
    prompt: str,
) -> dict[str, Any]:
    if gemini_client is None:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    response = await gemini_client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return _parse_json_object(response.text)


async def _generate_with_openai(
    prompt: str,
) -> dict[str, Any]:
    if openai_client is None:
        raise RuntimeError(
            "OPENAI_API_KEY is not configured."
        )

    response = await openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Return only valid JSON. "
                    "Do not use Markdown or code fences."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    if not response.choices:
        raise RuntimeError(
            "OpenAI returned no response choices."
        )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError(
            "OpenAI returned an empty response."
        )

    return _parse_json_object(content)


async def _generate_ai_json(
    prompt: str,
) -> dict[str, Any]:
    try:
        result = await _generate_with_gemini(prompt)
        print("Gemini AI request succeeded.")
        return result

    except Exception as gemini_error:
        print(
            f"Gemini failed: {gemini_error}. "
            "Switching to OpenAI fallback."
        )

        try:
            result = await _generate_with_openai(prompt)
            print("OpenAI fallback succeeded.")
            return result

        except Exception as openai_error:
            print(
                f"OpenAI fallback failed: "
                f"{openai_error}"
            )

            raise RuntimeError(
                "Both Gemini and OpenAI failed."
            ) from openai_error


async def generate_investment_recommendation(
    company_data: dict[str, Any],
) -> dict[str, Any]:
    prompt = f"""
You are an equity research assistant.

Analyze the supplied data below.

The structure and available fields may differ between companies.
Adapt your analysis to whatever information is actually present.

SUPPLIED DATA:
{_serialize(company_data)}

Return only valid JSON in this exact format:

{{
  "recommendation": "Strong Buy | Buy | Hold | Sell | Strong Sell | Unavailable",
  "confidence": 0,
  "reasoning": "Brief explanation based only on the supplied data."
}}

Strict rules:

- Treat SUPPLIED DATA as the complete source of truth.
- Use only facts, numbers, trends, and events explicitly present
  in SUPPLIED DATA.
- Every factual statement must be traceable to a supplied field or value.
- Never use outside knowledge or assumptions.
- Do not invent missing financial information.
- Do not force a category of analysis that is not supported by the data.
- If there is not enough information for a reliable rating, use
  "Unavailable" and explain that the information was not provided.
- Confidence must reflect the quality and completeness of the data,
  not certainty about future returns.
- Do not guarantee investment returns.
- Reasoning must contain 2-4 sentences.
- Return JSON only.
"""

    try:
        result = await _generate_ai_json(prompt)

        recommendation = _safe_text(
            result.get("recommendation"),
            "Unavailable",
        )

        recommendation_lookup = {
            item.lower(): item
            for item in ALLOWED_RECOMMENDATIONS
        }

        recommendation = recommendation_lookup.get(
            recommendation.lower(),
            "Unavailable",
        )

        confidence = max(
            0,
            min(
                100,
                _safe_int(result.get("confidence")),
            ),
        )

        reasoning = _safe_text(
            result.get("reasoning"),
            "AI analysis is unavailable.",
        )

        return {
            "recommendation": recommendation,
            "confidence": confidence,
            "reasoning": reasoning,
        }

    except Exception as error:
        print(
            f"Investment recommendation failed: "
            f"{error}"
        )

        return {
            "recommendation": "Unavailable",
            "confidence": 0,
            "reasoning": (
                "Both AI providers are temporarily "
                "unavailable. Please try again later."
            ),
        }


async def generate_news_sentiment(
    news_items: list[dict[str, Any]],
) -> dict[str, Any]:
    if not news_items:
        return {
            "positive": 0,
            "neutral": 100,
            "negative": 0,
            "overall": "Neutral",
        }

    prompt = f"""
You are a financial news sentiment analyst.

Analyze only the news articles supplied below.

The number, subject, and type of articles may differ.
Adapt the sentiment analysis to the available articles.

SUPPLIED NEWS:
{_serialize(news_items)}

Return only valid JSON in this exact format:

{{
  "positive": 0,
  "neutral": 0,
  "negative": 0,
  "overall": "Positive | Neutral | Negative"
}}

Strict rules:

- Use only the supplied news articles.
- Do not use outside knowledge.
- Do not invent events, causes, or facts.
- Positive, neutral, and negative must be integers.
- The three percentages must add up to exactly 100.
- Overall must reflect the sentiment of the supplied articles.
- If the articles do not provide enough evidence, use Neutral.
- Return JSON only.
"""

    try:
        result = await _generate_ai_json(prompt)

        positive = max(
            0,
            _safe_int(result.get("positive")),
        )

        neutral = max(
            0,
            _safe_int(result.get("neutral")),
        )

        negative = max(
            0,
            _safe_int(result.get("negative")),
        )

        total = positive + neutral + negative

        if total == 0:
            positive = 0
            neutral = 100
            negative = 0

        elif total != 100:
            positive = round(
                positive / total * 100
            )

            neutral = round(
                neutral / total * 100
            )

            negative = 100 - positive - neutral

        overall = _safe_text(
            result.get("overall"),
            "Neutral",
        )

        if overall not in ALLOWED_SENTIMENTS:
            overall = "Neutral"

        return {
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
            "overall": overall,
        }

    except Exception as error:
        print(
            f"News sentiment failed: "
            f"{error}"
        )

        return {
            "positive": 0,
            "neutral": 100,
            "negative": 0,
            "overall": "Unavailable",
        }


async def generate_sec_filing_summary(
    filing_type: str,
    filing_text: str,
) -> dict[str, Any]:
    prompt = f"""
You are an equity research assistant analyzing an SEC filing.

FILING TYPE:
{filing_type}

FILING CONTENT:
{filing_text}

The content and relevant topics may differ between filings.
Identify only the most important information actually present.
Do not force predefined categories.

Return only valid JSON in this exact format:

{{
  "summary": "Concise summary",
  "keyPoints": [
    "Important point supported by the filing"
  ],
  "risks": [
    "Risk supported by the filing"
  ]
}}

Strict rules:

- Treat the supplied filing content as the complete source of truth.
- Use only facts explicitly stated in the filing.
- Never use outside knowledge or assumptions.
- Do not invent financial results, events, risks, or business changes.
- Include only key points supported by the filing.
- Include risks only when the filing provides evidence for them.
- Do not force a key point or risk if the information is not present.
- If information is missing, say that it was not provided.
- Keep the summary to 3-5 sentences when enough information is available.
- Return JSON only.
"""

    try:
        result = await _generate_ai_json(prompt)

        return {
            "summary": _safe_text(
                result.get("summary"),
                "Summary unavailable.",
            ),
            "keyPoints": _safe_string_list(
                result.get("keyPoints")
            ),
            "risks": _safe_string_list(
                result.get("risks")
            ),
        }

    except Exception as error:
        print(
            f"SEC filing summary failed: "
            f"{error}"
        )

        return {
            "summary": (
                "Both AI providers are temporarily "
                "unavailable."
            ),
            "keyPoints": [],
            "risks": [],
        }