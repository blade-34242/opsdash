#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION_INPUT="${1:-}"
if [[ -z "$VERSION_INPUT" ]]; then
  echo "Usage: bash tools/release/bump_version.sh <x.y.z>" >&2
  exit 1
fi

VERSION="${VERSION_INPUT#v}"
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "[version-bump] Invalid version '$VERSION_INPUT'. Expected x.y.z." >&2
  exit 1
fi

CURRENT_VERSION="$(sed -n 's/.*<version>\(.*\)<\/version>.*/\1/p' opsdash/appinfo/info.xml | head -n1 | tr -d '[:space:]')"
if [[ -z "$CURRENT_VERSION" ]]; then
  echo "[version-bump] Could not determine current version from opsdash/appinfo/info.xml." >&2
  exit 1
fi

SUPPORTED_LINE="${VERSION%.*}.x"

if [[ ! -f "opsdash/appinfo/info.xml" || ! -f "opsdash/package.json" || ! -f "opsdash/package-lock.json" || ! -f "opsdash/VERSION" ]]; then
  echo "[version-bump] Missing one or more required files under opsdash/." >&2
  exit 1
fi

python3 - <<'PY' "$CURRENT_VERSION" "$VERSION" "$SUPPORTED_LINE"
import json
import pathlib
import re
import sys
from datetime import date

current_version = sys.argv[1]
version = sys.argv[2]
supported_line = sys.argv[3]
root = pathlib.Path('.').resolve()
workspace_root = root.parent
today = date.today().isoformat()

info_path = root / 'opsdash' / 'appinfo' / 'info.xml'
info_text = info_path.read_text(encoding='utf-8')
info_text, count = re.subn(r'<version>\s*[^<]+\s*</version>', f'<version>{version}</version>', info_text, count=1)
if count != 1:
    raise SystemExit('[version-bump] Could not update appinfo/info.xml version tag.')
info_path.write_text(info_text, encoding='utf-8')

for rel in ['opsdash/package.json', 'opsdash/package-lock.json']:
    path = root / rel
    data = json.loads(path.read_text(encoding='utf-8'))
    data['version'] = version
    if rel.endswith('package-lock.json'):
        packages = data.get('packages')
        if isinstance(packages, dict):
            root_pkg = packages.get('')
            if isinstance(root_pkg, dict):
                root_pkg['version'] = version
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

security_path = root / 'SECURITY.md'
if security_path.exists():
    security_text = security_path.read_text(encoding='utf-8')
    security_text = re.sub(r'`\d+\.\d+\.x`', f'`{supported_line}`', security_text)
    security_path.write_text(security_text, encoding='utf-8')

replace_targets = [
    root / 'README.md',
    workspace_root / 'opsdash-docs' / 'release' / 'LOCAL_RELEASE_WORKFLOW.md',
    workspace_root / 'opsdash-docs' / 'release' / 'RELEASE.md',
]

for path in replace_targets:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    text = text.replace(f'v{current_version}', f'v{version}')
    text = text.replace(f'opsdash-{current_version}.tar.gz', f'opsdash-{version}.tar.gz')
    text = text.replace(current_version, version)
    path.write_text(text, encoding='utf-8')

def ensure_version_heading(path: pathlib.Path, heading_body: str) -> None:
    text = path.read_text(encoding='utf-8')
    heading = f'## {version} - {today}'
    if heading in text:
        return
    match = re.search(r'## Unreleased\n.*?(?=\n## |\Z)', text, re.S)
    if not match:
        raise SystemExit(f'[version-bump] Could not find "## Unreleased" in {path}.')
    insert_at = match.end()
    text = text[:insert_at] + '\n\n' + heading_body + text[insert_at:]
    path.write_text(text, encoding='utf-8')

app_changelog = root / 'CHANGELOG.md'
ensure_version_heading(
    app_changelog,
    (
        f'## {version} - {today}\n'
        '### Changed\n'
        f'- Release preparation for {version}.\n\n'
    ),
)

docs_changelog = workspace_root / 'opsdash-docs' / 'release' / 'CHANGELOG.md'
if docs_changelog.exists():
    ensure_version_heading(
        docs_changelog,
        (
            f'## {version} - {today}\n'
            f'- Internal release prep opened for {version}.\n\n'
        ),
    )
PY

printf '%s\n' "$VERSION" > "opsdash/VERSION"

bash tools/ci/check_versions.sh
echo "[version-bump] Updated version sources to ${VERSION}."
