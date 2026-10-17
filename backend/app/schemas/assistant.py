from typing import Any, Literal

from pydantic import BaseModel, Field


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(
        min_length=1,
        max_length=4000,
    )


class AssistantChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
    )

    context: dict[str, Any] = Field(
        default_factory=dict,
    )

    history: list[AssistantMessage] = Field(
        default_factory=list,
        max_length=20,
    )


class AssistantChatResponse(BaseModel):
    answer: str