#!/usr/bin/env bash
# generate-types.sh — regenerate OpenAPI frontend types from live backend
# Usage: ./scripts/generate-types.sh
# Requires: backend running on localhost:8000

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
OPENAPI_URL="${BACKEND_URL}/api/openapi.json"
OUTPUT="frontend/src/types/api.types.ts"

echo "→ Waiting for backend at ${BACKEND_URL}..."
for i in $(seq 1 10); do
  if curl -sf "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo "  Backend ready."
    break
  fi
  echo "  Attempt $i/10 — retrying in 2s..."
  sleep 2
done

echo "→ Generating types from ${OPENAPI_URL}..."
cd frontend
npx openapi-typescript "${OPENAPI_URL}" -o "src/types/api.types.ts"
echo "✓ Types written to ${OUTPUT}"
