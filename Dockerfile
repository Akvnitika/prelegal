# syntax=docker/dockerfile:1

# ---- Stage 1: static frontend export ----
FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# => /src/frontend/out/{index.html, nda/index.html, _next/**, 404.html}

# ---- Stage 2: backend dependencies (cached separately from source) ----
FROM python:3.12-slim AS backend-build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
# Use the image's Python so the venv survives the copy into the runtime
# stage (a uv-managed interpreter would live outside /app/backend).
ENV UV_PYTHON_DOWNLOADS=never
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/app ./app

# ---- Stage 3: runtime ----
FROM python:3.12-slim AS runtime
RUN useradd --create-home --uid 1000 appuser
WORKDIR /app/backend
COPY --from=backend-build /app/backend /app/backend
COPY --from=frontend-build /src/frontend/out /app/static
# Data files for upcoming AI-chat tickets; nothing reads them yet.
COPY templates/ /app/templates/
COPY catalog.json /app/catalog.json
ENV PATH="/app/backend/.venv/bin:${PATH}" \
    STATIC_DIR=/app/static \
    DATABASE_PATH=/app/data/prelegal.db \
    ENVIRONMENT=production
RUN mkdir -p /app/data && chown appuser:appuser /app/data
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD ["python", "-c", "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status == 200 else 1)"]
CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
