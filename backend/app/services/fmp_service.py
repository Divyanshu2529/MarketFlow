import os
import httpx
from dotenv import load_dotenv

load_dotenv()

FMP_API_KEY = os.getenv("FMP_API_KEY")

if not FMP_API_KEY:
    raise RuntimeError("FMP_API_KEY is missing from .env")

FMP_BASE_URL = "https://financialmodelingprep.com/stable"


async def search_companies(query: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{FMP_BASE_URL}/search-name",
            params={
                "query": query,
                "apikey": FMP_API_KEY,
            },
        )

        response.raise_for_status()
        return response.json()


async def get_company_profile(ticker: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{FMP_BASE_URL}/profile",
            params={
                "symbol": ticker,
                "apikey": FMP_API_KEY,
            },
        )

        response.raise_for_status()
        data = response.json()
        return data[0] if data else None


async def get_company_financials(ticker: str):
    async with httpx.AsyncClient() as client:
        income_response = await client.get(
            f"{FMP_BASE_URL}/income-statement",
            params={
                "symbol": ticker,
                "period": "annual",
                "limit": 1,
                "apikey": FMP_API_KEY,
            },
        )

        balance_response = await client.get(
            f"{FMP_BASE_URL}/balance-sheet-statement",
            params={
                "symbol": ticker,
                "period": "annual",
                "limit": 1,
                "apikey": FMP_API_KEY,
            },
        )

        cashflow_response = await client.get(
            f"{FMP_BASE_URL}/cash-flow-statement",
            params={
                "symbol": ticker,
                "period": "annual",
                "limit": 1,
                "apikey": FMP_API_KEY,
            },
        )

        ratios_response = await client.get(
            f"{FMP_BASE_URL}/ratios",
            params={
                "symbol": ticker,
                "period": "annual",
                "limit": 1,
                "apikey": FMP_API_KEY,
            },
        )

        income_response.raise_for_status()
        balance_response.raise_for_status()
        cashflow_response.raise_for_status()
        ratios_response.raise_for_status()

        income = income_response.json()
        balance = balance_response.json()
        cashflow = cashflow_response.json()
        ratios = ratios_response.json()

        latest_income = income[0] if income else {}
        latest_balance = balance[0] if balance else {}
        latest_cashflow = cashflow[0] if cashflow else {}
        latest_ratios = ratios[0] if ratios else {}

        return {
            "revenue": latest_income.get("revenue"),
            "eps": latest_income.get("eps"),
            "profitMargin": latest_ratios.get("netProfitMargin"),
            "peRatio": latest_ratios.get("priceEarningsRatio"),
            "debt": latest_balance.get("totalDebt"),
            "cashFlow": latest_cashflow.get("freeCashFlow"),
        }