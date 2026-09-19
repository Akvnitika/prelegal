from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture()
def settings(tmp_path: Path) -> Settings:
    return Settings(
        database_path=str(tmp_path / "test.db"),
        static_dir=str(tmp_path / "static"),
        # Chat tests mock the LLM; a non-empty key just gets past the
        # fail-fast configuration check.
        openrouter_api_key="test-key",
        # Full-strength PBKDF2 would add ~0.3s to every signup fixture.
        pbkdf2_iterations=1000,
    )


@pytest.fixture()
def client(settings: Settings) -> Iterator[TestClient]:
    # Entering the context manager runs the lifespan, which recreates the DB.
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def signup_headers(
    client: TestClient, email: str = "tester@example.com"
) -> dict[str, str]:
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "password123", "name": "Tester"},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['token']}"}


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """Bearer headers for a freshly signed-up user."""
    return signup_headers(client)
