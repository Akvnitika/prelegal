import logging

from fastapi import APIRouter, HTTPException, Request

from app.documents.registry import NDA_KEY, REGISTRY
from app.routers.common import run_guarded_turn
from app.schemas.doc_chat import DocChatRequest, DocChatResponse
from app.services import doc_chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["doc-chat"])


# Sync handler on purpose: litellm's completion() is blocking, and FastAPI
# runs `def` routes in its threadpool so the event loop stays free.
@router.post("/doc-chat", response_model=DocChatResponse, response_model_exclude_none=True)
def doc_chat_turn(payload: DocChatRequest, request: Request) -> DocChatResponse:
    key = payload.document_key
    if key is not None and key != NDA_KEY and key not in REGISTRY:
        raise HTTPException(status_code=422, detail=f"Unknown documentKey: {key}")
    result = run_guarded_turn(
        request.app.state.settings, logger, lambda: doc_chat.run_chat_turn(payload)
    )
    return DocChatResponse(
        reply=result.reply,
        selected_document=result.selected_document,
        updates=doc_chat.to_wire_updates(result),
    )
