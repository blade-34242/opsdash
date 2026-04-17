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
UPLOAD_REPO="${UPLOAD_REPO:-${GITHUB_REPOSITORY:-}}"
GITHUB_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

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
  UPLOAD_REPO="$(printf '%s' "$remote_url" | sed -nE 's#.*github\.com[:/]([^/]+/[^/]+)(\.git)?$#\1#p')"
fi

UPLOAD_REPO="${UPLOAD_REPO%.git}"

if [[ -z "$UPLOAD_REPO" ]]; then
  fail "Unable to determine GitHub repo. Set UPLOAD_REPO=owner/name or configure origin."
fi

if [[ -z "$GITHUB_TOKEN" ]]; then
  fail "GITHUB_TOKEN or GH_TOKEN is required for GitHub release uploads"
fi

asset_name="$(basename "$UPLOAD_FILE")"
asset_name_q="$(jq -rn --arg value "$asset_name" '$value|@uri')"
api_base="https://api.github.com/repos/$UPLOAD_REPO/releases/tags/$RELEASE_TAG"
upload_api_base="$(curl -fsSL \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "$api_base" | jq -r '.upload_url' | sed 's/{?name,label}$//')"
release_id="$(curl -fsSL \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "$api_base" | jq -r '.id')"

if [[ -z "$upload_api_base" || "$upload_api_base" == "null" ]]; then
  fail "Unable to resolve upload URL for $UPLOAD_REPO release '$RELEASE_TAG'"
fi

existing_asset_id="$(curl -fsSL \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$UPLOAD_REPO/releases/$release_id/assets" \
  | jq -r --arg name "$asset_name" '.[] | select(.name == $name) | .id' | head -n 1)"

if [[ -n "$existing_asset_id" ]]; then
  info "Deleting existing asset $asset_name ($existing_asset_id)"
  curl -fsSL \
    -X DELETE \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$UPLOAD_REPO/releases/assets/$existing_asset_id" >/dev/null
fi

info "Uploading $UPLOAD_FILE to $UPLOAD_REPO release $RELEASE_TAG"
curl -fsSL \
  -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$UPLOAD_FILE" \
  "$upload_api_base?name=$asset_name_q" >/dev/null

info "Upload complete"
