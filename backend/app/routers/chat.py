import logging

from fastapi import APIRouter, HTTPException, Request

from app.schemas.chat import ChatRequest, ChatResponse
from app.services import nda_chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


# Sync handler on purpose: litellm's completion() is blocking, and FastAPI
# runs `def` routes in its threadpool so the event loop stays free.
@router.post("/chat", response_model=ChatResponse, response_model_exclude_none=True)
def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    settings = request.app.state.settings
    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI chat is not configured on this server.",
        )
    try:
        result = nda_chat.run_chat_turn(payload)
    except Exception:
        # Malformed model output is already handled inside run_chat_turn;
        # only genuine transport/provider/auth failures reach this.
        logger.exception("LLM chat turn failed")
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        )
    return ChatResponse(
        reply=result.reply, updates=nda_chat.to_wire_updates(result.updates)
    )
