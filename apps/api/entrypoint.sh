#!/bin/sh
set -e
TSX=/app/node_modules/.bin/tsx
echo "[entrypoint] Running DB migrations..."
$TSX src/db/migrate.ts && echo "[entrypoint] Migrations done" || echo "[entrypoint] Migration skipped or failed (non-fatal)"
echo "[entrypoint] Starting API..."
exec $TSX src/index.ts
