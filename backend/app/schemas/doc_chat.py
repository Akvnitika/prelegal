"""Wire contract for POST /api/doc-chat (the generic document chat).

`documentKey` null means the conversation is still choosing a document; the
response's `selectedDocument` appears only on the turn where the assistant
picks (or switches) one. `updates` is a sparse {field name: value} patch —
the frontend owns the canonical fields state and merges it.
"""

from pydantic import Field

from app.schemas.camel import CamelModel
from app.schemas.chat import ChatMessage
from app.schemas.nda import ISO_DATE_RE


class DocChatRequest(CamelModel):
    transcript: list[ChatMessage]
    document_key: str | None = None
    fields: dict[str, str] = Field(default_factory=dict)
    today: str = Field(pattern=ISO_DATE_RE)


class DocChatResponse(CamelModel):
    reply: str
    selected_document: str | None = None
    updates: dict[str, str] = Field(default_factory=dict)
