import logging
from collections.abc import Callable

from fastapi import HTTPException

from app.config import Settings


def run_guarded_turn[T](
    settings: Settings, logger: logging.Logger, run_turn: Callable[[], T]
) -> T:
    """Shared guard for the chat endpoints: 503 when the LLM key is absent,
    502 on transport/provider failure. Malformed model output never raises —
    the services degrade it to a fallback reply themselves."""
    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=503, detail="AI chat is not configured on this server."
        )
    try:
        return run_turn()
    except Exception:
        logger.exception("Chat turn failed")
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        )
