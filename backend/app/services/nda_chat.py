"""Chat turn for the Mutual NDA creator.

Stateless: each request carries the transcript and the current field values,
and the LLM returns a conversational reply plus a sparse patch of fields it
learned this turn. The models the LLM sees (`NdaPatch`/`ChatTurnResult`) are
plain snake_case and separate from the camelCase wire schemas; `to_wire_updates`
bridges them.

The LLM call follows .claude/skills/cerebras/SKILL.md: LiteLLM via OpenRouter
with Cerebras as the inference provider, using Structured Outputs.
"""

import json
import logging
from typing import Literal

from litellm import completion
from pydantic import BaseModel, Field, ValidationError

from app.schemas.chat import ChatRequest, NdaUpdates
from app.schemas.nda import DEFAULT_PURPOSE, ISO_DATE_RE, NdaData, PartyInfo
from app.services.chat_common import (
    EXTRA_BODY,
    FALLBACK_REPLY,
    MODEL,
    strip_fences,
    trim_transcript,
)

logger = logging.getLogger(__name__)


# --- The structured-output contract the LLM must produce -------------------


class PartyPatch(BaseModel):
    company: str | None = None
    name: str | None = None
    title: str | None = None
    address: str | None = None


class NdaPatch(BaseModel):
    """Fields learned THIS turn; null means "no change", never "clear"."""

    purpose: str | None = None
    effective_date: str | None = Field(default=None, pattern=ISO_DATE_RE)
    mnda_term_kind: Literal["expires", "untilTerminated"] | None = None
    mnda_term_years: int | None = Field(default=None, ge=1, le=99)
    confidentiality_kind: Literal["years", "perpetuity"] | None = None
    confidentiality_years: int | None = Field(default=None, ge=1, le=99)
    governing_law: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None
    party1: PartyPatch | None = None
    party2: PartyPatch | None = None


class ChatTurnResult(BaseModel):
    reply: str = Field(description="Conversational message shown to the user.")
    updates: NdaPatch


# --- System prompt ----------------------------------------------------------

STATIC_INSTRUCTIONS = """\
You are the drafting assistant inside prelegal's Mutual Non-Disclosure
Agreement (MNDA) creator. Your only job is a short, friendly conversation
that fills in the fields of THIS ONE agreement — a Common Paper Mutual NDA
(Cover Page + Standard Terms v1.0). The document updates live on the user's
screen as fields are set; you never write the document itself, you only
extract field values and talk to the user.

FIELDS (exact names as in `updates`; current values are given below):
- purpose: what the parties may use each other's confidential information
  for. Free text, one or two sentences.
- effective_date: yyyy-mm-dd. If unset, the document automatically shows
  today's date — don't press for this unless the user wants a different
  date. Resolve relative dates ("today", "next Monday") into a concrete
  yyyy-mm-dd yourself using Today's date below; never emit words as the value.
- mnda_term_kind + mnda_term_years: how long the MNDA itself lasts —
  "expires" N years (1-99) after the effective date, or "untilTerminated"
  (either party may end it at any time). This is DIFFERENT from
  confidentiality below; if the user seems confused, explain the difference
  in one sentence.
- confidentiality_kind + confidentiality_years: how long secrets stay
  protected — "years" N years (1-99), or "perpetuity" (forever). Trade
  secrets stay protected for as long as the law treats them as trade
  secrets, regardless of this choice.
- governing_law: the jurisdiction whose law governs the agreement — a U.S.
  state (e.g. "Delaware") or a country/legal system such as "England and
  Wales" or "Scotland". Don't assume U.S. law; ask which applies.
- jurisdiction: the courts that hear disputes — e.g. "New Castle County,
  Delaware" or "the courts of England and Wales" — usually the natural
  pairing for governing_law; suggest it and let the user confirm.
- modifications: free-text changes to the standard terms. Almost always
  blank — ask once, lightly ("Any changes to the standard terms? Most
  people leave this blank."), and don't press.
- party1 / party2: company, signer name, signer title, and notice address
  (email or postal) for each side. Ask about the user's own organization
  (party1) first, then the counterparty. In a mutual NDA there is no legal
  difference between party1 and party2.

HOW TO CONVERSE:
- Ask about ONE topic per message, two only if closely related (a signer's
  name and title, say). Never dump a checklist of every remaining field.
- If one answer contains several fields, extract them all in the same turn
  — don't make the user repeat themselves.
- Corrections always win: if the user changes a value they already gave,
  set the field again with the new value.
- Values listed below as "still the tool's defaults" were NOT said by the
  user. Don't treat them as confirmed; when relevant, mention the default
  and make keeping it easy ("I'll assume the standard 1-year term unless
  you'd like something different — sound good?").
- If asked to explain a term, answer briefly in plain English based on what
  this MNDA's Standard Terms actually say, prefixed with a short note that
  this is general information, not legal advice. Only add that caveat when
  actually explaining legal implications, not on ordinary turns.
- Stay on this NDA. If asked about anything else (other documents,
  unrelated advice), say you're focused on this NDA and steer back.
- Never invent a value the user hasn't given or clearly implied.
- ALWAYS end your reply with one specific follow-up question about the
  single most useful missing or unconfirmed field — never leave the user
  without a next step while information is still needed.
- The exception: when every field has a real, user-confirmed value —
  counting the values you are extracting in THIS reply's updates — do not
  ask anything more; instead explicitly announce that the agreement is
  ready for review, point to the live preview on the right and the
  "Edit manually" tab for fine-tuning, and remind the user in one short
  sentence that this is an AI-generated draft, not legal advice, and
  should be reviewed by a lawyer before signing. Don't repeat that
  announcement every turn afterwards.

OUTPUT: `reply` is your chat message. `updates` carries ONLY fields you
learned or the user changed in THIS message — every other field must be
null. Null means "no change this turn"; it never erases anything. Fields
that are still unknown also stay null.

Example: the user says "We're Acme Inc, I'm Jordan Lee, the CEO, evaluating
a partnership with Globex." Correct updates: party1.company="Acme, Inc.",
party1.name="Jordan Lee", party1.title="CEO", purpose="Evaluating a
potential business partnership with Globex." — and every other field null,
including party2 and governing_law, because "not mentioned this turn"
means null."""


def _clean(value: str | int) -> str | int | None:
    return None if value == "" else value


def _display_state(nda: NdaData) -> dict:
    """Snake_case dict of current values with '' shown as null."""
    state: dict = {}
    for name in NdaData.model_fields:
        value = getattr(nda, name)
        if isinstance(value, PartyInfo):
            state[name] = {
                sub: _clean(getattr(value, sub)) for sub in PartyInfo.model_fields
            }
        else:
            state[name] = _clean(value)
    return state


def _still_default_fields(nda: NdaData) -> list[str]:
    """Deterministic hint so the LLM never treats a tool default as
    something the user confirmed. Mirrors defaultNdaData() in
    frontend/lib/nda.ts."""
    defaults: list[str] = []
    if nda.purpose == DEFAULT_PURPOSE:
        defaults.append("purpose")
    if not nda.effective_date:
        defaults.append("effective_date (empty = document shows today)")
    if nda.mnda_term_kind == "expires" and nda.mnda_term_years == 1:
        defaults.append("mnda_term (expires after 1 year)")
    if nda.confidentiality_kind == "years" and nda.confidentiality_years == 1:
        defaults.append("confidentiality_term (1 year)")
    return defaults


def build_messages(req: ChatRequest) -> list[dict[str, str]]:
    transcript, omitted = trim_transcript(req.transcript)
    parts = [
        STATIC_INSTRUCTIONS,
        f"Today's date: {req.today}",
        "Current field values (null = not provided yet):\n"
        + json.dumps(_display_state(req.nda_data), indent=2),
        "Still the tool's defaults, not yet confirmed by the user: "
        + (", ".join(_still_default_fields(req.nda_data)) or "none"),
    ]
    if omitted:
        parts.append(
            f"({omitted} earlier chat messages were omitted; the current field "
            "values above already reflect everything gathered so far.)"
        )
    system = {"role": "system", "content": "\n\n".join(parts)}
    return [system, *({"role": m.role, "content": m.content} for m in transcript)]


# --- Parsing the LLM's output (never raises) --------------------------------


_YEAR_FIELDS = {"mnda_term_years", "confidentiality_years"}


def _salvage(data: object) -> ChatTurnResult:
    """Field-by-field recovery: one bad value drops that field, not the turn."""
    if not isinstance(data, dict):
        return ChatTurnResult(reply=FALLBACK_REPLY, updates=NdaPatch())

    reply = data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        reply = FALLBACK_REPLY

    salvaged: dict = {}
    raw_updates = data.get("updates")
    if isinstance(raw_updates, dict):
        for name in NdaPatch.model_fields:
            value = raw_updates.get(name)
            if value is None:
                continue
            if name in _YEAR_FIELDS and isinstance(value, int):
                # Mirror the manual form's clamp instead of dropping.
                value = min(99, max(1, value))
            try:
                # Validating through the model applies the Field constraints
                # (pattern, ge/le), not just the type annotation.
                salvaged[name] = getattr(NdaPatch(**{name: value}), name)
            except ValidationError:
                logger.warning("Dropping invalid chat update %s=%r", name, value)

    return ChatTurnResult(reply=reply, updates=NdaPatch(**salvaged))


def parse_llm_output(raw: str) -> ChatTurnResult:
    text = strip_fences(raw or "")
    try:
        return ChatTurnResult.model_validate_json(text)
    except ValidationError:
        pass
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Chat model returned non-JSON output")
        return ChatTurnResult(reply=FALLBACK_REPLY, updates=NdaPatch())
    return _salvage(data)


# --- The turn ---------------------------------------------------------------


def run_chat_turn(req: ChatRequest) -> ChatTurnResult:
    """One conversational turn. Raises only on transport/provider errors;
    malformed model output degrades gracefully via parse_llm_output."""
    response = completion(
        model=MODEL,
        messages=build_messages(req),
        response_format=ChatTurnResult,
        reasoning_effort="low",
        # litellm's openrouter mapping rejects reasoning_effort by default;
        # this forwards it to the model instead of erroring.
        allowed_openai_params=["reasoning_effort"],
        extra_body=EXTRA_BODY,
    )
    return parse_llm_output(response.choices[0].message.content)


def to_wire_updates(patch: NdaPatch) -> NdaUpdates:
    """Snake_case LLM patch -> camelCase wire patch (same field names)."""
    return NdaUpdates.model_validate(patch.model_dump())
