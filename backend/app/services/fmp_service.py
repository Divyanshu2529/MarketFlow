import os
import httpx
from dotenv import load_dotenv

load_dotenv()

FMP_API_KEY = os.getenv("FMP_API_KEY")
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