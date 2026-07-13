#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXPO_CLEAR_CACHE="${EXPO_CLEAR_CACHE:-1}"

source_if_exists() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

source_if_exists "$ROOT_DIR/.env.infrastructure.local"
source_if_exists "$ROOT_DIR/.env.local"

API_PORT="${API_PORT:-${PORT:-3010}}"
export EXPO_PUBLIC_API_PORT="${EXPO_PUBLIC_API_PORT:-$API_PORT}"

cd "$ROOT_DIR/apps/mobile"

if [ -n "${EXPO_PUBLIC_API_BASE_URL:-}" ]; then
  echo "Starting Expo server with EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL"
else
  echo "Starting Expo server with EXPO_PUBLIC_API_PORT=$EXPO_PUBLIC_API_PORT (host auto-resolves in app)"
fi
if [ "$EXPO_CLEAR_CACHE" = "1" ]; then
  exec pnpm exec expo start -c
fi

exec pnpm exec expo start
