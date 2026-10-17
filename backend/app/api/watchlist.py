from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.watchlist_item import WatchlistItem


router = APIRouter(
    prefix="/api/watchlist",
    tags=["Watchlist"],
)


class WatchlistCreateRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)


class WatchlistResponse(BaseModel):
    id: int
    ticker: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get(
    "",
    response_model=list[WatchlistResponse],
)
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.created_at.desc())
    )

    return list(result.all())


@router.post(
    "",
    response_model=WatchlistResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_to_watchlist(
    payload: WatchlistCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticker = payload.ticker.strip().upper()

    watchlist_item = WatchlistItem(
        user_id=current_user.id,
        ticker=ticker,
    )

    db.add(watchlist_item)

    try:
        await db.commit()
        await db.refresh(watchlist_item)

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This company is already in your watchlist.",
        )

    return watchlist_item


@router.delete("/{ticker}")
async def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    normalized_ticker = ticker.strip().upper()

    watchlist_item = await db.scalar(
        select(WatchlistItem).where(
            WatchlistItem.user_id == current_user.id,
            WatchlistItem.ticker == normalized_ticker,
        )
    )

    if watchlist_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company is not in your watchlist.",
        )

    await db.delete(watchlist_item)
    await db.commit()

    return {
        "message": f"{normalized_ticker} removed from your watchlist."
    }