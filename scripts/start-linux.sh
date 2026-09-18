#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR/.."

CONTAINER_NAME="prelegal"
IMAGE_NAME="prelegal:latest"
PORT="8000"

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then cp .env.example .env; else touch .env; fi
  echo "No .env found; created a placeholder. Add real API keys for AI features."
fi

docker build -t "$IMAGE_NAME" .
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" --env-file .env -p "${PORT}:8000" "$IMAGE_NAME" >/dev/null

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo "prelegal is running at http://localhost:${PORT}"
    exit 0
  fi
  sleep 1
done
echo "Health check did not pass within 30s. Check 'docker logs ${CONTAINER_NAME}'." >&2
exit 1
