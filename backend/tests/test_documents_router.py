from fastapi.testclient import TestClient

from app.documents.registry import DOCUMENT_ORDER


def test_list_documents_returns_all_ten_in_order(client: TestClient) -> None:
    response = client.get("/api/documents")
    assert response.status_code == 200
    documents = response.json()["documents"]
    assert [d["key"] for d in documents] == list(DOCUMENT_ORDER)
    first_field = documents[0]["fields"][0]
    assert set(first_field) == {"name", "label", "hint", "group"}


def test_document_detail_includes_template_markdown(client: TestClient) -> None:
    response = client.get("/api/documents/csa")
    assert response.status_code == 200
    body = response.json()
    assert body["key"] == "csa"
    assert body["templateMarkdown"].startswith("# Cloud Service Agreement")
    assert any(f["name"] == "Governing Law" for f in body["fields"])


def test_unknown_document_is_404(client: TestClient) -> None:
    assert client.get("/api/documents/nope").status_code == 404
