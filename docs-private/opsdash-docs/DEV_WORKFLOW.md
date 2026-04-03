# Opsdash Dev Workflow

Short, current guide for local work and ops toggles.

## Environment
- Nextcloud 30-32, Node.js 20+, npm 10+, Composer 2.
- Docker files: `docker-compose*.yml` mount the app under `apps-extra/opsdash`.
- Local helper targets:
  - `make start` -> Nextcloud 32 on `http://localhost:8092`
  - `make start31` -> Nextcloud 31 on `http://localhost:8088`
  - `make status` / `make logs` -> stack health checks

## Build & Test
```bash
make start
cd opsdash
npm ci
npm run build
npm run test:unit
PLAYWRIGHT_BASE_URL=http://localhost:8092 npm run test:e2e
composer run test:unit
```
- Fast smoke pass:
```bash
PLAYWRIGHT_BASE_URL=http://localhost:8088 npx playwright test tests/e2e/dashboard.spec.ts --grep "Operational Dashboard loads without console errors|Offset navigation keeps day-off trend visible|Activity day-off trend widget renders on overview"
```
- Packaging: `make appstore VERSION=<x.y.z>` (see `RELEASE.md`).

## Persistence & Profiles
- `/overview/persist` stores selection, targets, theme, reporting, Deck settings, and widget layout.
- Profiles are saved via `/overview/presets` (endpoint name kept for legacy reasons).

## Cache Toggles
- Disable cache: `occ config:app:set opsdash cache_enabled --value=0` or `OPSDASH_CACHE_ENABLED=0`.
- TTL: `occ config:app:set opsdash cache_ttl --value=60` or `OPSDASH_CACHE_TTL=60`.

## Seeding
- Calendar seeding scripts live under `tools/` (week/month, multi-calendar, demo).
- `tools/seed_last_10_days.sh` seeds two realistic calendars (`Opsdash · Business`, `Opsdash · Private`) for the last 10 days ending today.
- Deck seeding: `apps/opsdash/tools/seed_deck_boards.php`.

## Security Helpers
- `tools/security/run_curl_checks.sh` (persist/notes/profile flows).
- `tools/security/check_multi_user.sh` (per-user isolation).
- `opsdash/tools/security/rerun_onboarding.sh` (wizard replay).

For deeper context, see `TESTING.md`, `API.md`, and `RELEASE.md`.
