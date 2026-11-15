from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document as DocxDocument
from fastapi import UploadFile
from pypdf import PdfReader


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_EXTRACTED_CHARS = 80_000

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
}


class DocumentExtractionError(ValueError):
    pass


def _get_extension(filename: str | None) -> str:
    return Path(filename or "").suffix.lower()


def _extract_pdf(
    file_bytes: bytes,
) -> tuple[str, int]:
    try:
        reader = PdfReader(BytesIO(file_bytes))
        page_text: list[str] = []

        for page_number, page in enumerate(
            reader.pages,
            start=1,
        ):
            text = page.extract_text() or ""

            if text.strip():
                page_text.append(
                    f"[Page {page_number}]\n"
                    f"{text.strip()}"
                )

        return "\n\n".join(page_text), len(
            reader.pages
        )

    except Exception as error:
        raise DocumentExtractionError(
            "Unable to read this PDF file."
        ) from error


def _extract_docx(
    file_bytes: bytes,
) -> tuple[str, None]:
    try:
        document = DocxDocument(
            BytesIO(file_bytes)
        )

        sections: list[str] = []

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()

            if text:
                sections.append(text)

        for table in document.tables:
            for row in table.rows:
                cells = [
                    cell.text.strip()
                    for cell in row.cells
                ]

                cells = [
                    cell for cell in cells if cell
                ]

                if cells:
                    sections.append(
                        " | ".join(cells)
                    )

        return "\n\n".join(sections), None

    except Exception as error:
        raise DocumentExtractionError(
            "Unable to read this Word document."
        ) from error


async def extract_uploaded_document(
    file: UploadFile,
) -> dict[str, Any]:
    filename = file.filename or ""
    extension = _get_extension(filename)

    if extension not in ALLOWED_EXTENSIONS:
        raise DocumentExtractionError(
            "Only PDF and DOCX files are supported."
        )

    file_bytes = await file.read(
        MAX_UPLOAD_BYTES + 1
    )

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise DocumentExtractionError(
            "The file is too large. Maximum size is 10 MB."
        )

    if not file_bytes:
        raise DocumentExtractionError(
            "The uploaded file is empty."
        )

    if extension == ".pdf":
        extracted_text, page_count = _extract_pdf(
            file_bytes
        )
    else:
        extracted_text, page_count = _extract_docx(
            file_bytes
        )

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise DocumentExtractionError(
            "No readable text was found in this file."
        )

    was_truncated = (
        len(extracted_text)
        > MAX_EXTRACTED_CHARS
    )

    if was_truncated:
        extracted_text = (
            extracted_text[:MAX_EXTRACTED_CHARS]
            + "\n\n[Document text truncated.]"
        )

    return {
        "fileName": filename,
        "contentType": file.content_type
        or "application/octet-stream",
        "text": extracted_text,
        "pageCount": page_count,
        "characterCount": len(extracted_text),
        "truncated": was_truncated,
    }