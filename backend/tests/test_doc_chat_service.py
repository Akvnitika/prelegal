"""Unit tests for the generic document chat service. No network, no FastAPI."""

import json

from app.schemas.doc_chat import DocChatRequest
from app.services import doc_chat


def make_request(
    transcript: list[dict] | None = None,
    document_key: str | None = None,
    fields: dict[str, str] | None = None,
) -> DocChatRequest:
    return DocChatRequest.model_validate(
        {
            "transcript": transcript or [],
            "documentKey": document_key,
            "fields": fields or {},
            "today": "2026-09-19",
        }
    )


# --- build_messages ---------------------------------------------------------


def test_selection_mode_grounds_on_the_catalog() -> None:
    messages = doc_chat.build_messages(make_request())
    system = messages[0]["content"]
    assert "CATALOG" in system
    assert '"mutual-nda"' in system
    for key, spec in doc_chat.REGISTRY.items():
        assert f'(key: "{key}")' in system
        assert spec.about in system
    assert "FIELDS" not in system
    assert "Today's date: 2026-09-19" in system


def test_filling_mode_lists_fields_with_current_values() -> None:
    messages = doc_chat.build_messages(
        make_request(document_key="csa", fields={"Provider": "Acme, Inc."})
    )
    system = messages[0]["content"]
    assert "Cloud Service Agreement" in system
    assert '- Provider ("Acme, Inc.")' in system
    assert "- Customer (null)" in system
    assert "[Parties]" in system
    assert "CATALOG" not in system
    # Engagement rules: the assistant opens the form conversation itself,
    # and announces readiness for review (with the legal-advice caveat).
    assert "OPEN the conversation yourself" in system
    assert "ready for review" in system
    assert "not legal advice" in system


def test_transcript_is_trimmed_with_note() -> None:
    transcript = [{"role": "user", "content": f"m{i}"} for i in range(30)]
    messages = doc_chat.build_messages(make_request(transcript=transcript))
    assert len(messages) == 1 + 20
    assert "omitted" in messages[0]["content"]


# --- parse_llm_output / salvage ---------------------------------------------


def test_parse_keeps_valid_updates_and_drops_unknown_names() -> None:
    raw = json.dumps(
        {
            "reply": "Noted!",
            "selected_document": None,
            "updates": [
                {"name": "Provider", "value": "Acme"},
                {"name": "Not A Field", "value": "x"},
            ],
        }
    )
    result = doc_chat.parse_llm_output(raw, "csa")
    assert result.reply == "Noted!"
    assert doc_chat.to_wire_updates(result) == {"Provider": "Acme"}


def test_parse_validates_against_newly_selected_document() -> None:
    raw = json.dumps(
        {
            "reply": "A pilot it is — who's the provider?",
            "selected_document": "pilot-agreement",
            "updates": [{"name": "Pilot Period", "value": "60 days"}],
        }
    )
    result = doc_chat.parse_llm_output(raw, None)
    assert result.selected_document == "pilot-agreement"
    assert doc_chat.to_wire_updates(result) == {"Pilot Period": "60 days"}


def test_parse_drops_unknown_selected_document() -> None:
    raw = json.dumps({"reply": "ok", "selected_document": "lease", "updates": []})
    result = doc_chat.parse_llm_output(raw, None)
    assert result.selected_document is None


def test_duplicate_updates_last_wins_and_values_trimmed() -> None:
    raw = json.dumps(
        {
            "reply": "ok",
            "updates": [
                {"name": "Provider", "value": "First"},
                {"name": "Provider", "value": "  Second  "},
                {"name": "Customer", "value": "x" * 900},
            ],
        }
    )
    result = doc_chat.parse_llm_output(raw, "csa")
    updates = doc_chat.to_wire_updates(result)
    assert updates["Provider"] == "Second"
    assert len(updates["Customer"]) == doc_chat.MAX_VALUE_LENGTH


def test_non_json_falls_back() -> None:
    result = doc_chat.parse_llm_output("not json", "csa")
    assert result.reply == doc_chat.FALLBACK_REPLY
    assert result.updates == []


def test_missing_reply_falls_back_but_keeps_updates() -> None:
    raw = json.dumps({"updates": [{"name": "Provider", "value": "Acme"}]})
    result = doc_chat.parse_llm_output(raw, "csa")
    assert result.reply == doc_chat.FALLBACK_REPLY
    assert doc_chat.to_wire_updates(result) == {"Provider": "Acme"}


BAA_COMPLETE_FIELDS = {
    "Provider": "MedCloud Ltd",
    "Company": "St Mary's Health Partners",
    "BAA Effective Date": "2026-09-19",
    "Agreement": "the CSA dated January 5, 2027",
    "Limitations": "None",
    "Breach Notification Period": "5 business days",
}


def _turn(reply: str, updates: dict[str, str]) -> doc_chat.DocChatTurnResult:
    return doc_chat.DocChatTurnResult(
        reply=reply,
        updates=[
            doc_chat.DocFieldUpdate(name=n, value=v) for n, v in updates.items()
        ],
    )


def test_completion_override_replaces_missed_announcement() -> None:
    # The model extracted everything but asked about a field the BAA
    # doesn't have (observed live) — the backend substitutes the
    # deterministic ready-for-review announcement.
    result = doc_chat._apply_completion_override(
        _turn("Got it. What is the governing law?", BAA_COMPLETE_FIELDS),
        make_request(document_key="baa", fields={}),
    )
    assert "ready for review" in result.reply
    assert "not legal advice" in result.reply
    assert doc_chat.to_wire_updates(result) == BAA_COMPLETE_FIELDS


def test_completion_override_keeps_model_announcement() -> None:
    result = doc_chat._apply_completion_override(
        _turn("All set — your BAA is Ready for Review!", BAA_COMPLETE_FIELDS),
        make_request(document_key="baa", fields={}),
    )
    assert result.reply == "All set — your BAA is Ready for Review!"


def test_completion_override_does_not_repeat_after_completion() -> None:
    result = doc_chat._apply_completion_override(
        _turn("Updated the breach period.", {"Breach Notification Period": "3 days"}),
        make_request(document_key="baa", fields=BAA_COMPLETE_FIELDS),
    )
    assert result.reply == "Updated the breach period."


def test_completion_override_ignores_incomplete_documents() -> None:
    result = doc_chat._apply_completion_override(
        _turn("Who is the company?", {"Provider": "MedCloud Ltd"}),
        make_request(document_key="baa", fields={}),
    )
    assert result.reply == "Who is the company?"


def test_nda_key_hands_off_without_llm(monkeypatch) -> None:
    def _boom(**kwargs):
        raise AssertionError("completion must not be called for the NDA handoff")

    monkeypatch.setattr(doc_chat, "completion", _boom)
    result = doc_chat.run_chat_turn(make_request(document_key="mutual-nda"))
    assert result.selected_document == "mutual-nda"
    assert result.reply == doc_chat.NDA_HANDOFF_REPLY
