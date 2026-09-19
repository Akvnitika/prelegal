"""Integration tests for POST /api/chat with the LLM fully mocked.

GOLDEN_REQUEST / GOLDEN_RESPONSE are the cross-stack contract fixtures:
frontend/tests/lib/chat.test.ts asserts the same JSON, so a shape or casing
change on either side fails that side's suite."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services import nda_chat
from tests.test_nda_chat_service import DEFAULT_NDA

GOLDEN_REQUEST = {
    "transcript": [
        {"role": "assistant", "content": "Which two companies are entering into this agreement?"},
        {"role": "user", "content": "Acme, Inc. and Globex Corporation. Delaware law."},
    ],
    "ndaData": DEFAULT_NDA,
    "today": "2026-09-18",
}

GOLDEN_LLM_OUTPUT = json.dumps(
    {
        "reply": "Great — Acme and Globex it is, governed by Delaware law. Who signs for Acme?",
        "updates": {
            "governing_law": "Delaware",
            "party1": {"company": "Acme, Inc."},
            "party2": {"company": "Globex Corporation"},
        },
    }
)

GOLDEN_RESPONSE = {
    "reply": "Great — Acme and Globex it is, governed by Delaware law. Who signs for Acme?",
    "updates": {
        "governingLaw": "Delaware",
        "party1": {"company": "Acme, Inc."},
        "party2": {"company": "Globex Corporation"},
    },
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
    monkeypatch.setattr(nda_chat, "completion", stub)
    return stub


def test_chat_golden_contract(client: TestClient, mock_llm) -> None:
    response = client.post("/api/chat", json=GOLDEN_REQUEST)
    assert response.status_code == 200
    assert response.json() == GOLDEN_RESPONSE


def test_chat_calls_llm_per_cerebras_skill(client: TestClient, mock_llm) -> None:
    client.post("/api/chat", json=GOLDEN_REQUEST)
    assert len(mock_llm.calls) == 1
    kwargs = mock_llm.calls[0]
    assert kwargs["model"] == "openrouter/openai/gpt-oss-120b"
    assert kwargs["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert kwargs["reasoning_effort"] == "low"
    assert kwargs["response_format"] is nda_chat.ChatTurnResult
    assert kwargs["messages"][0]["role"] == "system"


def test_chat_without_api_key_returns_503(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    stub = llm_stub(GOLDEN_LLM_OUTPUT)
    monkeypatch.setattr(nda_chat, "completion", stub)
    settings = Settings(
        database_path=str(tmp_path / "test.db"),
        static_dir=str(tmp_path / "static"),
        openrouter_api_key="",
    )
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/chat", json=GOLDEN_REQUEST)
    assert response.status_code == 503
    assert stub.calls == []


def test_chat_llm_failure_returns_502(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        nda_chat, "completion", llm_stub("", error=RuntimeError("provider down"))
    )
    response = client.post("/api/chat", json=GOLDEN_REQUEST)
    assert response.status_code == 502


def test_chat_malformed_llm_output_still_succeeds(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(nda_chat, "completion", llm_stub("not json at all"))
    response = client.post("/api/chat", json=GOLDEN_REQUEST)
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == nda_chat.FALLBACK_REPLY
    assert body["updates"] == {}


def test_chat_rejects_invalid_nda_data(client: TestClient, mock_llm) -> None:
    bad = json.loads(json.dumps(GOLDEN_REQUEST))
    bad["ndaData"]["mndaTermYears"] = 0
    response = client.post("/api/chat", json=bad)
    assert response.status_code == 422
    assert mock_llm.calls == []


def test_chat_rejects_bad_today(client: TestClient, mock_llm) -> None:
    bad = json.loads(json.dumps(GOLDEN_REQUEST))
    bad["today"] = "September 18"
    response = client.post("/api/chat", json=bad)
    assert response.status_code == 422
