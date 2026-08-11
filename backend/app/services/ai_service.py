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

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    text = response.text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    return json.loads(text)