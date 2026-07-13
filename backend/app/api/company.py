from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/company", tags=["Company"])

MOCK_COMPANIES = {
    "AAPL": {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "market_cap": "$3.1T",
        "revenue": "$383.3B",
        "pe_ratio": 31.4,
        "eps": 6.13,
        "profit_margin": "26.3%",
        "debt": "$108.0B",
        "cash_flow": "$110.5B",
    },
    "NVDA": {
        "ticker": "NVDA",
        "name": "NVIDIA Corporation",
        "exchange": "NASDAQ",
        "market_cap": "$2.34T",
        "revenue": "$60.9B",
        "pe_ratio": 78.6,
        "eps": 12.08,
        "profit_margin": "48.8%",
        "debt": "$9.7B",
        "cash_flow": "$28.1B",
    },
}


@router.get("/search")
def search_company(q: str):
    query = q.lower()

    results = [
        company
        for company in MOCK_COMPANIES.values()
        if query in company["ticker"].lower() or query in company["name"].lower()
    ]

    return {"results": results}


@router.get("/{ticker}")
def get_company(ticker: str):
    ticker = ticker.upper()

    if ticker not in MOCK_COMPANIES:
        raise HTTPException(status_code=404, detail="Company not found")

    return MOCK_COMPANIES[ticker]