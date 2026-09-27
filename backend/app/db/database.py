import os
from collections.abc import AsyncGenerator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")


engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)


SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    from app.models.password_reset_token import PasswordResetToken  # noqa: F401
    from app.models.user import User  # noqa: F401

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

        await connection.exec_driver_sql(
            """
            ALTER TABLE users
            ALTER COLUMN password_hash DROP NOT NULL
            """
        )

        await connection.exec_driver_sql(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)
            """
        )

        await connection.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id
            ON users (google_id)
            """
        )