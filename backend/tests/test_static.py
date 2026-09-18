from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture()
def static_client(settings: Settings) -> TestClient:
    # Synthetic Next.js export layout, so this test needs no real build.
    static = Path(settings.static_dir)
    (static / "nda").mkdir(parents=True)
    (static / "index.html").write_text("<h1>login</h1>")
    (static / "nda" / "index.html").write_text("<h1>nda creator</h1>")
    (static / "404.html").write_text("<h1>not found</h1>")
    with TestClient(create_app(settings), raise_server_exceptions=False) as client:
        return client


def test_root_serves_login_page(static_client: TestClient) -> None:
    response = static_client.get("/")
    assert response.status_code == 200
    assert "login" in response.text


def test_nda_route_serves_creator_page(static_client: TestClient) -> None:
    response = static_client.get("/nda/")
    assert response.status_code == 200
    assert "nda creator" in response.text


def test_static_mount_does_not_shadow_api_routes(static_client: TestClient) -> None:
    assert static_client.get("/api/health").status_code == 200


def test_unknown_path_returns_404_page(static_client: TestClient) -> None:
    response = static_client.get("/does-not-exist")
    assert response.status_code == 404
    assert "not found" in response.text


def test_app_starts_without_static_dir(client: TestClient) -> None:
    # Local backend-only development has no frontend build; the API must
    # still work and / just 404s.
    assert client.get("/api/health").status_code == 200
    assert client.get("/").status_code == 404
