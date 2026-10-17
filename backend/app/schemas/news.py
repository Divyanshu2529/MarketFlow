from pydantic import BaseModel, Field


class SearchInterestRequest(BaseModel):
    ticker: str = Field(
        min_length=1,
        max_length=20,
    )

    company_name: str = Field(
        min_length=1,
        max_length=255,
    )