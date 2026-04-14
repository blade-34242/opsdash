# Opsdash - Operational Calendar Dashboard for Nextcloud

![Nextcloud Server Tests](https://github.com/blade34242/opsdash-operational-dashboard-nextcloud/actions/workflows/server-tests.yml/badge.svg)

Opsdash is an independent third-party app that turns Nextcloud Calendar data into a practical operations dashboard: what happened, what is on target, and where your time is drifting.

Opsdash is not affiliated with, endorsed by, sponsored by, or officially maintained by Nextcloud GmbH or the Nextcloud project.

## 🚀 Feature Rundown
- 📅 **Dashboard** – KPIs for week/month, busiest days, averages, weekend share, top categories, longest events, and multi-tab layouts.
- 🎯 **Targets & pacing** – per-calendar and per-category goals, pace hints, trend context, and forecast signals.
- ⏱️ **Current period done vs planned** – active week/month separates elapsed hours from future hours so “done” metrics stop at now and upcoming time stays clearly labeled.
- ⚖️ **Balance** – share cards, stacked bars, relations/ratios, heatmaps, lookback trends, and daypart toggles.
- 🧠 **Notes** – edit “This week/month”, view “Last week/month”, and optionally surface notes in cards.
- 🧩 **Onboarding wizard & profiles** – guided setup, rerun onboarding, and save/load/delete/export/import profile presets.
- 🗓️ **Activity & schedule** – event and active-day KPIs plus “Days off” trend heatmaps.
- 🔐 **Runs inside Nextcloud** – same session, same permissions, CSRF-protected writes, no external API calls.
- 🗂️ **Deck widgets** – a management-focused `Deck cards` widget plus a compact `Deck stats` widget, both with per-widget board/stack/tag filters and range-aware Deck summaries.
- 📨 **Report tab (preview)** – configure weekly/monthly digest preferences and reminder behavior.
- 📐 **Widget sizing controls** – per-widget width/height plus scale/dense options for layout tuning.

## Screenshots
![Overview (Light)](img/opsdash-overview-light-wide.png)

| Widgets (Light) | Widgets (Dark) |
| --- | --- |
| ![Widgets Light](img/opsdash-widgets-light.png) | ![Widgets Dark](img/opsdash-widgets-dark.png) |

| Onboarding (Light) | Onboarding (Dark) |
| --- | --- |
| ![Onboarding Light](img/opsdash-onboarding-light.png) | ![Onboarding Dark](img/opsdash-onboarding-dark.png) |

| Calendar Table (Light) | Calendar Table (Dark) |
| --- | --- |
| ![Calendar Table Light](img/opsdash-calendar-table-light.png) | ![Calendar Table Dark](img/opsdash-calendar-table-dark.png) |

## Compatibility
Opsdash supports Nextcloud installations, but it is an independent third-party app and not an official Nextcloud app.

| Branch | Nextcloud | App version |
| --- | --- | --- |
| `master` | 30-32 | 0.7.3 |
| `release/0.5.x` | 30-32 | Store-ready line |

## Install
Install from the Nextcloud App Store as a third-party app (when published) or place `opsdash` in `custom_apps/` and enable it:

```bash
occ app:enable opsdash
```

## Development
```bash
make start
cd opsdash
npm ci
composer install
npm run build
npm run test:unit
composer run test:unit
PLAYWRIGHT_BASE_URL=http://localhost:8092 npm run test:e2e
```

- `make start` starts the local Nextcloud 32 dev container on `http://localhost:8092`.
- `make start31` starts the Nextcloud 31 container on `http://localhost:8088`.
- `make status` / `make logs` help confirm the stack is up before testing.

Quick smoke check:
```bash
make smoke
```

## Packaging
```bash
make release VERSION=0.7.3
```

One-step release helper:
- bumps `appinfo/info.xml`, `package.json`, `package-lock.json`, `opsdash/VERSION`, and `SECURITY.md`
- runs the packaged app build
- creates `build/dist/opsdash-<version>.tar.gz`

Manual packaging only:
```bash
make appstore VERSION=0.7.3
```

Produces `build/dist/opsdash-<version>.tar.gz` (unsigned).  
Sign separately with `occ integrity:sign-app`.

## Contributing
1. Keep PRs focused.
2. Update docs and fixtures when payloads change.
3. Run unit tests before opening a PR.
