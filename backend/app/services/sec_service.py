import os
from typing import Any

import httpx
import re
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv()

SEC_USER_AGENT = os.getenv("SEC_USER_AGENT")

if not SEC_USER_AGENT:
    raise RuntimeError("SEC_USER_AGENT is missing from .env")

SEC_HEADERS = {
    "User-Agent": SEC_USER_AGENT,
    "Accept-Encoding": "gzip, deflate",
}

SEC_DATA_BASE_URL = "https://data.sec.gov"


async def get_company_cik(ticker: str) -> str | None:
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        return None

    url = "https://www.sec.gov/files/company_tickers.json"

    async with httpx.AsyncClient(
        headers=SEC_HEADERS,
        timeout=15.0,
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

        data = response.json()

    for item in data.values():
        if item.get("ticker", "").upper() == normalized_ticker:
            cik = str(item.get("cik_str", "")).zfill(10)
            return cik

    return None


async def get_recent_filings(
    ticker: str,
) -> list[dict[str, Any]]:
    cik = await get_company_cik(ticker)

    if not cik:
        return []

    url = f"{SEC_DATA_BASE_URL}/submissions/CIK{cik}.json"

    async with httpx.AsyncClient(
        headers=SEC_HEADERS,
        timeout=15.0,
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

        data = response.json()

    recent = data.get("filings", {}).get("recent", {})

    forms = recent.get("form", [])
    filing_dates = recent.get("filingDate", [])
    accession_numbers = recent.get("accessionNumber", [])
    primary_documents = recent.get("primaryDocument", [])

    filings = []
    found_types = set()

    for form, date, accession, document in zip(
        forms,
        filing_dates,
        accession_numbers,
        primary_documents,
    ):
        if form not in {"10-K", "10-Q", "8-K"}:
            continue

        if form in found_types:
            continue

        accession_no_dashes = accession.replace("-", "")

        filing_url = (
            "https://www.sec.gov/Archives/edgar/data/"
            f"{int(cik)}/"
            f"{accession_no_dashes}/"
            f"{document}"
        )

        filings.append(
            {
                "type": form,
                "date": date,
                "accessionNumber": accession,
                "document": document,
                "url": filing_url,
            }
        )

        found_types.add(form)

        if len(found_types) == 3:
            break

    return filings

async def get_filing_text(filing_url: str) -> str:
    async with httpx.AsyncClient(
        headers=SEC_HEADERS,
        timeout=20.0,
    ) as client:
        response = await client.get(filing_url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    text = soup.get_text(
        separator="\n",
        strip=True,
    )

    return clean_filing_text(text)


def clean_filing_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)

    
    text = re.sub(
        r"us-gaap:[A-Za-z0-9]+",
        "",
        text,
    )

    text = re.sub(
        r"\b\d{10}\b",
        "",
        text,
    )

    text = re.sub(r"\s+", " ", text).strip()

    return text[:40000]