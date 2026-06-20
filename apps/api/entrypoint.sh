#!/bin/sh
set -e
echo "[entrypoint] Running DB migrations..."
/app/node_modules/.bin/tsx src/db/migrate.ts && echo "[entrypoint] Migrations done" || echo "[entrypoint] Migration skipped (non-fatal)"
echo "[entrypoint] Starting API..."
exec /app/node_modules/.bin/tsx src/index.ts
