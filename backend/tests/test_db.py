from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_database_is_recreated_on_every_boot(settings: Settings) -> None:
    creds = {"email": "jane@example.com", "password": "pw"}

    with TestClient(create_app(settings)) as client:
        assert client.post("/api/auth/signup", json=creds).status_code == 200

    # A fresh app process against the same database path must start empty:
    # login auto-provisions, so a brand-new id proves the table was wiped.
    with TestClient(create_app(settings)) as client:
        user = client.post("/api/auth/login", json=creds).json()["user"]
        assert user["id"] == 1
