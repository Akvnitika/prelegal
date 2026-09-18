"""Wire contract for POST /api/chat.

The response's `updates` is a sparse patch: only fields the assistant
learned this turn are set; everything else is omitted (exclude_none).
The frontend owns the canonical NdaData state and merges the patch.
"""

from typing import Literal

from pydantic import Field

from app.schemas.camel import CamelModel
from app.schemas.nda import ISO_DATE_RE, NdaData


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    transcript: list[ChatMessage]
    nda_data: NdaData
    # Stamped client-side (the viewer's timezone is what "today" means here,
    # mirroring todayIso() in frontend/lib/nda.ts).
    today: str = Field(pattern=ISO_DATE_RE)


class PartyUpdate(CamelModel):
    company: str | None = None
    name: str | None = None
    title: str | None = None
    address: str | None = None


class NdaUpdates(CamelModel):
    purpose: str | None = None
    effective_date: str | None = None
    mnda_term_kind: Literal["expires", "untilTerminated"] | None = None
    mnda_term_years: int | None = None
    confidentiality_kind: Literal["years", "perpetuity"] | None = None
    confidentiality_years: int | None = None
    governing_law: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None
    party1: PartyUpdate | None = None
    party2: PartyUpdate | None = None


class ChatResponse(CamelModel):
    reply: str
    updates: NdaUpdates
