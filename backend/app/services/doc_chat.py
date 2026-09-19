"""Chat turn for the generic document creator (PL-7).

Two modes in one stateless endpoint:
- Selection mode (document_key is None): the assistant helps the user pick a
  catalog document; unsupported requests get a plain "we can't generate that"
  plus the closest supported match.
- Filling mode (document_key set): the assistant fills that document's
  registry fields via a sparse list of {name, value} updates.

Unlike nda_chat, `_salvage` runs on EVERY response — even structurally valid
JSON — because the LLM contract can't express "name must be one of this
document's fields"; the registry check happens here. Don't "simplify" this
back to the two-tier parse or unknown field names slip through.
"""

import json
import logging

from litellm import completion
from pydantic import BaseModel, Field

from app.documents.registry import NDA_KEY, REGISTRY, DocumentSpec
from app.paths import read_catalog
from app.schemas.doc_chat import DocChatRequest
from app.services.chat_common import (
    EXTRA_BODY,
    FALLBACK_REPLY,
    MODEL,
    strip_fences,
    trim_transcript,
)

logger = logging.getLogger(__name__)

MAX_VALUE_LENGTH = 500

ALL_SELECTABLE_KEYS = frozenset(REGISTRY) | {NDA_KEY}

NDA_HANDOFF_REPLY = (
    "Great — a Mutual NDA is the right fit. Taking you to prelegal's "
    "dedicated NDA creator, where I'll help you fill it in."
)


# --- The structured-output contract the LLM must produce -------------------


class DocFieldUpdate(BaseModel):
    name: str
    value: str


class DocChatTurnResult(BaseModel):
    reply: str = Field(description="Conversational message shown to the user.")
    selected_document: str | None = None
    updates: list[DocFieldUpdate] = Field(default_factory=list)


# --- Prompts ----------------------------------------------------------------

SELECTION_INSTRUCTIONS = """\
You are the drafting assistant inside prelegal's document creator. Right now
your job is to help the user figure out WHICH agreement they need, then hand
off to the right creator flow. You do not fill in any fields yet.

HOW TO CONVERSE:
- Ask what the user is trying to accomplish, in plain language, if they
  don't already know a document's name.
- The moment you're confident which ONE document fits, set
  `selected_document` to its key and say so in `reply` — don't wait for
  confirmation first, but make it easy for the user to correct you if you
  guessed wrong.
- If the user wants a Mutual NDA (or clearly wants a simple mutual
  confidentiality agreement), set selected_document="mutual-nda" and tell
  them you're taking them to prelegal's dedicated NDA creator — don't ask
  NDA field questions here.
- If what the user describes doesn't match anything in the catalog (an
  employment contract, a lease, a will...), do NOT invent a document. Say
  plainly that prelegal can't generate that, then name the CLOSEST catalog
  match if there is a reasonable one and briefly explain why it's close,
  and let the user decide. Leave selected_document null unless they agree.
- Never set selected_document to a key that isn't in the catalog below.
- ALWAYS end your reply with a specific question that moves the user
  forward — which document to pick, or what they're trying to accomplish —
  unless you have just set selected_document.

OUTPUT: `reply` is your chat message. `selected_document` stays null until
you're confident (or the user confirms) which document to create. `updates`
must be an empty list in selection mode."""

FILLING_INSTRUCTIONS = """\
You are the drafting assistant inside prelegal's document creator. Your only
job is a short, friendly conversation that fills in the fields of THIS ONE
document — a Common Paper {doc_name}. {doc_about} The document updates live
on the user's screen as fields are set; you never write the document itself,
you only extract field values and talk to the user.

HOW TO CONVERSE:
- Ask about ONE topic (or two closely related fields, like a liability cap
  and its trigger) per message. Never dump the whole field list on the user.
- If one answer contains several fields, extract them all in the same turn —
  don't make the user repeat themselves.
- Corrections always win: if the user changes a value they already gave, set
  the field again with the new value.
- Resolve relative dates ("today", "in two years") into concrete values
  yourself using Today's date below.
- For Governing Law-style fields: the value can be a U.S. state (e.g.
  "Delaware") or another legal system such as "England and Wales" or
  "Scotland" — don't assume U.S. law; ask which applies. For Chosen
  Courts, once the governing law is known, suggest the natural pairing
  (e.g. "the state and federal courts located in New Castle County,
  Delaware", or "the courts of England and Wales") and let the user
  confirm or change it.
- If asked to explain a term, answer briefly in plain English, prefixed
  with a short note that this is general information, not legal advice.
  Only add that caveat when actually explaining legal implications.
- Stay on this document. If the user's answers suggest they need a
  DIFFERENT catalog document entirely, say so plainly and, if confident
  which one, set `selected_document` to the new key; otherwise keep going.
- Never invent a value the user hasn't given or clearly implied. Where a
  field is commonly "None" (modifications, extra warranties), offer that
  as the easy default.
- ALWAYS end your reply with one specific follow-up question about the
  single most useful missing field — never leave the user without a next
  step while information is still needed.
- The exception: when every field has a value, explicitly announce that
  the {doc_name} looks complete and point to the live preview on the right
  and the "Edit manually" tab for fine-tuning. Don't repeat that
  announcement every turn afterwards.

OUTPUT: `reply` is your chat message. `updates` is a list of {{"name": ...,
"value": ...}} objects — ONLY fields you learned or the user changed THIS
message, using the exact field names listed below; omit everything you
didn't just learn. `selected_document` must be null unless the user is
switching to a different catalog document.

Example: the user says "We're Acme Inc and the other side is Globex
Corporation, under Delaware law." Correct updates: [{{"name": "Provider",
"value": "Acme, Inc."}}, {{"name": "Customer", "value": "Globex
Corporation"}}, {{"name": "Governing Law", "value": "Delaware"}}] — nothing
else, because nothing else was mentioned this turn."""


def _catalog_block() -> str:
    lines = ["CATALOG (the only supported document types):"]
    nda = next(
        (e for e in read_catalog() if e["filename"] == "Mutual-NDA.md"), None
    )
    if nda is not None:
        lines.append(
            f'- {nda["name"]} (key: "{NDA_KEY}"): {nda["description"]} '
            "Two companies sharing confidential information in both "
            "directions. Has its own dedicated creator."
        )
    for key, spec in REGISTRY.items():
        lines.append(f'- {spec.name} (key: "{key}"): {spec.about}')
    return "\n".join(lines)


def _fields_block(spec: DocumentSpec, current: dict[str, str]) -> str:
    lines = [
        "FIELDS (exact names for `updates`; current values in parentheses,",
        "null = not provided yet):",
    ]
    for group, fields in spec.grouped_fields():
        lines.append(f"[{group}]")
        for field in fields:
            value = current.get(field.name, "").strip()
            shown = json.dumps(value) if value else "null"
            lines.append(f"- {field.name} ({shown}): {field.hint}")
    return "\n".join(lines)


def build_messages(req: DocChatRequest) -> list[dict[str, str]]:
    transcript, omitted = trim_transcript(req.transcript)
    if req.document_key is None:
        parts = [
            SELECTION_INSTRUCTIONS,
            f"Today's date: {req.today}",
            _catalog_block(),
        ]
    else:
        spec = REGISTRY[req.document_key]
        parts = [
            FILLING_INSTRUCTIONS.format(doc_name=spec.name, doc_about=spec.about),
            f"Today's date: {req.today}",
            _fields_block(spec, req.fields),
        ]
    if omitted:
        parts.append(
            f"({omitted} earlier chat messages were omitted; the current "
            "field values above already reflect everything gathered so far.)"
        )
    system = {"role": "system", "content": "\n\n".join(parts)}
    return [system, *({"role": m.role, "content": m.content} for m in transcript)]


# --- Parsing the LLM's output (never raises) --------------------------------


def _salvage(data: object, valid_field_names: frozenset[str]) -> DocChatTurnResult:
    if not isinstance(data, dict):
        return DocChatTurnResult(reply=FALLBACK_REPLY)

    reply = data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        reply = FALLBACK_REPLY

    selected = data.get("selected_document")
    if selected is not None and selected not in ALL_SELECTABLE_KEYS:
        logger.warning("Dropping unknown selected_document %r", selected)
        selected = None

    updates: dict[str, str] = {}
    raw_updates = data.get("updates")
    if isinstance(raw_updates, list):
        for item in raw_updates:
            if not isinstance(item, dict):
                continue
            name, value = item.get("name"), item.get("value")
            if not isinstance(name, str) or not isinstance(value, str):
                continue
            name, value = name.strip(), value.strip()[:MAX_VALUE_LENGTH]
            if not name or not value:
                continue
            if name not in valid_field_names:
                logger.warning("Dropping update for unknown field %r", name)
                continue
            updates[name] = value  # duplicates: last wins

    return DocChatTurnResult(
        reply=reply,
        selected_document=selected,
        updates=[DocFieldUpdate(name=n, value=v) for n, v in updates.items()],
    )


def parse_llm_output(raw: str, current_document_key: str | None) -> DocChatTurnResult:
    text = strip_fences(raw or "")
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Doc chat model returned non-JSON output")
        return DocChatTurnResult(reply=FALLBACK_REPLY)

    selected = data.get("selected_document") if isinstance(data, dict) else None
    if selected in REGISTRY:
        valid = REGISTRY[selected].field_names
    elif current_document_key in REGISTRY:
        valid = REGISTRY[current_document_key].field_names
    else:
        valid = frozenset()
    return _salvage(data, valid)


# --- The turn ---------------------------------------------------------------


def run_chat_turn(req: DocChatRequest) -> DocChatTurnResult:
    """One conversational turn. Raises only on transport/provider errors."""
    if req.document_key == NDA_KEY:
        # The frontend routes to /nda on selection; if a request still
        # arrives with the NDA key, hand off without spending an LLM call.
        return DocChatTurnResult(reply=NDA_HANDOFF_REPLY, selected_document=NDA_KEY)
    response = completion(
        model=MODEL,
        messages=build_messages(req),
        response_format=DocChatTurnResult,
        reasoning_effort="low",
        # litellm's openrouter mapping rejects reasoning_effort by default;
        # this forwards it to the model instead of erroring.
        allowed_openai_params=["reasoning_effort"],
        extra_body=EXTRA_BODY,
    )
    return parse_llm_output(response.choices[0].message.content, req.document_key)


def to_wire_updates(result: DocChatTurnResult) -> dict[str, str]:
    return {u.name: u.value for u in result.updates}
