from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AssistantConversationCreate(BaseModel):
    title: str = Field(
        default="New conversation",
        min_length=1,
        max_length=200,
    )


class AssistantAttachmentCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
    )

    file_name: str = Field(
        alias="fileName",
        min_length=1,
        max_length=255,
    )

    content_type: str = Field(
        alias="contentType",
        min_length=1,
        max_length=150,
    )

    page_count: int | None = Field(
        default=None,
        alias="pageCount",
        ge=1,
    )


class AssistantAttachmentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    file_name: str = Field(alias="fileName")
    content_type: str = Field(alias="contentType")
    page_count: int | None = Field(
        default=None,
        alias="pageCount",
    )


class AssistantMessageResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    attachment: AssistantAttachmentResponse | None = None


class AssistantConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class AssistantConversationDetailResponse(
    AssistantConversationResponse
):
    messages: list[AssistantMessageResponse] = Field(
        default_factory=list
    )


class AssistantMessageCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(
        min_length=1,
        max_length=12000,
    )
    attachment: AssistantAttachmentCreate | None = None