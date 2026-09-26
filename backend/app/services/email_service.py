import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path, override=True)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev")


async def send_password_reset_email(
    recipient_email: str,
    reset_url: str,
) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")

    payload = {
        "from": EMAIL_FROM,
        "to": [recipient_email],
        "subject": "Reset your MarketFlow password",
        "html": f"""
            <h2>Reset your MarketFlow password</h2>
            <p>Click the link below to create a new password:</p>
            <p>
                <a href="{reset_url}">
                    Reset my password
                </a>
            </p>
            <p>This link expires in 30 minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
        """,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    response.raise_for_status()