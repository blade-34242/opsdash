#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "[appstore] $*"; }

VERSION_INPUT="${VERSION:-${1:-}}"
VERSION="${VERSION_INPUT#v}"
APP_NAME="${APP_NAME:-opsdash}"
RELEASE_TAG="${RELEASE_TAG:-v$VERSION}"
UPLOAD_FILE="${UPLOAD_FILE:-$ROOT_DIR/build/dist/$APP_NAME-$VERSION.tar.gz}"
SIGNED_MARKER="${SIGNED_MARKER:-$ROOT_DIR/build/$APP_NAME/appinfo/signature.json}"
APPSTORE_TOKEN="${APPSTORE_TOKEN:-}"
DOWNLOAD_URL="${DOWNLOAD_URL:-}"
APPSTORE_URL="${APPSTORE_URL:-https://apps.nextcloud.com/api/v1}"
APPSTORE_NIGHTLY="${APPSTORE_NIGHTLY:-false}"
APPSTORE_DRY_RUN="${APPSTORE_DRY_RUN:-false}"
RELEASE_REPO="${RELEASE_REPO:-${GITHUB_REPOSITORY:-}}"
RELEASE_API_BASE_URL="${RELEASE_API_BASE_URL:-${GITHUB_API_URL:-https://api.github.com}}"
GITHUB_TOKEN_VALUE="${GITHUB_TOKEN:-${GH_TOKEN:-${FORGEJO_TOKEN:-}}}"
APP_PRIVATE_KEY_FILE="${APP_PRIVATE_KEY_FILE:-${SIGN_PRIVATE_KEY_FILE:-}}"

if [[ -z "$VERSION" ]]; then
  fail "VERSION is required (pass VERSION=x.y.z)"
fi

if [[ ! -f "$UPLOAD_FILE" ]]; then
  fail "Upload file not found: $UPLOAD_FILE"
fi

if [[ ! -f "$SIGNED_MARKER" ]]; then
  fail "Signed marker not found: $SIGNED_MARKER. Run 'make sign' first."
fi

if [[ -z "$APP_PRIVATE_KEY_FILE" ]]; then
  fail "APP_PRIVATE_KEY_FILE or SIGN_PRIVATE_KEY_FILE is required"
fi

if [[ ! -f "$APP_PRIVATE_KEY_FILE" ]]; then
  fail "Private key file not found: $APP_PRIVATE_KEY_FILE"
fi

if [[ "$APPSTORE_DRY_RUN" != "true" && "$APPSTORE_DRY_RUN" != "1" && -z "$APPSTORE_TOKEN" ]]; then
  fail "APPSTORE_TOKEN is required"
fi

if [[ -z "$DOWNLOAD_URL" ]]; then
  if [[ -n "$RELEASE_REPO" ]]; then
    release_api="${RELEASE_API_BASE_URL%/}/repos/$RELEASE_REPO/releases/tags/$RELEASE_TAG"
    auth_args=()
    if [[ -n "$GITHUB_TOKEN_VALUE" ]]; then
      auth_args+=(-H "Authorization: token $GITHUB_TOKEN_VALUE")
    fi

    release_json="$(curl -fsSL "${auth_args[@]}" -H 'Accept: application/json' "$release_api")"
    asset_name="$(basename "$UPLOAD_FILE")"
    DOWNLOAD_URL="$(printf '%s' "$release_json" | jq -r --arg name "$asset_name" '.assets[] | select(.name == $name) | .browser_download_url' | head -n 1)"
  else
    remote_url="$(git remote get-url origin 2>/dev/null || true)"
    RELEASE_REPO="$(printf '%s' "$remote_url" | sed -nE 's#.*[:/]([^/]+/[^/]+)(\.git)?$#\1#p')"
    RELEASE_REPO="${RELEASE_REPO%.git}"
    if [[ -n "$RELEASE_REPO" ]]; then
      release_api="${RELEASE_API_BASE_URL%/}/repos/$RELEASE_REPO/releases/tags/$RELEASE_TAG"
      auth_args=()
      if [[ -n "$GITHUB_TOKEN_VALUE" ]]; then
        auth_args+=(-H "Authorization: token $GITHUB_TOKEN_VALUE")
      fi

      release_json="$(curl -fsSL "${auth_args[@]}" -H 'Accept: application/json' "$release_api")"
      asset_name="$(basename "$UPLOAD_FILE")"
      DOWNLOAD_URL="$(printf '%s' "$release_json" | jq -r --arg name "$asset_name" '.assets[] | select(.name == $name) | .browser_download_url' | head -n 1)"
    fi
  fi
fi

if [[ -z "$DOWNLOAD_URL" || "$DOWNLOAD_URL" == "null" ]]; then
  fail "Unable to determine DOWNLOAD_URL. Set DOWNLOAD_URL explicitly or expose RELEASE_REPO and the release asset."
fi

if [[ "$DOWNLOAD_URL" != https://* ]]; then
  fail "DOWNLOAD_URL must use https://"
fi

signature="$(openssl dgst -sha512 -sign "$APP_PRIVATE_KEY_FILE" "$UPLOAD_FILE" | openssl base64 -A)"
if [[ -z "$signature" ]]; then
  fail "Failed to compute release signature"
fi

payload="$(jq -n \
  --arg download "$DOWNLOAD_URL" \
  --arg signature "$signature" \
  --argjson nightly "$APPSTORE_NIGHTLY" \
  '{download:$download, signature:$signature, nightly:$nightly}')"

info "Publishing $UPLOAD_FILE to App Store"
if [[ "$APPSTORE_DRY_RUN" == "true" || "$APPSTORE_DRY_RUN" == "1" ]]; then
  printf '%s\n' "$payload"
  info "Dry run complete"
  exit 0
fi

curl -fsSL \
  -X POST \
  "$APPSTORE_URL/apps/releases" \
  -H "Authorization: Token $APPSTORE_TOKEN" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d "$payload" >/dev/null

info "App Store publish complete"
