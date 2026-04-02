# Architecture Overview

Opsdash is a Nextcloud app with a PHP backend and a Vue 3 SPA. The backend focuses on data collection,
sanitisation, and persistence; the frontend renders widgets and drives configuration.

## Request Flow

1. User opens the app navigation entry -> PHP controller loads CSS + JS and template.
2. Template bootstraps default widget presets + theme preference into `data-*` attributes so the layout renders immediately after mount.
3. Frontend boots and calls `GET /overview/load?include=core` with `range` + `offset`.
4. Server returns core payload (calendars/selection/config/theme/widgets/userSettings), enabling UI scaffolding.
5. Frontend calls `POST /overview/load` with `include=data` (and `lookback` when needed) to fetch stats/charts.
6. User adjusts selection/targets -> client POSTs to `persist` (CSRF); reloads data.
7. Notes are fetched and saved per period via `GET/POST /notes`.

## Calendar Colors (Source of Truth)

The server is the single source of calendar colors. For compatibility across Nextcloud
versions/backends, the server probes the public API and falls back to a deterministic palette.

Server resolution (API-only):
- `getDisplayColor`
- fallback palette (deterministic, based on id/name)

## Calendar Access Compatibility (NC 30-32)

`CalendarAccessService::getCalendarsFor()` uses a fallback chain to keep the app compatible with
multiple Nextcloud server versions and backends:

1) `getCalendarsForPrincipal('principals/users/<uid>')` (preferred)
2) `getCalendarsForUser('<uid>')` (legacy/optional if present)
3) `getCalendars('<uid>')` (older public API)

Nextcloud server `IManager` public API surface for 30-32 (source: `lib/public/Calendar/IManager.php`):

| Nextcloud | getCalendarsForPrincipal | getCalendarsForUser | getCalendars |
| --- | --- | --- | --- |
| 30.0.0 | yes | no | yes |
| 31.0.0 | yes | no | yes |
| 32.0.0 | yes | no | yes |

Note: some calendar backends or older versions can still expose `getCalendarsForUser`, so the
fallback remains in place even though the public interface in 30-32 does not list it.

## Date/Time & Locale

- The server resolves the user timezone + first-day-of-week from Nextcloud core settings and uses them for range bounds and day bucketing.
- The client formats dates using the user locale (Nextcloud `OC.getCanonicalLocale()` when available), the server-provided timezone, and the first-day-of-week from `userSettings`.
- For the active period (`offset=0`), the server also derives an `analysisTo`/cutoff at `now` so aggregation can split elapsed time (`actual`) from upcoming time (`future`).

## Backend Modules

- Controllers:
  - `Controller/OverviewController.php`: `index`, `load`, `ping`.
  - `Controller/PersistController.php`: `persist` (POST `/overview/persist`)
  - `Controller/NotesController.php`: `notes` (GET) / `notesSave` (POST) at `/overview/notes`
  - `Controller/PresetsController.php`: profile list/save/load/delete at `/overview/presets`
- No admin settings; no usage metrics are collected.
- Services:
  - `PersistSanitizer`: sanitises targets/balance/reporting/deck/onboarding/theme payloads.
  - `UserConfigService`: centralises read-back + defaults for user config blobs (theme/reporting/deck/targets/onboarding).
  - `OverviewLoadService`: orchestrates `/overview/load` core payload assembly, include filtering, and caching.
    - `OverviewIncludeResolver`: canonicalises include lists + flags.
    - `OverviewCorePayloadComposer`: composes core payload fragments.
    - `OverviewLoadCacheService`: encapsulates cache keys + read/write logic.
  - `OverviewDataService`: builds the heavy stats/aggregation/charts payload for `/overview/load`, including the current-period actual/planned split metadata.
  - `OverviewStatsService`: combines KPI, delta, and trend calculators for `/overview/load`.
    - `OverviewStatsKpiService`: current-period KPIs + availability.
    - `OverviewStatsDeltaService`: previous-period deltas.
    - `OverviewStatsTrendService`: day-off trend + balance history.
  - `CalendarAccessService`, `CalendarParsingService`, `CalendarColorService`: calendar access, parsing, and color normalization.
  - `OverviewEventsCollector`, `OverviewAggregationService`, `OverviewChartsBuilder`, `OverviewBalanceService`: read-path helpers used by `/overview/load`.
    - `OverviewAggregationService` is the split point for active-range math: `total_hours` stays backward-compatible as actual-only while `future_hours` carries upcoming time for the same range.

Guiding principles:
- Strict read/write separation (read endpoints: side-effect free; write endpoints: POST+CSRF only).
- Clamp all inputs, intersect calendars with user principal.
- Add soft caps and expose truncation in `meta`.
- Treat recurrence as normal event instances: the exclusion rule is based on time relative to `now`, not on whether an event came from an RRULE series.

## Frontend Modules (current)

- `src/App.vue`: root orchestrator (load, persist, widget layout, sidebar wiring).
- `src/components/sidebar/Sidebar.vue`: sidebar shell; panes live under `src/components/sidebar/`.
- `src/components/widgets/`: widget cards, chart widgets, notes/deck widgets.
- `src/components/charts/`, `src/components/tables/`, `src/components/panels/`: shared primitives and panels.
- `composables/useDashboard*`: load/persist/selection/profile orchestration helpers.
- `composables/useCategories.ts`, `useCharts.ts`, `useSummaries.ts`, `useBalance.ts`: shared data shaping for cards/widgets.
- `src/services/deckWidgetMetrics.ts`: shared Deck filtering + metric helpers reused by `Deck cards` and `Deck stats`.
- `src/services/widgetsRegistry/`: widget definitions + default layout/options.
- `src/services/targets/`: targets math, forecasts, pace logic.

Widget rendering is registry-driven; most visual units are standalone components to keep App.vue lean.
Deck widget intent is split intentionally:
- `Deck cards` is the action/management widget.
- `Deck stats` is the compact range-bound summary widget.
