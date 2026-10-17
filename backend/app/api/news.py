from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.search_history import SearchHistory
from app.models.user import User
from app.models.watchlist_item import WatchlistItem
from app.schemas.news import SearchInterestRequest
from app.services.news_service import get_personalized_news


router = APIRouter(
    prefix="/api/news",
    tags=["News"],
)


@router.post("/interests")
async def record_search_interest(
    payload: SearchInterestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticker = payload.ticker.strip().upper()
    company_name = payload.company_name.strip()

    existing_history = await db.scalar(
        select(SearchHistory).where(
            SearchHistory.user_id == current_user.id,
            SearchHistory.ticker == ticker,
        )
    )

    if existing_history:
        existing_history.company_name = company_name
        existing_history.searched_at = datetime.now(
            timezone.utc
        )
    else:
        db.add(
            SearchHistory(
                user_id=current_user.id,
                ticker=ticker,
                company_name=company_name,
                searched_at=datetime.now(timezone.utc),
            )
        )

    await db.commit()

    return {
        "message": "Search interest saved"
    }


@router.get("/feed")
async def get_personalized_news_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    history_result = await db.scalars(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(desc(SearchHistory.searched_at))
        .limit(10)
    )

    watchlist_result = await db.scalars(
        select(WatchlistItem).where(
            WatchlistItem.user_id == current_user.id
        )
    )

    interests: dict[str, dict[str, str]] = {}

    for item in history_result.all():
        interests[item.ticker] = {
            "ticker": item.ticker,
            "company_name": item.company_name,
        }

    for item in watchlist_result.all():
        interests.setdefault(
            item.ticker,
            {
                "ticker": item.ticker,
                "company_name": item.ticker,
            },
        )

    articles = await get_personalized_news(
        list(interests.values())
    )

    return {
        "articles": articles,
    }