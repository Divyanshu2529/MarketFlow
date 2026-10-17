from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.report import Report
from app.models.user import User
from app.schemas.report import (
    CreateReportRequest,
    ReportResponse,
)
from app.services.report_export_service import (
    build_report_export,
)


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    payload: CreateReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticker = payload.ticker.strip().upper()
    company_name = payload.company_name.strip()

    report = Report(
        user_id=current_user.id,
        ticker=ticker,
        company_name=company_name,
        title=f"{company_name} ({ticker}) Equity Research",
        report_type=payload.report_type.strip(),
        report_data=payload.report_data,
    )

    db.add(report)
    await db.commit()
    await db.refresh(report)

    return report


@router.get("", response_model=list[ReportResponse])
async def get_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(desc(Report.created_at))
    )

    return result.all()


@router.get("/{report_id}/download")
async def download_report(
    report_id: int,
    file_format: Literal["pdf", "docx", "json"] = Query(
        default="pdf",
        alias="format",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await db.scalar(
        select(Report).where(
            Report.id == report_id,
            Report.user_id == current_user.id,
        )
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    file_buffer, media_type, filename = build_report_export(
        report,
        file_format,
    )

    return StreamingResponse(
        file_buffer,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await db.scalar(
        select(Report).where(
            Report.id == report_id,
            Report.user_id == current_user.id,
        )
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    return report


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await db.scalar(
        select(Report).where(
            Report.id == report_id,
            Report.user_id == current_user.id,
        )
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    await db.delete(report)
    await db.commit()

    return {
        "message": "Report deleted successfully"
    }