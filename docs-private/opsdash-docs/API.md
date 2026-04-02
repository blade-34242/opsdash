# API Reference

Base path: `/apps/opsdash`

## Routing & Controllers (internal)
- `/overview/load`, `/overview`, `/overview/ping` -> `OverviewController`
- `/overview/persist` -> `PersistController`
- `/overview/notes` (GET/POST) -> `NotesController`
- `/overview/presets` -> `PresetsController` (profile storage; endpoint name unchanged)

## Load Statistics (read-only)
- Methods:
  - GET `/overview/load` (core only; data sections require POST)
  - POST `/overview/load` (core + data; CSRF required)
- Typical flow:
  1) GET `include=core` to render layout + config quickly.
  2) POST `include=data` (and `lookback` when needed) to hydrate stats/charts.
- Params (query for GET, JSON body for POST):
  - `range`: `week` | `month` (default: `week`)
  - `offset`: integer -24..24 (default: 0)
  - Week ranges respect the user's first-day-of-week setting.
  - Optional preview: `cals[]=id` or `calsCsv=id1,id2`
  - Optional `include`: limit sections returned. Accepts repeated `include=core` or comma-separated `include=core,data`.
    - `core` => calendars/selection/config (targets, theme, reporting, deck, widgets, onboarding, userSettings)
    - `data` => stats/byCal/byDay/longest/charts
    - `lookback` => extended chart history (per-day + time-of-day lookback series)
    - `debug` => debug envelope (only when server debug mode is enabled)
    - GET defaults to `core` if `include` is omitted; POST defaults to `core` + `data` (no lookback).
  - Caps: `include` max 20 entries, `cals` max 200 entries; overly long CSV inputs are truncated.
- CSRF: required for POST (`window.oc_requesttoken`)
- Payload size: POST body is capped (~256KB); JSON depth is capped (16); oversized requests return `413`.
- Response: JSON
```
{
  ok: true,
  meta: {
    range: 'week'|'month',
    offset: number,
    from: 'YYYY-MM-DD', to: 'YYYY-MM-DD',
    truncated: boolean,
    limits: { maxPerCal: number, maxTotal: number, totalProcessed: number },
    currentPeriodClipped?: boolean,
    currentCutoff?: 'ISO-8601 timestamp'
  },
  calendars: [{ id, displayname, color }],
  selected: [id,...],
  colors: { byId: { [id]: '#RRGGBB' }, byName: { [name]: '#RRGGBB' } },
  groups: { byId: { [id]: 0..9 } },
  targets: { week: { [id]: number }, month: { [id]: number } },
  targetsConfig: { ... },
  reportingConfig: { ... },
  deckSettings: { ... },
  themePreference: 'auto'|'light'|'dark',
  userSettings: { timezone: 'Area/City', locale?: 'de', firstDayOfWeek: 0..6 }, // 0=Sun..6=Sat
  stats: {
    total_hours,          // actual hours only for the active period; clipped at "now"
    future_hours?,        // upcoming hours later in the active period
    today_actual_hours?,  // elapsed hours for today
    today_future_hours?,  // upcoming hours later today
    current_period_clipped?, // true when offset=0 and the active period is clipped at "now"
    current_cutoff?,      // ISO 8601 timestamp used as the actual/future split
    avg_per_day, ...
  },
  byCal: [{ id, calendar, events_count, total_hours, future_hours? }, ...],
  byDay: [{ date, events_count, total_hours, future_hours? }, ...],
  longest: [...],
  charts: {
    pie,
    perDay,
    perDaySeries, // labels always span the full requested range; missing days are filled with 0 totals so the SPA can render projections for future dates.
    dow,
    dowSeries,
    hod,
    // Only when include=lookback is requested:
    perDaySeriesLookback,
    perDaySeriesByOffset,
    hodLookback,
    hodByOffset,
    summaryByOffset
  },
  widgets: {
    defaultTabId: string,
    tabs: [
      { id: string, label: string, widgets: Array<{ id, type, layout, options?, version }> }
    ]
  },
  onboarding: { completed, version, ... }
}
```

Notes:
- `stats.earliest_start` / `stats.latest_end` are ISO 8601 timestamps in the user timezone.
- In the active period (`offset=0`), existing `total_hours` fields now mean “already happened / elapsed so far”, not “whole week/month including future events”.
- Recurring events are not excluded as a class. Past instances count as actual time; future instances/segments stay in `future_hours`.

## Persist Selection (save)
- Method: POST `/overview/persist`
- Body: JSON `{ cals: string[]; groups?: Record<string,number>; targets_week?: Record<string,number>; targets_month?: Record<string,number>; targets_config?: TargetsConfig; widgets?: WidgetTabsState; theme_preference?: 'auto'|'light'|'dark'; reporting_config?: ReportingConfig; deck_settings?: DeckFeatureSettings }`
- Notes: `targets_config` mirrors `/load` (categories, pace, forecast, ui, timeSummary, activityCard, balance). Legacy balance precision fields are ignored server-side.
- Notes: for trend/history widget options, `reverseOrder` controls visual sequence (`false` default = oldest -> newest; `true` = newest -> oldest).
- CSRF: required (`window.oc_requesttoken`)
- Payload size: individual stored blobs are capped (~64KB); oversized payloads return `413`.
- Response (sanitised echo):
  `{ ok, saved, read, groups_read?, targets_week_read?, targets_month_read?, targets_config_read?, theme_preference_read?, reporting_config_read?, deck_settings_read?, widgets_read? }`

Example (replace cookie + token with values from your browser session):
```bash
BASE="http://localhost:8088"
TOKEN="OcQ7.../Aa=="                 # from window.oc_requesttoken
COOKIES="oc_sessionPassphrase=k...; oc8abcd123ef=2...; NC_CSRF_TOKEN=$TOKEN"

curl -sS "${BASE}/index.php/apps/opsdash/overview/persist" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "requesttoken: ${TOKEN}" \
  -H "Cookie: ${COOKIES}" \
  -d '{"cals":["cal-1","cal-2"],"targets_week":{"cal-1":24,"cal-2":12}}' | jq
```

Validation
- `cals`: intersected with user's calendars; unknown ids ignored.
- `groups`: per-calendar 0..9; missing ids default to 0 (the UI sets these automatically when a category is chosen).
- `targets_*`: per-calendar hours clamped to [0..10000], decimals allowed; unknown ids ignored.

## Notes (read)
- Method: GET `/overview/notes`
- Query: `range`, `offset` as above
- Response: `{ ok, period: { type, current_from, previous_from }, notes: { current, previous } }`

## Notes (save)
- Method: POST `/overview/notes`
- Body: `{ range: 'week'|'month', offset: number, content: string }` (max 32k)
- CSRF: required
- Response: `{ ok: true }`

Example:
```bash
BASE="http://localhost:8088"
TOKEN="OcQ7.../Aa=="
COOKIES="oc_sessionPassphrase=k...; oc8abcd123ef=2...; NC_CSRF_TOKEN=$TOKEN"

curl -sS "${BASE}/index.php/apps/opsdash/overview/notes" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "requesttoken: ${TOKEN}" \
  -H "Cookie: ${COOKIES}" \
  -d '{"range":"week","offset":0,"content":"Updated via curl OK"}' | jq
```

## Deck (read)
- Method: GET `/overview/deck/boards`
- Response: `{ ok: true, boards: Array<{ id, title, color? }> }`
- Method: GET `/overview/deck/cards`
- Query: `from`, `to` (ISO timestamp), `includeArchived` (0/1), `includeCompleted` (0/1)
- Response: `{ ok: true, cards: DeckCardSummary[] }`
- Notes: uses the current user session; when Deck is unavailable, an empty list is returned.

## Ping (health)
- Method: GET `/overview/ping`
- Response: `{ ok, app, version, changelog, ts }`

## Profiles (endpoint: `/overview/presets`)
- List summaries
  - Method: GET `/overview/presets`
  - Response: `{ ok, presets: Array<{ name, createdAt, updatedAt, selectedCount, calendarCount }> }`
- Save/overwrite profile
  - Method: POST `/overview/presets`
  - Body: `{ name: string, selected: string[], groups: Record<string,number>, targets_week: Record<string,number>, targets_month: Record<string,number>, targets_config: TargetsConfig, widgets?: WidgetTabsState, theme_preference?: string, deck_settings?: DeckFeatureSettings, reporting_config?: ReportingConfig, onboarding?: OnboardingState }`
  - Response: `{ ok, preset: { name, createdAt, updatedAt }, presets: [...], warnings?: string[] }`
  - Notes: payload is sanitised against the user's current calendars; unknown ids are dropped with a warning.
  - Payload size: preset storage is capped (~64KB total); oversized payloads return `413`.
- Load profile
  - Method: GET `/overview/presets/{name}`
  - Response: `{ ok, preset: { name, createdAt, updatedAt, selected, groups, targets_week, targets_month, targets_config, widgets?, theme_preference?, deck_settings?, reporting_config?, onboarding?, warnings?: string[] }, warnings?: string[] }`
  - The response already includes a sanitised payload; if warnings are present the client should surface them before applying the result.
- Delete profile
  - Method: DELETE `/overview/presets/{name}`
  - Response: `{ ok, presets: [...] }`
