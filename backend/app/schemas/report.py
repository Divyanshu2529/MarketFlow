from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CreateReportRequest(BaseModel):
    ticker: str = Field(
        min_length=1,
        max_length=20,
    )

    company_name: str = Field(
        min_length=1,
        max_length=255,
    )

    report_type: str = Field(
        default="Equity Research",
        min_length=1,
        max_length=100,
    )

    report_data: dict[str, Any] = Field(
        default_factory=dict,
    )


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    company_name: str
    title: str
    report_type: str
    report_data: dict[str, Any]
    created_at: datetime