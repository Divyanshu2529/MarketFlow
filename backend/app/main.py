from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.assistant import router as assistant_router
from app.api.assistant_memory import (
    router as assistant_memory_router,
)
from app.api.auth import router as auth_router
from app.api.company import router as company_router
from app.api.news import router as news_router
from app.api.watchlist import router as watchlist_router
from app.core.security import JWT_SECRET
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="MarketFlow API",
    description="MarketFlow Platform Backend",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(
    SessionMiddleware,
    secret_key=JWT_SECRET,
    same_site="lax",
    https_only=False,
)


app.include_router(company_router)
app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(news_router)
app.include_router(assistant_router)
app.include_router(assistant_memory_router)


@app.get("/")
def root():
    return {"message": "MarketFlow API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}