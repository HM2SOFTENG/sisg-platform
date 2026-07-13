#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

source_if_exists() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

PORT_WAS_SET=0
ADMIN_PIN_WAS_SET=0
CORS_ORIGIN_WAS_SET=0
DB_PROVIDER_WAS_SET=0

if [ "${PORT+x}" = "x" ]; then
  PORT_WAS_SET=1
  EXPLICIT_PORT="$PORT"
fi

if [ "${ADMIN_PIN+x}" = "x" ]; then
  ADMIN_PIN_WAS_SET=1
  EXPLICIT_ADMIN_PIN="$ADMIN_PIN"
fi

if [ "${CORS_ORIGIN+x}" = "x" ]; then
  CORS_ORIGIN_WAS_SET=1
  EXPLICIT_CORS_ORIGIN="$CORS_ORIGIN"
fi

if [ "${DB_PROVIDER+x}" = "x" ]; then
  DB_PROVIDER_WAS_SET=1
  EXPLICIT_DB_PROVIDER="$DB_PROVIDER"
fi

source_if_exists "$ROOT_DIR/.env.infrastructure.local"
source_if_exists "$ROOT_DIR/.env.local"

if [ "$PORT_WAS_SET" = "1" ]; then
  PORT="$EXPLICIT_PORT"
fi

if [ "$ADMIN_PIN_WAS_SET" = "1" ]; then
  ADMIN_PIN="$EXPLICIT_ADMIN_PIN"
fi

if [ "$CORS_ORIGIN_WAS_SET" = "1" ]; then
  CORS_ORIGIN="$EXPLICIT_CORS_ORIGIN"
fi

PORT="${PORT:-3010}"
ADMIN_PIN="${ADMIN_PIN:-local-dev-pin}"
CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:8081}"
if [ "$DB_PROVIDER_WAS_SET" = "1" ]; then
  DB_PROVIDER="$EXPLICIT_DB_PROVIDER"
else
  DB_PROVIDER="file"
fi

cd "$ROOT_DIR"

echo "Building SISG web + API bundles..."
pnpm build

echo "Starting SISG API on http://localhost:$PORT (DB_PROVIDER=$DB_PROVIDER)"
exec env PORT="$PORT" ADMIN_PIN="$ADMIN_PIN" CORS_ORIGIN="$CORS_ORIGIN" DB_PROVIDER="$DB_PROVIDER" pnpm start:local
