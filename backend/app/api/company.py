from fastapi import APIRouter, HTTPException, Query

from app.services.company_service import (
    get_company_overview,
    get_company_recommendation,
    get_company_sentiment,
    search_companies,
)

router = APIRouter(
    prefix="/api/company",
    tags=["Company"],
)


@router.get("/search")
async def search_company(
    q: str = Query(..., min_length=2),
):
    results = await search_companies(q)

    return {
        "results": results,
    }


@router.get("/{ticker}/overview")
async def get_company_overview_route(ticker: str):
    overview = await get_company_overview(ticker)

    if overview is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    return overview


@router.get("/{ticker}/recommendation")
async def get_company_recommendation_route(ticker: str):
    recommendation = await get_company_recommendation(ticker)

    if recommendation is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    return recommendation


@router.get("/{ticker}/sentiment")
async def get_company_sentiment_route(ticker: str):
    sentiment = await get_company_sentiment(ticker)

    if sentiment is None:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    return sentiment