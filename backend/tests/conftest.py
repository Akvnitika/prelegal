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
    )


@pytest.fixture()
def client(settings: Settings) -> Iterator[TestClient]:
    # Entering the context manager runs the lifespan, which recreates the DB.
    with TestClient(create_app(settings)) as test_client:
        yield test_client
