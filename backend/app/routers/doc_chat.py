import logging

from fastapi import APIRouter, HTTPException, Request

from app.documents.registry import NDA_KEY, REGISTRY
from app.schemas.doc_chat import DocChatRequest, DocChatResponse
from app.services import doc_chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["doc-chat"])


# Sync handler on purpose: litellm's completion() is blocking, and FastAPI
# runs `def` routes in its threadpool so the event loop stays free.
@router.post("/doc-chat", response_model=DocChatResponse, response_model_exclude_none=True)
def doc_chat_turn(payload: DocChatRequest, request: Request) -> DocChatResponse:
    settings = request.app.state.settings
    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=503, detail="AI chat is not configured on this server."
        )
    key = payload.document_key
    if key is not None and key != NDA_KEY and key not in REGISTRY:
        raise HTTPException(status_code=422, detail=f"Unknown documentKey: {key}")
    try:
        result = doc_chat.run_chat_turn(payload)
    except Exception:
        # Malformed model output is handled inside run_chat_turn; only
        # genuine transport/provider/auth failures reach this.
        logger.exception("Doc chat turn failed")
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        )
    return DocChatResponse(
        reply=result.reply,
        selected_document=result.selected_document,
        updates=doc_chat.to_wire_updates(result),
    )
