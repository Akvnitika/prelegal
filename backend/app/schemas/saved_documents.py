"""Wire contract for /api/saved-documents (a user's stored documents).

Distinct path family from GET /api/documents, which serves the static
template catalog. `data` is an opaque frontend-owned JSON blob.
"""

from datetime import datetime, timezone

from pydantic import Field, field_serializer

from app.schemas.camel import CamelModel


class SavedDocumentSummary(CamelModel):
    id: int
    document_key: str
    title: str
    updated_at: datetime

    @field_serializer("updated_at")
    def _utc(self, value: datetime) -> str:
        # SQLite's DATETIME round-trip drops tzinfo; the stored wall-clock is
        # UTC, so re-attach it — otherwise browsers parse the zoneless string
        # as local time and "Edited X ago" is wrong outside UTC.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()


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
