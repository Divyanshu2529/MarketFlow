from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AssistantConversationCreate(BaseModel):
    title: str = Field(
        default="New conversation",
        min_length=1,
        max_length=200,
    )


class AssistantMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class AssistantConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class AssistantConversationDetailResponse(
    AssistantConversationResponse
):
    messages: list[AssistantMessageResponse] = []
    
class AssistantMessageCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(
        min_length=1,
        max_length=12000,
    )