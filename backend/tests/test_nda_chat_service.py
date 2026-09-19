"""Unit tests for the NDA chat service: prompt building, output parsing
with field-by-field salvage, and wire translation. No network, no FastAPI."""

import json

from app.schemas.chat import ChatRequest
from app.schemas.nda import DEFAULT_PURPOSE
from app.services import nda_chat
from app.services.chat_common import MAX_LLM_MESSAGES

EMPTY_PARTY = {"company": "", "name": "", "title": "", "address": ""}

DEFAULT_NDA = {
    "purpose": DEFAULT_PURPOSE,
    "effectiveDate": "",
    "mndaTermKind": "expires",
    "mndaTermYears": 1,
    "confidentialityKind": "years",
    "confidentialityYears": 1,
    "governingLaw": "",
    "jurisdiction": "",
    "modifications": "",
    "party1": dict(EMPTY_PARTY),
    "party2": dict(EMPTY_PARTY),
}


def make_request(
    transcript: list[dict] | None = None,
    nda: dict | None = None,
    today: str = "2026-09-18",
) -> ChatRequest:
    return ChatRequest.model_validate(
        {"transcript": transcript or [], "ndaData": nda or DEFAULT_NDA, "today": today}
    )


# --- parse_llm_output -------------------------------------------------------


def test_parse_valid_output() -> None:
    raw = json.dumps(
        {"reply": "Noted!", "updates": {"governing_law": "Delaware", "party1": {"company": "Acme"}}}
    )
    result = nda_chat.parse_llm_output(raw)
    assert result.reply == "Noted!"
    assert result.updates.governing_law == "Delaware"
    assert result.updates.party1 is not None
    assert result.updates.party1.company == "Acme"
    assert result.updates.party2 is None


def test_parse_strips_code_fences() -> None:
    raw = '```json\n{"reply": "Hi", "updates": {}}\n```'
    assert nda_chat.parse_llm_output(raw).reply == "Hi"


def test_parse_non_json_falls_back() -> None:
    result = nda_chat.parse_llm_output("I'm not JSON at all")
    assert result.reply == nda_chat.FALLBACK_REPLY
    assert result.updates == nda_chat.NdaPatch()


def test_parse_missing_reply_keeps_updates() -> None:
    raw = json.dumps({"updates": {"jurisdiction": "New Castle County, Delaware"}})
    result = nda_chat.parse_llm_output(raw)
    assert result.reply == nda_chat.FALLBACK_REPLY
    assert result.updates.jurisdiction == "New Castle County, Delaware"


def test_salvage_drops_bad_enum_keeps_rest() -> None:
    raw = json.dumps(
        {
            "reply": "Setting the term.",
            "updates": {"mnda_term_kind": "forever", "governing_law": "Delaware"},
        }
    )
    result = nda_chat.parse_llm_output(raw)
    assert result.reply == "Setting the term."
    assert result.updates.mnda_term_kind is None
    assert result.updates.governing_law == "Delaware"


def test_salvage_clamps_out_of_range_years() -> None:
    raw = json.dumps(
        {"reply": "ok", "updates": {"mnda_term_years": 500, "confidentiality_years": 0}}
    )
    result = nda_chat.parse_llm_output(raw)
    assert result.updates.mnda_term_years == 99
    assert result.updates.confidentiality_years == 1


def test_salvage_drops_invalid_date() -> None:
    raw = json.dumps(
        {"reply": "ok", "updates": {"effective_date": "tomorrow", "purpose": "Pilot"}}
    )
    result = nda_chat.parse_llm_output(raw)
    assert result.updates.effective_date is None
    assert result.updates.purpose == "Pilot"


# --- defaults + prompt ------------------------------------------------------


def test_still_default_fields_all_defaults() -> None:
    req = make_request()
    flagged = nda_chat._still_default_fields(req.nda_data)
    assert any(f.startswith("purpose") for f in flagged)
    assert any(f.startswith("effective_date") for f in flagged)
    assert any(f.startswith("mnda_term") for f in flagged)
    assert any(f.startswith("confidentiality_term") for f in flagged)


def test_still_default_fields_after_user_input() -> None:
    nda = dict(DEFAULT_NDA)
    nda.update(
        {
            "purpose": "Evaluating a pilot",
            "effectiveDate": "2026-10-01",
            "mndaTermYears": 3,
            "confidentialityYears": 5,
        }
    )
    req = make_request(nda=nda)
    assert nda_chat._still_default_fields(req.nda_data) == []


def test_build_messages_includes_state_today_and_transcript() -> None:
    nda = dict(DEFAULT_NDA)
    nda["governingLaw"] = "Delaware"
    req = make_request(
        transcript=[
            {"role": "assistant", "content": "Hello"},
            {"role": "user", "content": "Acme and Globex"},
        ],
        nda=nda,
    )
    messages = nda_chat.build_messages(req)
    assert messages[0]["role"] == "system"
    system = messages[0]["content"]
    assert "Today's date: 2026-09-18" in system
    assert "ready for review" in system
    assert "not legal advice" in system
    assert '"governing_law": "Delaware"' in system
    # Empty strings are surfaced as null so the model sees them as unset.
    assert '"jurisdiction": null' in system
    assert messages[1:] == [
        {"role": "assistant", "content": "Hello"},
        {"role": "user", "content": "Acme and Globex"},
    ]


def test_build_messages_trims_long_transcript() -> None:
    transcript = [
        {"role": "user", "content": f"message {i}"} for i in range(30)
    ]
    messages = nda_chat.build_messages(make_request(transcript=transcript))
    assert len(messages) == 1 + MAX_LLM_MESSAGES
    assert messages[1]["content"] == f"message {30 - MAX_LLM_MESSAGES}"
    assert "omitted" in messages[0]["content"]


# --- wire translation -------------------------------------------------------


def test_to_wire_updates_camel_case_sparse() -> None:
    patch = nda_chat.NdaPatch(
        governing_law="Delaware", party1=nda_chat.PartyPatch(company="Acme")
    )
    wire = nda_chat.to_wire_updates(patch)
    dumped = wire.model_dump(by_alias=True, exclude_none=True)
    assert dumped == {"governingLaw": "Delaware", "party1": {"company": "Acme"}}
