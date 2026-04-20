# Opsdash Tools (Dev/QA Only)

Utility scripts that are **not** shipped in the production app. Use them for local dev, CI seeding, and fixture capture. Safe to re-run; none of this is wired into runtime code.

## Seed everything (calendars + Deck)
Run inside a Nextcloud container (adjust names/paths as needed):
```bash
docker exec -it nc31-dev bash -lc '
  cd /var/www/html &&
  BASE=http://localhost:8088 \
  ADMIN_USER=admin ADMIN_PASS=admin \
  QA_USER=qa QA_PASS=qa \
  QA2_USER=qa2 QA2_PASS=qa2 \
  WEEKS=4 \
  APP_PATH=/var/www/html/apps-extra/opsdash \
  bash /var/www/html/apps-extra/opsdash/tools/seed_opsdash.sh
'
```
- Seeds users (admin/qa/qa2), calendars (3–5 per user), and 5 Deck boards with open/done/archived cards.
- Past-only events for the last `WEEKS` (default 4), realistic work + weekend mix. No future events. Re-runs reuse boards/titles.
- `NC_ROOT` auto-resolved by the script; override if needed.

## Capture fixtures (after seeding)
```bash
BASE=http://localhost:8088 ADMIN_USER=admin ADMIN_PASS=admin \
  bash tools/capture_opsdash_fixtures.sh
```
Writes `tools/fixtures/load-week.json`, `load-month.json`, `deck-boards.json`.

## CI usage
- `.forgejo/workflows/server-tests.yml` runs `tools/seed_opsdash.sh` after starting the PHP server so Playwright always sees seeded data.
- Keep tooling here; do not bundle in runtime artifacts or app packages.
