from fastapi import APIRouter, HTTPException, status

from app.services.stock_analysis_service import (
    StockDataUnavailable,
    get_stock_analysis,
)


router = APIRouter(
    prefix="/api/stocks",
    tags=["Stock Analysis"],
)


@router.get("/{ticker}/analysis")
async def stock_analysis(ticker: str):
    try:
        return await get_stock_analysis(ticker)

    except StockDataUnavailable as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error