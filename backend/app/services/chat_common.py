"""Plumbing shared by the NDA chat and the generic document chat.

The LLM call follows .claude/skills/cerebras/SKILL.md: LiteLLM via OpenRouter
with Cerebras as the inference provider, using Structured Outputs.
"""

import re

from app.schemas.chat import ChatMessage

# openai/gpt-oss-120b is served by Cerebras on OpenRouter (verified live:
# response_format, structured_outputs, and reasoning_effort all supported),
# so the provider preference below actually routes to Cerebras.
MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# The LLM only sees the trimmed tail of long conversations; the current field
# values in the system message already carry everything durable.
MAX_LLM_MESSAGES = 20

FALLBACK_REPLY = "Sorry, I had trouble processing that — could you say it again?"


def strip_fences(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text


def trim_transcript(transcript: list[ChatMessage]) -> tuple[list[ChatMessage], int]:
    """Last MAX_LLM_MESSAGES messages plus how many were dropped."""
    trimmed = transcript[-MAX_LLM_MESSAGES:]
    return trimmed, len(transcript) - len(trimmed)
