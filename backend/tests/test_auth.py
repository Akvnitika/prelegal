"""The PL-5 login is deliberately fake: any credentials succeed and the
password is never verified. These tests pin that behaviour as intentional so
a change to it is a visible decision, not an accident."""

from fastapi.testclient import TestClient

CREDS = {"email": "jane@example.com", "password": "pw", "name": "Jane"}


def test_signup_creates_user(client: TestClient) -> None:
    response = client.post("/api/auth/signup", json=CREDS)
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["email"] == "jane@example.com"
    assert user["name"] == "Jane"
    assert isinstance(user["id"], int)
    assert "password" not in user


def test_signup_twice_returns_existing_user(client: TestClient) -> None:
    first = client.post("/api/auth/signup", json=CREDS).json()["user"]
    second = client.post("/api/auth/signup", json=CREDS).json()["user"]
    assert second["id"] == first["id"]


def test_login_accepts_any_password(client: TestClient) -> None:
    created = client.post("/api/auth/signup", json=CREDS).json()["user"]
    response = client.post(
        "/api/auth/login",
        json={"email": "jane@example.com", "password": "totally-wrong"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["id"] == created["id"]


def test_login_provisions_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"email": "new@example.com", "password": "pw"}
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "new@example.com"


def test_invalid_email_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup", json={"email": "not-an-email", "password": "pw"}
    )
    assert response.status_code == 422


def test_missing_fields_rejected(client: TestClient) -> None:
    response = client.post("/api/auth/signup", json={"email": "jane@example.com"})
    assert response.status_code == 422
