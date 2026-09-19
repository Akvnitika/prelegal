from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_database_is_recreated_on_every_boot(settings: Settings) -> None:
    creds = {"email": "jane@example.com", "password": "password123"}

    with TestClient(create_app(settings)) as client:
        assert client.post("/api/auth/signup", json=creds).status_code == 200

    # A fresh app process against the same database path must start empty:
    # the same email signs up again without a 409 and gets id 1 back,
    # proving the users table was wiped.
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/auth/signup", json=creds)
        assert response.status_code == 200
        assert response.json()["user"]["id"] == 1
