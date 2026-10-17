from __future__ import annotations

import asyncio
import math
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path, override=True)

FMP_API_KEY = os.getenv("FMP_API_KEY")
FMP_BASE_URL = "https://financialmodelingprep.com/stable"


class StockDataUnavailable(Exception):
    pass


def _to_float(value: Any) -> float | None:
    try:
        if value is None:
            return None

        return float(value)
    except (TypeError, ValueError):
        return None


def _rolling_average(
    values: list[float],
    index: int,
    period: int,
) -> float | None:
    if index + 1 < period:
        return None

    window = values[index - period + 1 : index + 1]

    if not window:
        return None

    return round(sum(window) / len(window), 2)


def _calculate_rsi(
    values: list[float],
    index: int,
    period: int = 14,
) -> float | None:
    if index < period:
        return None

    changes = [
        values[position] - values[position - 1]
        for position in range(
            index - period + 1,
            index + 1,
        )
    ]

    gains = [
        change
        for change in changes
        if change > 0
    ]

    losses = [
        abs(change)
        for change in changes
        if change < 0
    ]

    average_gain = sum(gains) / period
    average_loss = sum(losses) / period

    if average_loss == 0:
        return 100.0

    relative_strength = average_gain / average_loss
    rsi = 100 - (100 / (1 + relative_strength))

    return round(rsi, 2)


def _calculate_volatility(values: list[float]) -> float | None:
    if len(values) < 2:
        return None

    daily_returns: list[float] = []

    for index in range(1, len(values)):
        previous = values[index - 1]
        current = values[index]

        if previous == 0:
            continue

        daily_returns.append((current - previous) / previous)

    if len(daily_returns) < 2:
        return None

    average_return = sum(daily_returns) / len(daily_returns)

    variance = sum(
        (value - average_return) ** 2
        for value in daily_returns
    ) / (len(daily_returns) - 1)

    annualized_volatility = math.sqrt(variance) * math.sqrt(252)

    return round(annualized_volatility * 100, 2)


async def _fetch_market_data(
    client: httpx.AsyncClient,
    endpoint: str,
    params: dict[str, Any],
) -> Any:
    if not FMP_API_KEY:
        raise StockDataUnavailable(
            "FMP_API_KEY is not configured."
        )

    request_params = {
        **params,
        "apikey": FMP_API_KEY,
    }

    try:
        response = await client.get(
            f"{FMP_BASE_URL}/{endpoint}",
            params=request_params,
        )

        response.raise_for_status()
        return response.json()

    except httpx.HTTPStatusError as error:
        raise StockDataUnavailable(
            "The market data provider could not return "
            "data for this stock."
        ) from error

    except (httpx.RequestError, ValueError) as error:
        raise StockDataUnavailable(
            "Unable to connect to the market data provider."
        ) from error


def _normalize_history(
    history_data: Any,
) -> list[dict[str, Any]]:
    if isinstance(history_data, dict):
        history_data = history_data.get(
            "historical",
            [],
        )

    if not isinstance(history_data, list):
        return []

    normalized: list[dict[str, Any]] = []

    for item in history_data:
        if not isinstance(item, dict):
            continue

        close = _to_float(
            item.get("adjClose")
            or item.get("close")
        )

        if close is None:
            continue

        normalized.append(
            {
                "date": item.get("date"),
                "close": round(close, 2),
                "volume": int(
                    _to_float(item.get("volume")) or 0
                ),
            }
        )

    normalized.sort(
        key=lambda item: item["date"] or ""
    )

    return normalized[-260:]


def _build_signal(
    *,
    current_price: float,
    sma20: float | None,
    sma50: float | None,
    rsi: float | None,
    momentum: float | None,
    volatility: float | None,
) -> dict[str, Any]:
    score = 0
    reasons: list[str] = []

    if sma20 is not None:
        if current_price > sma20:
            score += 1
            reasons.append(
                "Price is above the 20-day moving average."
            )
        else:
            score -= 1
            reasons.append(
                "Price is below the 20-day moving average."
            )

    if sma20 is not None and sma50 is not None:
        if sma20 > sma50:
            score += 1
            reasons.append(
                "Short-term trend is above the 50-day trend."
            )
        else:
            score -= 1
            reasons.append(
                "Short-term trend is below the 50-day trend."
            )

    if rsi is not None:
        if 45 <= rsi <= 65:
            score += 1
            reasons.append(
                "RSI is in a balanced momentum range."
            )
        elif rsi < 30:
            score += 1
            reasons.append(
                "RSI suggests the stock may be oversold."
            )
        elif rsi > 70:
            score -= 1
            reasons.append(
                "RSI suggests the stock may be overextended."
            )

    if momentum is not None:
        if momentum > 0:
            score += 1
            reasons.append(
                "Recent price momentum is positive."
            )
        else:
            score -= 1
            reasons.append(
                "Recent price momentum is negative."
            )

    if score >= 2:
        rating = "BUY"
    elif score <= -2:
        rating = "AVOID"
    else:
        rating = "HOLD"

    if volatility is None:
        risk_level = "Unknown"
    elif volatility < 25:
        risk_level = "Low"
    elif volatility < 45:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    reference_price = sma20 or current_price

    entry_range = {
        "lower": round(reference_price * 0.97, 2),
        "upper": round(reference_price * 1.01, 2),
    }

    if rsi is not None and rsi > 70:
        entry_signal = (
            "Momentum looks extended. Watch for a pullback "
            "before considering an entry."
        )
    elif sma50 is not None and current_price < sma50:
        entry_signal = (
            "Price is below the 50-day trend. Consider waiting "
            "for a stronger recovery signal."
        )
    else:
        entry_signal = (
            "A potential staged-entry zone is near the "
            "20-day moving average."
        )

    if rsi is not None and rsi > 70:
        exit_signal = (
            "Monitor for a momentum reversal because RSI is elevated."
        )
    elif sma50 is not None and current_price < sma50:
        exit_signal = (
            "Review the position if price remains below "
            "the 50-day moving average."
        )
    else:
        exit_signal = (
            "No major technical exit trigger is active."
        )

    return {
        "rating": rating,
        "score": score,
        "riskLevel": risk_level,
        "entryRange": entry_range,
        "entrySignal": entry_signal,
        "exitSignal": exit_signal,
        "reasons": reasons,
        "methodology": (
            "Educational rule-based signal using moving averages, "
            "RSI, momentum, and annualized volatility. "
            "It is not financial advice or a guaranteed forecast."
        ),
    }


async def get_stock_analysis(
    ticker: str,
) -> dict[str, Any]:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        raise StockDataUnavailable(
            "A stock ticker is required."
        )

    start_date = date.today() - timedelta(days=390)

    async with httpx.AsyncClient(timeout=20) as client:
        quote_data, history_data = await asyncio.gather(
            _fetch_market_data(
                client,
                "quote",
                {"symbol": normalized_ticker},
            ),
            _fetch_market_data(
                client,
                "historical-price-eod/full",
                {
                    "symbol": normalized_ticker,
                    "from": start_date.isoformat(),
                },
            ),
        )

    if not isinstance(quote_data, list) or not quote_data:
        raise StockDataUnavailable(
            "No quote data was found for this stock."
        )

    quote = quote_data[0]

    history = _normalize_history(history_data)

    if not history:
        raise StockDataUnavailable(
            "No historical price data was found for this stock."
        )

    close_values = [
        item["close"]
        for item in history
    ]

    chart: list[dict[str, Any]] = []

    for index, item in enumerate(history):
        chart.append(
            {
                **item,
                "sma20": _rolling_average(
                    close_values,
                    index,
                    20,
                ),
                "sma50": _rolling_average(
                    close_values,
                    index,
                    50,
                ),
                "rsi": _calculate_rsi(
                    close_values,
                    index,
                ),
            }
        )

    latest = chart[-1]

    current_price = _to_float(
        quote.get("price")
    ) or latest["close"]

    sma20 = latest.get("sma20")
    sma50 = latest.get("sma50")
    rsi = latest.get("rsi")

    momentum = None

    if len(close_values) >= 21:
        momentum = round(
            (
                close_values[-1]
                - close_values[-21]
            )
            / close_values[-21]
            * 100,
            2,
        )

    volatility = _calculate_volatility(
        close_values
    )

    signal = _build_signal(
        current_price=current_price,
        sma20=sma20,
        sma50=sma50,
        rsi=rsi,
        momentum=momentum,
        volatility=volatility,
    )

    return {
        "ticker": normalized_ticker,
        "quote": {
            "name": quote.get("name"),
            "exchange": quote.get("exchange"),
            "price": current_price,
            "change": _to_float(
                quote.get("change")
            ),
            "changePercentage": _to_float(
                quote.get("changePercentage")
            ),
            "volume": quote.get("volume"),
            "dayLow": _to_float(
                quote.get("dayLow")
            ),
            "dayHigh": _to_float(
                quote.get("dayHigh")
            ),
            "yearLow": _to_float(
                quote.get("yearLow")
            ),
            "yearHigh": _to_float(
                quote.get("yearHigh")
            ),
            "marketCap": quote.get("marketCap"),
            "priceAvg50": _to_float(
                quote.get("priceAvg50")
            ),
            "priceAvg200": _to_float(
                quote.get("priceAvg200")
            ),
        },
        "indicators": {
            "sma20": sma20,
            "sma50": sma50,
            "rsi14": rsi,
            "momentum20d": momentum,
            "annualizedVolatility": volatility,
        },
        "chart": chart,
        "signal": signal,
    }