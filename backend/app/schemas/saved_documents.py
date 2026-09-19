"""Wire contract for /api/saved-documents (a user's stored documents).

Distinct path family from GET /api/documents, which serves the static
template catalog. `data` is an opaque frontend-owned JSON blob.
"""

from datetime import datetime

from pydantic import Field

from app.schemas.camel import CamelModel


class SavedDocumentSummary(CamelModel):
    id: int
    document_key: str
    title: str
    updated_at: datetime


class SavedDocumentOut(SavedDocumentSummary):
    data: dict


class SavedDocumentListResponse(CamelModel):
    documents: list[SavedDocumentSummary]


class SavedDocumentCreate(CamelModel):
    document_key: str
    title: str = Field(min_length=1, max_length=255)
    data: dict


class SavedDocumentUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    data: dict | None = None
