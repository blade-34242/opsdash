#!/usr/bin/env bash
set -euo pipefail

# Seeds deterministic Deck data by calling Nextcloud's OCC commands inside
# a running container. This mirrors the calendar seed flow and avoids the
# brittle HTTP-based seeding that CI previously used.

CONTAINER="${NEXTCLOUD_CONTAINER:-nc31-dev}"
BOARD_TITLE="${QA_DECK_BOARD_TITLE:-Opsdash Deck QA}"
BOARD_COLOR="${QA_DECK_BOARD_COLOR:-#2563EB}"
KEEP_STACKS="${QA_DECK_KEEP_STACKS:-}"
APP_PATH="${APP_PATH:-}"

if [[ $# -gt 0 ]]; then
  USERS=("$@")
else
  USERS=("admin" "qa")
fi

fail() {
  echo "[deck-seed] error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command \"$1\""
}

require_cmd docker

# Ensure target container exists and is running.
if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
  fail "container \"$CONTAINER\" is not running (override via NEXTCLOUD_CONTAINER)"
fi

run_occ() {
  docker exec "$CONTAINER" php occ "$@"
}

resolve_app_path() {
  if [[ -n "$APP_PATH" ]]; then
    if docker exec "$CONTAINER" test -f "$APP_PATH/tools/seed_deck_boards.php"; then
      printf '%s\n' "$APP_PATH"
      return 0
    fi
    fail "APP_PATH \"$APP_PATH\" does not contain tools/seed_deck_boards.php"
  fi

  local candidate
  for candidate in \
    /var/www/html/apps/opsdash \
    /var/www/html/apps-extra/opsdash \
    /var/www/html/apps-writable/opsdash
  do
    if docker exec "$CONTAINER" test -f "$candidate/tools/seed_deck_boards.php"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  fail "unable to resolve Opsdash app path inside container; set APP_PATH explicitly"
}

run_seed() {
  local user="$1"
  local app_path="$2"
  local envs=(-e "QA_USER=${user}" -e "QA_DECK_BOARD_TITLE=${BOARD_TITLE}" -e "QA_DECK_BOARD_COLOR=${BOARD_COLOR}")
  if [[ -n "$KEEP_STACKS" ]]; then
    envs+=(-e "QA_DECK_KEEP_STACKS=${KEEP_STACKS}")
  fi
  docker exec "${envs[@]}" "$CONTAINER" php "$app_path/tools/seed_deck_boards.php"
}

echo "[deck-seed] enabling deck + opsdash apps inside ${CONTAINER}..."
run_occ app:enable deck >/dev/null 2>&1 || true
run_occ app:enable opsdash >/dev/null 2>&1 || true

APP_PATH_RESOLVED="$(resolve_app_path)"
echo "[deck-seed] using app path ${APP_PATH_RESOLVED}"

echo "[deck-seed] seeding Deck boards via PHP helper (container=${CONTAINER})"
for user in "${USERS[@]}"; do
  echo "[deck-seed] -> user=${user}"
  run_seed "$user" "$APP_PATH_RESOLVED"
done

echo "[deck-seed] done."
