from fastapi import APIRouter, HTTPException

from app.services.fmp_service import search_companies, get_company_profile, get_company_financials

router = APIRouter(prefix="/api/company", tags=["Company"])


@router.get("/search")
async def search_company(q: str):
    results = await search_companies(q)
    return {"results": results}


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