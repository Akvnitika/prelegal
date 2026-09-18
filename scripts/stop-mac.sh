#!/usr/bin/env bash
set -euo pipefail
CONTAINER_NAME="prelegal"

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker rm -f "$CONTAINER_NAME" >/dev/null
  echo "prelegal stopped."
else
  echo "prelegal is not running."
fi
