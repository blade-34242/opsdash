#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "[upload] $*"; }

VERSION_INPUT="${VERSION:-${1:-}}"
VERSION="${VERSION_INPUT#v}"
APP_NAME="${APP_NAME:-opsdash}"
RELEASE_TAG="${RELEASE_TAG:-v$VERSION}"
UPLOAD_FILE="${UPLOAD_FILE:-$ROOT_DIR/build/dist/$APP_NAME-$VERSION.tar.gz}"
SIGNED_MARKER="${SIGNED_MARKER:-$ROOT_DIR/build/$APP_NAME/appinfo/signature.json}"
UPLOAD_REPO="${UPLOAD_REPO:-${RELEASE_REPO:-${GITHUB_REPOSITORY:-}}}"
RELEASE_API_BASE_URL="${RELEASE_API_BASE_URL:-${GITHUB_API_URL:-https://api.github.com}}"
GITHUB_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-${FORGEJO_TOKEN:-}}}"

if [[ -z "$VERSION" ]]; then
  fail "VERSION is required (pass VERSION=x.y.z)"
fi

if [[ ! -f "$UPLOAD_FILE" ]]; then
  fail "Upload file not found: $UPLOAD_FILE"
fi

if [[ ! -f "$SIGNED_MARKER" ]]; then
  fail "Signed marker not found: $SIGNED_MARKER. Run 'make sign' first."
fi

if [[ -z "$RELEASE_TAG" ]]; then
  fail "RELEASE_TAG is required"
fi

if [[ -z "$UPLOAD_REPO" ]]; then
  remote_url="$(git remote get-url origin 2>/dev/null || true)"
  UPLOAD_REPO="$(printf '%s' "$remote_url" | sed -nE 's#.*[:/]([^/]+/[^/]+)(\.git)?$#\1#p')"
fi

UPLOAD_REPO="${UPLOAD_REPO%.git}"

if [[ -z "$UPLOAD_REPO" ]]; then
  fail "Unable to determine repository. Set UPLOAD_REPO=owner/name or configure origin."
fi

if [[ -z "$GITHUB_TOKEN" ]]; then
  fail "GITHUB_TOKEN, GH_TOKEN, or FORGEJO_TOKEN is required for release uploads"
fi

asset_name="$(basename "$UPLOAD_FILE")"
asset_name_q="$(jq -rn --arg value "$asset_name" '$value|@uri')"
api_base="${RELEASE_API_BASE_URL%/}/repos/$UPLOAD_REPO/releases"
tag_api_base="$api_base/tags/$RELEASE_TAG"
auth_header="Authorization: token $GITHUB_TOKEN"
accept_header="Accept: application/json"

release_json="$(curl -fsSL \
  -H "$auth_header" \
  -H "$accept_header" \
  "$tag_api_base" 2>/dev/null || true)"

if [[ -z "$release_json" ]]; then
  info "Creating release for tag $RELEASE_TAG"
  release_json="$(curl -fsSL \
    -X POST \
    -H "$auth_header" \
    -H "$accept_header" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg tag "$RELEASE_TAG" --arg name "$RELEASE_TAG" '{tag_name:$tag, name:$name, draft:false, prerelease:false}')" \
    "$api_base")"
fi

upload_api_base="$(printf '%s' "$release_json" | jq -r '.upload_url // empty' | sed 's/{?name,label}$//')"
release_id="$(printf '%s' "$release_json" | jq -r '.id // empty')"

if [[ -z "$upload_api_base" || "$upload_api_base" == "null" ]]; then
  fail "Unable to resolve upload URL for $UPLOAD_REPO release '$RELEASE_TAG'"
fi

existing_asset_id="$(curl -fsSL \
  -H "$auth_header" \
  -H "$accept_header" \
  "${RELEASE_API_BASE_URL%/}/repos/$UPLOAD_REPO/releases/$release_id/assets" \
  | jq -r --arg name "$asset_name" '.[] | select(.name == $name) | .id' | head -n 1)"

if [[ -n "$existing_asset_id" ]]; then
  info "Deleting existing asset $asset_name ($existing_asset_id)"
  curl -fsSL \
    -X DELETE \
    -H "$auth_header" \
    -H "$accept_header" \
    "${RELEASE_API_BASE_URL%/}/repos/$UPLOAD_REPO/releases/assets/$existing_asset_id" >/dev/null
fi

info "Uploading $UPLOAD_FILE to $UPLOAD_REPO release $RELEASE_TAG"
curl -fsSL \
  -X POST \
  -H "$auth_header" \
  -H "$accept_header" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$UPLOAD_FILE" \
  "$upload_api_base?name=$asset_name_q" >/dev/null

download_url="$(printf '%s' "$release_json" | jq -r --arg name "$asset_name" '.assets[]? | select(.name == $name) | .browser_download_url' | head -n 1)"

if [[ -z "$download_url" || "$download_url" == "null" ]]; then
  # Re-read the release after upload so Forgejo/GitHub can populate the asset URL.
  release_json="$(curl -fsSL \
    -H "$auth_header" \
    -H "$accept_header" \
    "$tag_api_base")"
  download_url="$(printf '%s' "$release_json" | jq -r --arg name "$asset_name" '.assets[]? | select(.name == $name) | .browser_download_url' | head -n 1)"
fi

if [[ -n "${GITHUB_OUTPUT:-}" && -n "$download_url" && "$download_url" != "null" ]]; then
  echo "download_url=$download_url" >> "$GITHUB_OUTPUT"
fi

info "Upload complete"
