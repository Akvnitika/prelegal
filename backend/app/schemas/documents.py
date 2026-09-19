"""Wire contract for GET /api/documents and GET /api/documents/{key}."""

from app.documents.registry import DocumentSpec
from app.schemas.camel import CamelModel


class FieldOut(CamelModel):
    name: str
    label: str
    hint: str
    group: str


class DocumentSummary(CamelModel):
    key: str
    name: str
    description: str
    about: str
    fields: list[FieldOut]


class DocumentListResponse(CamelModel):
    documents: list[DocumentSummary]


class DocumentDetail(DocumentSummary):
    template_markdown: str


def summary_from_spec(spec: DocumentSpec) -> DocumentSummary:
    return DocumentSummary(
        key=spec.key,
        name=spec.name,
        description=spec.description,
        about=spec.about,
        fields=[
            FieldOut(name=f.name, label=f.label, hint=f.hint, group=f.group)
            for f in spec.fields
        ],
    )
