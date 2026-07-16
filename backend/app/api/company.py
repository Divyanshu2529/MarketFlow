from fastapi import APIRouter, HTTPException
from app.services.news_service import get_company_news

from app.services.fmp_service import (
    search_companies,
    get_company_profile,
    get_company_financials,
    get_income_statement_history,
)

router = APIRouter(prefix="/api/company", tags=["Company"])


@router.get("/search")
async def search_company(q: str):
    results = await search_companies(q)
    return {"results": results}


@router.get("/{ticker}/income-history")
async def get_company_income_history(ticker: str):
    history = await get_income_statement_history(ticker.upper())
    return {"history": history}


@router.get("/{ticker}/news")
async def get_company_news_route(ticker: str):
    company = await get_company_profile(ticker.upper())

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    news = await get_company_news(company.get("companyName", ticker))
    return {"news": news}


@router.get("/{ticker}")
async def get_company(ticker: str):
    ticker = ticker.upper()

    company = await get_company_profile(ticker)
    financials = await get_company_financials(ticker)

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        **company,
        **financials,
    }