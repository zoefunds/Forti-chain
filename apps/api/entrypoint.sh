#!/bin/sh
set -e
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
echo "[entrypoint] Starting API..."
exec /app/node_modules/.bin/tsx src/index.ts
