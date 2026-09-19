import logging

from fastapi import APIRouter, Request

from fastapi import Depends

from app.routers.common import run_guarded_turn
from app.schemas.chat import ChatRequest, ChatResponse
from app.security import get_current_user
from app.services import nda_chat

logger = logging.getLogger(__name__)

# LLM turns cost real provider spend; only signed-in users may run them.
router = APIRouter(tags=["chat"], dependencies=[Depends(get_current_user)])


# Sync handler on purpose: litellm's completion() is blocking, and FastAPI
# runs `def` routes in its threadpool so the event loop stays free.
@router.post("/chat", response_model=ChatResponse, response_model_exclude_none=True)
def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    result = run_guarded_turn(
        request.app.state.settings, logger, lambda: nda_chat.run_chat_turn(payload)
    )
    return ChatResponse(
        reply=result.reply, updates=nda_chat.to_wire_updates(result.updates)
    )
