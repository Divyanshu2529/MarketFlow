import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

FMP_API_KEY = os.getenv("FMP_API_KEY")
FMP_BASE_URL = "https://financialmodelingprep.com/stable"

if not FMP_API_KEY:
    raise RuntimeError("FMP_API_KEY is missing from .env")


class FMPClient:
    def __init__(self) -> None:
        self.base_url = FMP_BASE_URL
        self.api_key = FMP_API_KEY
        self.timeout = httpx.Timeout(15.0)

    async def get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        request_params = {
            **(params or {}),
            "apikey": self.api_key,
        }

        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
        ) as client:
            response = await client.get(
                endpoint,
                params=request_params,
            )

            response.raise_for_status()
            return response.json()


fmp_client = FMPClient()