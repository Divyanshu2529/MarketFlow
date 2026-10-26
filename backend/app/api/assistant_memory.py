from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.assistant_conversation import (
    AssistantConversation,
)
from app.models.assistant_message import AssistantMessage
from app.models.user import User
from app.schemas.assistant_memory import (
    AssistantConversationCreate,
    AssistantConversationDetailResponse,
    AssistantConversationResponse,
    AssistantMessageCreate,
    AssistantMessageResponse,
)


router = APIRouter(
    prefix="/api/assistant",
    tags=["Assistant Conversations"],
)


async def get_user_conversation(
    conversation_id: int,
    current_user: User,
    db: AsyncSession,
) -> AssistantConversation:
    conversation = await db.scalar(
        select(AssistantConversation)
        .options(
            selectinload(
                AssistantConversation.messages
            )
        )
        .where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.user_id == current_user.id,
        )
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return conversation


@router.get(
    "/conversations",
    response_model=list[AssistantConversationResponse],
)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(AssistantConversation)
        .where(
            AssistantConversation.user_id
            == current_user.id
        )
        .order_by(
            AssistantConversation.updated_at.desc()
        )
    )

    return list(result.all())


@router.post(
    "/conversations",
    response_model=AssistantConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: AssistantConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title = payload.title.strip()

    if not title:
        title = "New conversation"

    conversation = AssistantConversation(
        user_id=current_user.id,
        title=title,
    )

    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return conversation


@router.get(
    "/conversations/{conversation_id}",
    response_model=AssistantConversationDetailResponse,
)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )


@router.delete(
    "/conversations/{conversation_id}",
)
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )

    await db.delete(conversation)
    await db.commit()

    return {
        "message": "Conversation deleted successfully"
    }


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=AssistantMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_conversation_message(
    conversation_id: int,
    payload: AssistantMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_user_conversation(
        conversation_id,
        current_user,
        db,
    )

    message = AssistantMessage(
        conversation_id=conversation.id,
        role=payload.role,
        content=payload.content.strip(),
    )

    if (
        conversation.title == "New conversation"
        and payload.role == "user"
    ):
        conversation.title = payload.content.strip()[:80]

    conversation.updated_at = datetime.now(timezone.utc)

    db.add(message)
    await db.commit()
    await db.refresh(message)

    return message