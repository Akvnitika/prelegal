from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.documents.registry import NDA_KEY, REGISTRY
from app.models import SavedDocument, User
from app.schemas.saved_documents import (
    SavedDocumentCreate,
    SavedDocumentListResponse,
    SavedDocumentOut,
    SavedDocumentSummary,
    SavedDocumentUpdate,
)
from app.security import get_current_user

router = APIRouter(tags=["saved-documents"])

VALID_KEYS = frozenset(REGISTRY) | {NDA_KEY}


def _summary(doc: SavedDocument) -> SavedDocumentSummary:
    return SavedDocumentSummary(
        id=doc.id,
        document_key=doc.document_key,
        title=doc.title,
        updated_at=doc.updated_at,
    )


def _out(doc: SavedDocument) -> SavedDocumentOut:
    return SavedDocumentOut(**_summary(doc).model_dump(), data=doc.data)


async def _owned_document(
    doc_id: int, user: User, db: AsyncSession
) -> SavedDocument:
    doc = await db.get(SavedDocument, doc_id)
    # Another user's document is a 404, not a 403: don't reveal existence.
    if doc is None or doc.user_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.get("/saved-documents", response_model=SavedDocumentListResponse)
async def list_saved_documents(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> SavedDocumentListResponse:
    result = await db.execute(
        select(SavedDocument)
        .where(SavedDocument.user_id == user.id)
        .order_by(SavedDocument.updated_at.desc())
    )
    return SavedDocumentListResponse(
        documents=[_summary(doc) for doc in result.scalars()]
    )


@router.post("/saved-documents", response_model=SavedDocumentOut, status_code=201)
async def create_saved_document(
    payload: SavedDocumentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedDocumentOut:
    if payload.document_key not in VALID_KEYS:
        raise HTTPException(
            status_code=422, detail=f"Unknown documentKey: {payload.document_key}"
        )
    doc = SavedDocument(
        user_id=user.id,
        document_key=payload.document_key,
        title=payload.title,
        data=payload.data,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return _out(doc)


@router.get("/saved-documents/{doc_id}", response_model=SavedDocumentOut)
async def get_saved_document(
    doc_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedDocumentOut:
    return _out(await _owned_document(doc_id, user, db))


@router.put("/saved-documents/{doc_id}", response_model=SavedDocumentOut)
async def update_saved_document(
    doc_id: int,
    payload: SavedDocumentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedDocumentOut:
    doc = await _owned_document(doc_id, user, db)
    if payload.title is not None:
        doc.title = payload.title
    if payload.data is not None:
        doc.data = payload.data
    await db.commit()
    await db.refresh(doc)
    return _out(doc)


@router.delete("/saved-documents/{doc_id}", status_code=204)
async def delete_saved_document(
    doc_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    doc = await _owned_document(doc_id, user, db)
    await db.delete(doc)
    await db.commit()
    return Response(status_code=204)
