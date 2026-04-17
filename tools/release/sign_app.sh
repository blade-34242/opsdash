#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "[sign] $*"; }

VERSION_INPUT="${VERSION:-${1:-}}"
VERSION="${VERSION_INPUT#v}"
APP_NAME="${APP_NAME:-opsdash}"
SIGN_SERVICE="${SIGN_SERVICE:-nextcloud32}"
SIGN_CONTAINER="${SIGN_CONTAINER:-}"
SIGN_PRIVATE_KEY_FILE="${SIGN_PRIVATE_KEY_FILE:-}"
SIGN_CERT_FILE="${SIGN_CERT_FILE:-}"
BUILD_APP_DIR="${BUILD_APP_DIR:-$ROOT_DIR/build/$APP_NAME}"
DIST_DIR="${DIST_DIR:-$ROOT_DIR/build/dist}"
DIST_TARBALL="$DIST_DIR/$APP_NAME-$VERSION.tar.gz"

if [[ -z "$VERSION" ]]; then
  fail "VERSION is required (pass VERSION=x.y.z)"
fi

if [[ ! -d "$BUILD_APP_DIR" ]]; then
  fail "Missing build directory: $BUILD_APP_DIR. Run 'make appstore VERSION=$VERSION' first."
fi

if [[ -z "$SIGN_PRIVATE_KEY_FILE" || -z "$SIGN_CERT_FILE" ]]; then
  fail "SIGN_PRIVATE_KEY_FILE and SIGN_CERT_FILE are required."
fi

if [[ ! -f "$SIGN_PRIVATE_KEY_FILE" ]]; then
  fail "Private key file not found: $SIGN_PRIVATE_KEY_FILE"
fi

if [[ ! -f "$SIGN_CERT_FILE" ]]; then
  fail "Certificate file not found: $SIGN_CERT_FILE"
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "docker is required"
fi

container_id=""
if [[ -n "$SIGN_CONTAINER" ]]; then
  container_id="$SIGN_CONTAINER"
else
  container_id="$(docker compose ps -q "$SIGN_SERVICE" 2>/dev/null || true)"
  if [[ -z "$container_id" ]]; then
    container_id="$(docker ps -q --filter "name=^/${SIGN_SERVICE}$" | head -n 1 || true)"
  fi
fi

if [[ -z "$container_id" ]]; then
  fail "Unable to find a running container for SIGN_SERVICE='$SIGN_SERVICE'. Pass SIGN_CONTAINER=<container-name> if you want to use a direct container name."
fi

if ! docker inspect "$container_id" >/dev/null 2>&1; then
  fail "Container not found or not inspectable: $container_id"
fi

image_name="$(docker inspect -f '{{.Config.Image}}' "$container_id")"
if [[ -z "$image_name" ]]; then
  fail "Unable to resolve container image for '$container_id'"
fi

info "Using container $container_id ($image_name)"
info "Signing build tree $BUILD_APP_DIR"

container_staging_dir="/var/www/html/apps-extra/.release-signing/$APP_NAME"
container_key="$container_staging_dir/$APP_NAME.key"
container_crt="$container_staging_dir/$APP_NAME.crt"
container_app_dir="$container_staging_dir/app"

docker exec "$container_id" sh -lc "rm -rf '$container_staging_dir' && mkdir -p '$container_staging_dir'"
docker cp "$SIGN_PRIVATE_KEY_FILE" "$container_id:$container_key"
docker cp "$SIGN_CERT_FILE" "$container_id:$container_crt"
docker cp "$BUILD_APP_DIR" "$container_id:$container_app_dir"
docker exec "$container_id" sh -lc "chown -R www-data:www-data '$container_app_dir' && chown www-data:www-data '$container_key' '$container_crt' && chmod 0640 '$container_key' '$container_crt'"

cleanup() {
  docker exec "$container_id" sh -lc "rm -rf '$container_staging_dir'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

  docker exec "$container_id" php /var/www/html/occ integrity:sign-app \
  --privateKey="$container_key" \
  --certificate="$container_crt" \
  --path="$container_app_dir"

docker cp "$container_id:$container_app_dir/appinfo/signature.json" "$BUILD_APP_DIR/appinfo/signature.json"

if [[ ! -f "$BUILD_APP_DIR/appinfo/signature.json" ]]; then
  fail "Signing completed but appinfo/signature.json is still missing in $BUILD_APP_DIR"
fi

mkdir -p "$DIST_DIR"
rm -f "$DIST_TARBALL"
tar -czf "$DIST_TARBALL" -C "$ROOT_DIR/build" "$APP_NAME"

info "Signed package ready: $DIST_TARBALL"
