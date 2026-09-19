from fastapi import APIRouter, HTTPException

from app import paths
from app.documents.registry import DOCUMENT_ORDER, REGISTRY
from app.schemas.documents import (
    DocumentDetail,
    DocumentListResponse,
    summary_from_spec,
)

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=DocumentListResponse)
def list_documents() -> DocumentListResponse:
    return DocumentListResponse(
        documents=[summary_from_spec(REGISTRY[key]) for key in DOCUMENT_ORDER]
    )


@router.get("/documents/{key}", response_model=DocumentDetail)
def get_document(key: str) -> DocumentDetail:
    spec = REGISTRY.get(key)
    if spec is None:
        raise HTTPException(status_code=404, detail=f"Unknown document: {key}")
    summary = summary_from_spec(spec)
    return DocumentDetail(
        **summary.model_dump(),
        template_markdown=paths.read_template(spec.filename),
    )
