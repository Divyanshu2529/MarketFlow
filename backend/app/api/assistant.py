from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
)
from app.services.assistant_service import (
    AssistantUnavailable,
    generate_assistant_answer,
)


router = APIRouter(
    prefix="/api/assistant",
    tags=["AI Assistant"],
)


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
)
async def chat_with_assistant(
    payload: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        answer = await generate_assistant_answer(payload)

        return AssistantChatResponse(
            answer=answer
        )

    except AssistantUnavailable as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error