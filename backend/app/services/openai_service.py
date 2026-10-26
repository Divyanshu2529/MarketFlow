from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.assistant import AssistantChatRequest
from app.services.assistant_tools import execute_assistant_tool


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path, override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv(
    "OPENAI_FALLBACK_MODEL",
    "gpt-6-luna",
)


class OpenAIUnavailable(Exception):
    pass


OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_companies",
            "description": (
                "Searches for companies by name or ticker symbol."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Company name or ticker symbol."
                        ),
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_overview",
            "description": (
                "Gets financial overview data for a company."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Company ticker symbol.",
                    }
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_analysis",
            "description": (
                "Gets technical stock analysis and signals."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Company ticker symbol.",
                    }
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_news",
            "description": "Gets recent news about a company.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {
                        "type": "string",
                        "description": "Company name or ticker.",
                    }
                },
                "required": ["company_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_recommendation",
            "description": (
                "Gets the available company recommendation."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Company ticker symbol.",
                    }
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_sentiment",
            "description": "Gets company sentiment analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Company ticker symbol.",
                    }
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_filings",
            "description": "Gets SEC filings for a company.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Company ticker symbol.",
                    }
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_competitors",
            "description": (
                "Gets competitor information for a company."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Company ticker symbol.",
                    }
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_companies",
            "description": (
                "Gets overview data for multiple companies."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "tickers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "At least two ticker symbols."
                        ),
                    }
                },
                "required": ["tickers"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_watchlist",
            "description": (
                "Gets the authenticated user's watchlist."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_saved_reports",
            "description": (
                "Gets the authenticated user's saved reports."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_saved_report",
            "description": (
                "Gets the contents of one saved report."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "report_id": {
                        "type": "integer",
                        "description": "Saved report ID.",
                    }
                },
                "required": ["report_id"],
            },
        },
    },
]


def _safe_json(
    value: Any,
    max_chars: int = 12000,
) -> str:
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            default=str,
        )
    except Exception:
        text = str(value)

    return text[:max_chars]


def _build_system_prompt(
    request: AssistantChatRequest,
) -> str:
    context = _safe_json(
        request.context or {},
        max_chars=12000,
    )

    return f"""
You are the MarketFlow AI Assistant.

MarketFlow helps users understand company financials, stock
analysis, news, comparisons, watchlists, SEC filings, and reports.

Answer clearly and directly.

Rules:

- Use tools when live company or user-specific data is needed.
- Use search_companies for company names without ticker symbols.
- Use get_company_overview for financial metrics.
- Use get_stock_analysis for technical analysis and signals.
- Use get_company_news for current news and updates.
- Use compare_companies for company comparisons.
- Use get_my_watchlist for the user's saved companies.
- Use get_my_saved_reports for the user's saved reports.
- Use get_saved_report for analyzing a specific saved report.
- Never invent prices, financial metrics, news, or dates.
- Do not provide guaranteed investment advice.
- Explain risks when discussing BUY, HOLD, or AVOID signals.
- Do not show raw JSON or Python dictionaries.
- Format answers with readable headings, bullets, or tables.
- Keep responses concise but useful.

Current page context:
{context}
""".strip()


def _build_messages(
    request: AssistantChatRequest,
) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": _build_system_prompt(request),
        }
    ]

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
        messages.append(
            {
                "role": message.role,
                "content": message.content,
            }
        )

    messages.append(
        {
            "role": "user",
            "content": request.message,
        }
    )

    return messages


async def generate_openai_fallback_answer(
    request: AssistantChatRequest,
    user_id: int | None = None,
    db: AsyncSession | None = None,
) -> str:
    if not OPENAI_API_KEY:
        raise OpenAIUnavailable(
            "OPENAI_API_KEY is not configured."
        )

    client = AsyncOpenAI(
        api_key=OPENAI_API_KEY,
    )

    messages = _build_messages(request)

    for _ in range(4):
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            tools=OPENAI_TOOLS,
            tool_choice="auto",
            temperature=0.2,
            extra_body={
                "reasoning_effort": "none",
            },
        )

        if not response.choices:
            raise OpenAIUnavailable(
                "OpenAI returned no response choices."
            )

        assistant_message = response.choices[0].message
        tool_calls = assistant_message.tool_calls or []

        if not tool_calls:
            answer = assistant_message.content

            if not answer or not answer.strip():
                raise OpenAIUnavailable(
                    "OpenAI returned an empty response."
                )

            return answer.strip()

        messages.append(
            {
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tool_call.id,
                        "type": "function",
                        "function": {
                            "name": tool_call.function.name,
                            "arguments": (
                                tool_call.function.arguments
                            ),
                        },
                    }
                    for tool_call in tool_calls
                ],
            }
        )

        for tool_call in tool_calls:
            function_name = tool_call.function.name

            try:
                function_arguments = json.loads(
                    tool_call.function.arguments or "{}"
                )
            except json.JSONDecodeError:
                function_arguments = {}

            result = await execute_assistant_tool(
                function_name,
                function_arguments,
                user_id=user_id,
                db=db,
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": _safe_json(result),
                }
            )

    raise OpenAIUnavailable(
        "OpenAI used too many tool calls."
    )