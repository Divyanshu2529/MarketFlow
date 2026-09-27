import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    PasswordResetRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
)
from app.services.email_service import send_password_reset_email


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path, override=True)

APP_URL = os.getenv("APP_URL", "http://localhost:3000")
FRONTEND_URL = os.getenv("FRONTEND_URL", APP_URL)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://127.0.0.1:8000/api/auth/google/callback",
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

COOKIE_NAME = "marketflow_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7

oauth = OAuth()

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url=(
        "https://accounts.google.com/"
        ".well-known/openid-configuration"
    ),
    client_kwargs={
        "scope": "openid email profile",
    },
)


def set_auth_cookie(response: Response, user_id: int) -> None:
    token = create_access_token(user_id)

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/signup", response_model=UserResponse, status_code=201)
async def signup(
    payload: SignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()

    existing_user = await db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    set_auth_cookie(response, user.id)

    return user


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()

    user = await db.scalar(
        select(User).where(User.email == email)
    )

    if (
        user is None
        or user.password_hash is None
        or not verify_password(
            payload.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    set_auth_cookie(response, user.id)

    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
    )

    return {"message": "Logged out successfully"}


@router.get("/google/login")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured",
        )

    return await oauth.google.authorize_redirect(
        request,
        GOOGLE_REDIRECT_URI,
    )


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        token = await oauth.google.authorize_access_token(request)

        userinfo = token.get("userinfo")

        if userinfo is None:
            userinfo = await oauth.google.userinfo(
                token=token
            )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Google authentication failed",
        )

    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not google_id or not email:
        raise HTTPException(
            status_code=400,
            detail="Google account information is incomplete",
        )

    email = email.strip().lower()

    user = await db.scalar(
        select(User).where(User.google_id == google_id)
    )

    if user is None:
        user = await db.scalar(
            select(User).where(User.email == email)
        )

    if user is None:
        user = User(
            name=name or email.split("@")[0],
            email=email,
            password_hash=None,
            google_id=google_id,
        )

        db.add(user)

    else:
        user.google_id = google_id

        if name and not user.name:
            user.name = name

    await db.commit()
    await db.refresh(user)

    response = RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard",
        status_code=303,
    )

    set_auth_cookie(response, user.id)

    return response


@router.post("/forgot-password")
async def forgot_password(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()

    user = await db.scalar(
        select(User).where(User.email == email)
    )

    if user:
        raw_token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(minutes=30)
            ),
        )

        db.add(reset_token)
        await db.commit()

        reset_url = (
            f"{APP_URL}/reset-password?token={raw_token}"
        )

        await send_password_reset_email(
            recipient_email=user.email,
            reset_url=reset_url,
        )

    return {
        "message": (
            "If an account exists with that email, "
            "a password reset link has been sent."
        )
    }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    token_hash = hashlib.sha256(
        payload.token.encode("utf-8")
    ).hexdigest()

    reset_token = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    )

    now = datetime.now(timezone.utc)

    if (
        reset_token is None
        or reset_token.used_at is not None
        or reset_token.expires_at <= now
    ):
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid or expired",
        )

    user = await db.get(User, reset_token.user_id)

    if user is None:
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid",
        )

    user.password_hash = hash_password(
        payload.new_password
    )

    reset_token.used_at = now

    await db.commit()

    return {
        "message": "Password reset successfully",
    }


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])

    except (
        jwt.PyJWTError,
        KeyError,
        TypeError,
        ValueError,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    user = await db.get(User, user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is unavailable",
        )

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user