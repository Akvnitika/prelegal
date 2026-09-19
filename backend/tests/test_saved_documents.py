"""CRUD for a user's saved documents, scoped strictly to the session user."""

from fastapi.testclient import TestClient

from tests.conftest import signup_headers

NDA_DOC = {
    "documentKey": "mutual-nda",
    "title": "Mutual NDA — Acme & Globex",
    "data": {"purpose": "Evaluating a partnership", "party1": {"company": "Acme"}},
}

CSA_DOC = {
    "documentKey": "csa",
    "title": "Cloud Service Agreement — Acme",
    "data": {"fields": {"Provider": "Acme"}, "transcript": []},
}


def test_create_and_get_roundtrip(client: TestClient, auth_headers) -> None:
    created = client.post(
        "/api/saved-documents", json=NDA_DOC, headers=auth_headers
    )
    assert created.status_code == 201
    body = created.json()
    assert body["documentKey"] == "mutual-nda"
    assert body["data"]["party1"]["company"] == "Acme"

    fetched = client.get(
        f"/api/saved-documents/{body['id']}", headers=auth_headers
    )
    assert fetched.status_code == 200
    assert fetched.json() == body


def test_updated_at_is_serialized_with_utc_offset(
    client: TestClient, auth_headers
) -> None:
    created = client.post(
        "/api/saved-documents", json=NDA_DOC, headers=auth_headers
    ).json()
    # Zoneless timestamps get parsed as LOCAL time by browsers; the wire
    # format must carry the UTC offset.
    assert created["updatedAt"].endswith("+00:00") or created[
        "updatedAt"
    ].endswith("Z")


def test_list_returns_summaries_without_data(
    client: TestClient, auth_headers
) -> None:
    client.post("/api/saved-documents", json=NDA_DOC, headers=auth_headers)
    client.post("/api/saved-documents", json=CSA_DOC, headers=auth_headers)

    response = client.get("/api/saved-documents", headers=auth_headers)
    assert response.status_code == 200
    documents = response.json()["documents"]
    assert len(documents) == 2
    for doc in documents:
        assert "data" not in doc
        assert set(doc) == {"id", "documentKey", "title", "updatedAt"}


def test_update_title_and_data(client: TestClient, auth_headers) -> None:
    doc_id = client.post(
        "/api/saved-documents", json=CSA_DOC, headers=auth_headers
    ).json()["id"]

    response = client.put(
        f"/api/saved-documents/{doc_id}",
        json={"data": {"fields": {"Provider": "Acme, Inc."}, "transcript": []}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["fields"]["Provider"] == "Acme, Inc."
    assert body["title"] == CSA_DOC["title"]  # untouched by partial update


def test_delete_removes_the_document(client: TestClient, auth_headers) -> None:
    doc_id = client.post(
        "/api/saved-documents", json=NDA_DOC, headers=auth_headers
    ).json()["id"]
    assert (
        client.delete(
            f"/api/saved-documents/{doc_id}", headers=auth_headers
        ).status_code
        == 204
    )
    assert (
        client.get(
            f"/api/saved-documents/{doc_id}", headers=auth_headers
        ).status_code
        == 404
    )


def test_other_users_documents_are_invisible(
    client: TestClient, auth_headers
) -> None:
    doc_id = client.post(
        "/api/saved-documents", json=NDA_DOC, headers=auth_headers
    ).json()["id"]

    other_headers = signup_headers(client, email="other@example.com")
    assert (
        client.get("/api/saved-documents", headers=other_headers).json()[
            "documents"
        ]
        == []
    )
    assert (
        client.get(
            f"/api/saved-documents/{doc_id}", headers=other_headers
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/saved-documents/{doc_id}", headers=other_headers
        ).status_code
        == 404
    )


def test_unknown_document_key_is_422(client: TestClient, auth_headers) -> None:
    bad = dict(NDA_DOC, documentKey="lease")
    response = client.post(
        "/api/saved-documents", json=bad, headers=auth_headers
    )
    assert response.status_code == 422


def test_requires_auth(client: TestClient) -> None:
    assert client.get("/api/saved-documents").status_code == 401
    assert client.post("/api/saved-documents", json=NDA_DOC).status_code == 401
