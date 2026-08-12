import json
import os
from typing import Any

from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=GEMINI_API_KEY)


async def generate_investment_recommendation(
    company_data: dict[str, Any],
) -> dict[str, Any]:
    prompt = f"""
You are an equity research assistant.

Analyze the following public company data and return a concise investment
assessment.

Company data:
{json.dumps(company_data, indent=2)}

Return ONLY valid JSON in this exact format:

{{
  "recommendation": "Strong Buy | Buy | Hold | Sell | Strong Sell",
  "confidence": 0,
  "reasoning": "Brief explanation"
}}

Rules:
- confidence must be an integer from 0 to 100
- reasoning should be 2-4 sentences
- base the analysis only on the supplied data
- do not invent missing financial information
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if not response.text:
            raise RuntimeError("Gemini returned an empty response")

        text = response.text.strip()

        if text.startswith("```"):
            text = (
                text.replace("```json", "")
                .replace("```", "")
                .strip()
            )

        result = json.loads(text)

        return {
            "recommendation": result.get(
                "recommendation",
                "Unavailable",
            ),
            "confidence": result.get("confidence", 0),
            "reasoning": result.get(
                "reasoning",
                "AI analysis is currently unavailable.",
            ),
        }

    except Exception as error:
        print(f"Gemini recommendation failed: {error}")

        return {
            "recommendation": "Unavailable",
            "confidence": 0,
            "reasoning": (
                "AI analysis is temporarily unavailable. "
                "Please try again later."
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

Analyze the following company news articles.

News:
{json.dumps(news_items, indent=2)}

Return ONLY valid JSON in this exact format:

{{
  "positive": 0,
  "neutral": 0,
  "negative": 0,
  "overall": "Positive | Neutral | Negative"
}}

Rules:
- positive, neutral, and negative must be integers
- the three percentages must add up to exactly 100
- overall must reflect the dominant sentiment
- analyze only the supplied news
- do not invent information
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if not response.text:
            raise RuntimeError("Gemini returned an empty response")

        text = response.text.strip()

        if text.startswith("```"):
            text = (
                text.replace("```json", "")
                .replace("```", "")
                .strip()
            )

        result = json.loads(text)

        positive = int(result.get("positive", 0))
        neutral = int(result.get("neutral", 0))
        negative = int(result.get("negative", 0))

        total = positive + neutral + negative

        if total > 0 and total != 100:
            positive = round((positive / total) * 100)
            neutral = round((neutral / total) * 100)
            negative = 100 - positive - neutral

        return {
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
            "overall": result.get("overall", "Neutral"),
        }

    except Exception as error:
        print(f"Gemini sentiment analysis failed: {error}")

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

Filing type:
{filing_type}

Filing text:
{filing_text}

Return ONLY valid JSON in this exact format:

{{
  "summary": "Concise summary",
  "keyPoints": [
    "Important point 1",
    "Important point 2",
    "Important point 3"
  ],
  "risks": [
    "Relevant risk 1",
    "Relevant risk 2"
  ]
}}

Rules:
- base the analysis only on the provided filing
- do not invent information
- focus on financial performance, business changes, risks, and investor-relevant information
- summary should be 3-5 sentences
- keep key points concise
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if not response.text:
            raise RuntimeError("Gemini returned an empty response")

        text = response.text.strip()

        if text.startswith("```"):
            text = (
                text.replace("```json", "")
                .replace("```", "")
                .strip()
            )

        result = json.loads(text)

        return {
            "summary": result.get(
                "summary",
                "Summary unavailable.",
            ),
            "keyPoints": result.get("keyPoints", []),
            "risks": result.get("risks", []),
        }

    except Exception as error:
        print(f"Gemini SEC summary failed: {error}")

        return {
            "summary": "SEC filing summary is temporarily unavailable.",
            "keyPoints": [],
            "risks": [],
        }