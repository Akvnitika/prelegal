"""Integration tests for POST /api/doc-chat with the LLM fully mocked.

GOLDEN_DOC_REQUEST / GOLDEN_DOC_RESPONSE are cross-stack contract fixtures:
frontend/tests/lib/doc-chat.test.ts asserts the same JSON."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services import chat_common, doc_chat

GOLDEN_DOC_REQUEST = {
    "transcript": [
        {"role": "assistant", "content": "What document do you need?"},
        {"role": "user", "content": "A cloud subscription contract for our SaaS."},
    ],
    "documentKey": None,
    "fields": {},
    "today": "2026-09-19",
}

GOLDEN_LLM_OUTPUT = json.dumps(
    {
        "reply": "A Cloud Service Agreement fits — shall we start with your company's legal name?",
        "selected_document": "csa",
        "updates": [],
    }
)

GOLDEN_DOC_RESPONSE = {
    "reply": "A Cloud Service Agreement fits — shall we start with your company's legal name?",
    "selectedDocument": "csa",
    "updates": {},
}


def llm_stub(content: str, error: Exception | None = None):
    calls: list[dict] = []

    def _stub(**kwargs):
        calls.append(kwargs)
        if error is not None:
            raise error
        message = SimpleNamespace(content=content)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    _stub.calls = calls
    return _stub


@pytest.fixture()
def mock_llm(monkeypatch: pytest.MonkeyPatch):
    stub = llm_stub(GOLDEN_LLM_OUTPUT)
    monkeypatch.setattr(doc_chat, "completion", stub)
    return stub


def test_selection_turn_golden_contract(client: TestClient, mock_llm) -> None:
    response = client.post("/api/doc-chat", json=GOLDEN_DOC_REQUEST)
    assert response.status_code == 200
    assert response.json() == GOLDEN_DOC_RESPONSE


def test_doc_chat_calls_llm_per_cerebras_skill(client: TestClient, mock_llm) -> None:
    client.post("/api/doc-chat", json=GOLDEN_DOC_REQUEST)
    kwargs = mock_llm.calls[0]
    assert kwargs["model"] == chat_common.MODEL
    assert kwargs["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert kwargs["reasoning_effort"] == "low"
    assert kwargs["response_format"] is doc_chat.DocChatTurnResult


def test_filling_turn_returns_updates_dict(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    stub = llm_stub(
        json.dumps(
            {
                "reply": "Noted — and who is the customer?",
                "selected_document": None,
                "updates": [{"name": "Provider", "value": "Acme, Inc."}],
            }
        )
    )
    monkeypatch.setattr(doc_chat, "completion", stub)
    response = client.post(
        "/api/doc-chat",
        json={
            "transcript": [{"role": "user", "content": "We're Acme Inc"}],
            "documentKey": "csa",
            "fields": {},
            "today": "2026-09-19",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["updates"] == {"Provider": "Acme, Inc."}
    assert "selectedDocument" not in body


def test_nda_pick_never_calls_llm(client: TestClient, mock_llm) -> None:
    response = client.post(
        "/api/doc-chat",
        json={
            "transcript": [{"role": "user", "content": "Just a mutual NDA"}],
            "documentKey": "mutual-nda",
            "fields": {},
            "today": "2026-09-19",
        },
    )
    assert response.status_code == 200
    assert response.json()["selectedDocument"] == "mutual-nda"
    assert mock_llm.calls == []


def test_unknown_document_key_is_422(client: TestClient, mock_llm) -> None:
    request = dict(GOLDEN_DOC_REQUEST, documentKey="lease")
    assert client.post("/api/doc-chat", json=request).status_code == 422
    assert mock_llm.calls == []


def test_without_api_key_returns_503(tmp_path, monkeypatch) -> None:
    stub = llm_stub(GOLDEN_LLM_OUTPUT)
    monkeypatch.setattr(doc_chat, "completion", stub)
    settings = Settings(
        database_path=str(tmp_path / "test.db"),
        static_dir=str(tmp_path / "static"),
        openrouter_api_key="",
    )
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/doc-chat", json=GOLDEN_DOC_REQUEST)
    assert response.status_code == 503
    assert stub.calls == []


def test_llm_failure_returns_502(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        doc_chat, "completion", llm_stub("", error=RuntimeError("down"))
    )
    assert client.post("/api/doc-chat", json=GOLDEN_DOC_REQUEST).status_code == 502


def test_malformed_llm_output_still_succeeds(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(doc_chat, "completion", llm_stub("garbage"))
    response = client.post("/api/doc-chat", json=GOLDEN_DOC_REQUEST)
    assert response.status_code == 200
    assert response.json()["reply"] == doc_chat.FALLBACK_REPLY
