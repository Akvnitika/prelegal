"""Access to the repo-level data files (templates/, catalog.json).

Locally the backend runs from backend/ with the data one level up; in Docker
the Dockerfile copies them next to /app/backend (WORKDIR /app/backend), so
"one directory above the app package's parent" resolves correctly in both.
"""

import json
from functools import lru_cache
from pathlib import Path

# .../repo-root locally, /app in Docker: parents[0]=app, [1]=backend|/app/backend -> [2]
_DATA_ROOT = Path(__file__).resolve().parents[2]

TEMPLATES_DIR = _DATA_ROOT / "templates"
CATALOG_PATH = _DATA_ROOT / "catalog.json"


@lru_cache
def read_template(filename: str) -> str:
    return (TEMPLATES_DIR / filename).read_text(encoding="utf-8")


@lru_cache
def read_catalog() -> list[dict[str, str]]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))["templates"]
