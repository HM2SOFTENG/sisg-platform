#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXPO_CLEAR_CACHE="${EXPO_CLEAR_CACHE:-1}"
IOS_API_HOST="${IOS_API_HOST:-localhost}"
SKIP_API="${SKIP_API:-0}"
API_WAIT_SECONDS="${API_WAIT_SECONDS:-90}"
API_PID=""

source_if_exists() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

cleanup() {
  if [ -n "$API_PID" ] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}

wait_for_api() {
  local health_url="$1"
  local waited=0

  until curl --silent --fail "$health_url" >/dev/null 2>&1; do
    if [ "$waited" -ge "$API_WAIT_SECONDS" ]; then
      echo "SISG API did not become healthy at $health_url within $API_WAIT_SECONDS seconds." >&2
      return 1
    fi

    sleep 1
    waited=$((waited + 1))
  done
}

source_if_exists "$ROOT_DIR/.env.infrastructure.local"
source_if_exists "$ROOT_DIR/.env.local"

API_PORT="${API_PORT:-${PORT:-3010}}"
API_BASE_URL="http://$IOS_API_HOST:$API_PORT"
HEALTH_URL="$API_BASE_URL/api/health"

export EXPO_PUBLIC_API_PORT="${EXPO_PUBLIC_API_PORT:-$API_PORT}"
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-$API_BASE_URL}"

trap cleanup EXIT INT TERM

if [ "$SKIP_API" != "1" ]; then
  if curl --silent --fail "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Using existing SISG API at $API_BASE_URL"
  else
    echo "Starting SISG API for iOS Simulator at $API_BASE_URL"
    (
      cd "$ROOT_DIR"
      ./scripts/run-local-api.sh
    ) &
    API_PID="$!"
    wait_for_api "$HEALTH_URL"
  fi
fi

open -a Simulator >/dev/null 2>&1 || true

cd "$ROOT_DIR/apps/mobile"

echo "Starting Expo for iOS Simulator with EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL"

if [ "$EXPO_CLEAR_CACHE" = "1" ]; then
  exec pnpm exec expo start --ios -c
fi

exec pnpm exec expo start --ios
