# Changelog

All notable changes to this project will be documented in this file.

## Unreleased
- None yet.


## 0.8.0 - 2026-05-06
### Added
- **Edit toolbar redesign (V3)**: sidebar-aware combined bar — single row when sidebar open, two-row bar when collapsed. Floating edit bar sticks below the Nextcloud header on scroll via `--header-height`.
- **Height L and XL** buttons added to the inline widget toolbar.
- **Widget configuration popover**: `WidgetOptionsMenu` now uses `position:fixed` with JS-calculated coordinates to escape Nextcloud's `overflow:hidden` containers. Config button is always visible (disabled when nothing configurable is selected).
- **Sliders config icon**: replaces old Unicode ⚙ — consistent in toolbar and popover trigger.
- **Toolbar layout**: selected-widget chip far left, "Add widget" far right, mode hint inline next to tab strip (mode-band row removed).
- **Add Widget Modal**: "Add without closing" action, `↵`/`Esc` keyboard shortcuts, per-widget CSS preview thumbnails (9 distinct variants).
- **Widget categories**: all 16 widget types declare `category` (`Time` / `Charts` / `Tasks` / `Notes`). Modal filters by category tab.
- **`WidgetPreview.vue`**: new component for distinct widget previews in the Add Widget grid.
- **BalanceIndex score in history**: each balance history entry now includes a computed `index` float (0–1) alongside categories and shares, supporting both category and calendar basis.
- **Toolbar width/height groups**: width and height controls in the inline edit toolbar are collapsed into expandable group buttons, reducing visual clutter.


## 0.7.7 - 2026-05-01
### Changed
- Release preparation for 0.7.7.


## 0.7.6 - 2026-04-27
### Changed
- Release preparation for 0.7.6.
- Added end-user release-note content for 0.7.6 so the in-app `What's new` panel explains the update.
### Fixed
- The in-app `What's new` button is available for 0.7.6 and the release panel now stays dismissed after the current version has been seen, even if other dashboard saves finish later.
- Targets progress now preserves over-target percentages above 200% in summaries, calendar/category rows, and the visible widget progress bar.


## 0.7.5 - 2026-04-20
### Added
- Added an in-app `What's new` overlay that can auto-open for the current release, keeps older release notes available in a history list, and can be reopened from the sidebar at any time.
- Added version-specific release-note content support with optional preview images, end-user copy, and per-release history entries starting with `0.7.4` and `0.7.5`.
### Changed
- Update messaging now uses the same large overlay window style as onboarding, and the Profiles panel now shares the same overlay shell.
- Closing the current release notes now persists a seen-version marker so the latest update opens automatically only once per user.


## 0.7.4 - 2026-04-18
### Changed
- Release preparation for 0.7.4.
### Fixed
- Targets widget now switches cleanly between Single Goal, Calendar Goals, and Calendar + Category Goals, and Calendar Goals no longer falls back to category rows or Unassigned.

## 0.7.3 - 2026-04-12
### Added
- Introduced a per-widget `heightMode` system (`fixed` | `auto`) so variable-content widgets grow with their content instead of scrolling internally. Eight widgets now default to `auto`: `Targets`, `Period Comparison`, `Time Off Trend`, `Category Mix Trend`, `Calendar Table`, `Deck Cards`, `Notes Editor`, and `Notes Snippet`.
- Added a ResizeObserver-based masonry layout engine to `DashboardGrid` that dynamically computes `grid-row-end: span N` for auto-height widgets, preventing overlaps with neighboring fixed-height widgets on the CSS grid.
- Added an **Auto / Fixed** toggle button to the widget toolbar (Layout group, next to the height cycle). Clicking it writes a per-instance `options.heightMode` override that takes precedence over the registry default. When Auto is active, the S/M/L/XL height-cycle button is disabled.

## 0.7.3 - 2026-04-03
### Changed
- Current-period aggregation now splits elapsed time from upcoming time. The current week/month counts only event time up to `now` as actual work, while later events and later recurring instances stay in separate planned totals.
- Overview widgets now surface planned time explicitly in the frontend, including `planned later` / `upcoming` hints in `Time Summary`, `Targets`, and the calendar table.
- Current-period highlight styling is now consistent across the trend/overview widgets that mark the active week or month.
- Widget edit options now include direct tab actions so widgets can be moved or copied to another dashboard tab without relying only on drag and drop.
- Deck widgets are now split more clearly by intent: `Deck cards` remains the action/management widget, while the new `Deck stats` widget shows a compact week/month summary for a filtered Deck slice using shared board/stack/tag/scope filters.
- Standard and Advanced dashboard presets now ship with `Deck stats` in their default layouts, so new dashboards expose the compact Deck summary without manual widget setup.
- The `Targets` widget advanced editor is now strategy-aware and reuses the onboarding Goals UI for widget-local overrides, so single-goal, calendar-goal, and calendar-plus-category setups open the matching editor shape while still saving only into that widget.
- `Time Off Trend` now switches cleanly between one horizontal row and one vertical stack instead of mixing wrapped layouts at medium widths.
- The `Targets` widget `Never Finished · Stay Hard` mode now uses a much larger icon-only hustle badge and an inset flame frame that stays clipped inside the widget bounds.

### Fixed
- Fixed calendar payload parsing for Sabre/CalDAV rows that can expose structured arrays instead of plain strings (for example `DURATION` / summary values), preventing `Array to string conversion` warnings in `CalendarParsingService`.
- Fixed current day-off trend logic so future days in the active week/month are no longer counted as days off before they happen.
- Fixed current-period KPI, target, and per-day totals so future events no longer inflate “done” values in the active range.
- `Period Comparison` / lookback time summary now shows an in-card hint when trend lookback is set to `1`, so week/month comparison no longer fails silently when previous-period data was not requested.
- Widget configuration controls now resolve effective defaults correctly for `Targets`, so checkboxes such as delta, badges, legend, and category visibility match the rendered widget state instead of appearing unchecked until toggled twice.

## 0.7.2 - 2026-03-25
### Added
- Added a `Never Finished · Stay Hard` option for the `Targets` widget. When enabled, the widget keeps totals in an endless 80-99% display zone and shows a compact rotating hustle badge in the card corner.

### Changed
- Moved the widget-edit toolbar from the bottom floating bar into a secondary toolbar below the main dashboard tabs/edit header.
- Aligned the widget configuration card with the edit toolbar geometry so both bars now share the same outer width, radius, and top-edge rhythm.
- Reworked the onboarding Goals step UI across calendar and category planning modes, including compact action rows, clearer dark-theme borders, select-all helpers, and better responsive behavior for zoomed/medium-width layouts.

### Fixed
- Fixed onboarding suggestion loading so lookback-based suggestions use previous weeks and now surface consistently in `Single Goal`, `Calendar Goals`, and `Calendar + Category Goals`.
- Fixed onboarding goal suggestions so clicking a suggested hours value now applies it directly into the matching target field for single, calendar, and category goal modes.
- Fixed onboarding wizard state resets by snapshotting the existing configuration on open, so strategy changes inside one wizard session no longer drop category assignments/suggestion context.
- Replaced the `Targets` widget badge icon dependency with local SVG components, removing the `@iconoir/vue` unit-test warnings.
- Fixed the Playwright onboarding rerun coverage in CI by updating the E2E tests to use the current onboarding close action instead of the removed `Maybe later` button.

## 0.7.1 - 2026-03-23
### Changed
- Calendar Table widget now adapts correctly to all three strategy modes: Single Goal, Calendar Goals, and Calendar + Category Goals.
- Calendar Table now trusts the real onboarding strategy before stale stored category config, so Single Goal setups no longer render as category-driven views.
- Category Mix Trend is now removed from Single Goal and Calendar Goals dashboard presets while remaining available for Calendar + Category Goals.
- Strategy onboarding cards now use the same card language as the Intro step instead of a separate article-style layout.
- Calendars onboarding now uses the same internal scroll-list behavior as Deck selection for long lists.

### Fixed
- Fixed Calendar Table mode detection when old category config remained in storage after switching to Single Goal.
- Fixed Calendar Table visual hierarchy for category rows by adding category-level progress bars in Calendar + Category Goals mode.
- Replaced the old numeric “today” overlay chips in Calendar Table progress bars with a cleaner neon highlight for both category and calendar progress states.

## 0.7.0 - 2026-03-23
### Added
- Guided onboarding now supports a real one-click `Quick setup` path that finishes setup immediately with sensible defaults, uses recent lookback data when available, and falls back to lightweight per-calendar goals when no history exists.
- Goals onboarding now includes history-driven suggestions from the currently available 1-6 week lookback window for both calendar targets and category targets.
- Added a dedicated Deck step to the onboarding flow with board visibility setup and empty-state handling when Deck or boards are unavailable.

### Changed
- Rebuilt the onboarding flow order to `Intro -> Strategy -> Calendars -> Deck -> Goals -> Preferences -> Dashboard -> Review`.
- Reworked onboarding navigation into arrow-based step controls with current/done/upcoming states and direct reopen behavior for existing setups.
- Refined onboarding UI to match the new mockups across Intro, Strategy, Calendars, Deck, Goals, Preferences, Dashboard, and Review.
- Dashboard preset selection now uses stronger preview thumbnails and clearer preset card alignment.
- Preferences and Review steps were simplified to remove non-mock summary blocks and rely on inline editors/modules instead.

### Fixed
- Fixed onboarding initialization timing that could trigger a Vue `ReferenceError` during wizard startup.
- Fixed review and dashboard layout inconsistencies caused by stale onboarding step ordering and card alignment issues.

## 0.6.4 - 2026-03-07
### Added
- Introduced enforceable static quality gates in CI: frontend TypeScript typecheck (`npm run typecheck`) and backend PHP static analysis (`composer run test:static` with PHPStan).
- Added deterministic E2E must-pass coverage with a dedicated `dashboard.mustpass.spec.ts` containing stable shell/profiles/shortcuts journeys.
- Added automated version-consistency validation (`tools/ci/check_versions.sh`) to enforce alignment across `appinfo/info.xml`, `package.json`, `VERSION`, and `SECURITY.md`.

### Changed
- Unified packaging to a single official release path: `make appstore VERSION=<x.y.z>`; deprecated `opsdash/tools/release/package.sh` now delegates to that path.
- Refactored `App.vue` by extracting tab context/editing orchestration into `useLayoutTabsContext` to reduce top-level coupling.
- Refactored persist sanitization into domain helpers (`PersistDeckSanitizer`, `PersistWidgetsSanitizer`, `PersistOnboardingSanitizer`) while keeping `PersistSanitizer` as orchestration facade.
- Updated release metadata and documentation references for the 0.6.4 line.

## 0.6.3 - 2026-03-04
### Changed
- Refined App Store summary and description copy for clearer value proposition, tighter structure, and better readability on the app detail page.
- Polished release metadata consistency for publishing (`info.xml`, `package.json`, and README version references).

## 0.6.2 - 2026-03-04
### Changed
- App Store listing metadata now includes documentation links, discussion link, and screenshot gallery entries sourced from the repository image assets.
- App categories now include both `tools` and `dashboard` for improved App Store discoverability.

### Fixed
- Release automation now passes `APP_PRIVATE_KEY` to the Nextcloud App Store push action so upload signing no longer fails with an empty key file.

## 0.6.1 - 2026-03-04
### Changed
- Release automation workflow now validates signing secrets, normalizes `APPSTORE_TOKEN`, and tightens App Store push preflight checks to fail early on malformed credentials.

### Fixed
- Stabilized `DeckCardsWidget` created-range test by replacing hardcoded date bounds with a dynamic range around current runtime timestamps.

## 0.6.0 - 2026-02-21
### Changed
- Strategy setup now uses three explicit modes: Single Goal, Calendar Goals, and Calendar + Categories.
- Dashboard preset labels/mapping are now Empty, Standard, and Advanced; the Empty preset keeps one default tab without widgets.
- Profile payload sanitization now keeps additional compatible fields (`theme_preference`, `reporting_config`, `deck_settings`, `widgets`, `onboarding`) for save/load/export.
- Period Comparison now uses `Timeline` / `Accordion` history layouts (replacing `List` / `Pills`), with `Accordion` as the default and backward mapping for existing profile values.
- When strategy is Single Goal, `Balance Index` is now removed from dashboard tabs and excluded from the add-widget list.
- Deck cards widget options now include `Min filter count` to hide filter chips below a configurable count threshold.
- Removed the keyboard-shortcuts telemetry hook; opening the shortcuts overlay no longer emits analytics/event-bus telemetry events.
- Frontend boot logging is now debug-gated; production mode no longer prints verbose startup/error payloads to the browser console.
- Period Comparison no longer shows the redundant footer delta summary row (`Δ vs. offset -1 ...`) at the bottom of the widget.
- Time Off Trend now uses refined color semantics and interpretation controls for clearer status reading.
- Guided Setup steps in the sidebar now use cleaner numbering/spacing with reduced left indentation and improved readability.
- Category Mix Trend widget configuration/registry test coverage was expanded.

### Fixed
- Profile load now restores onboarding strategy/dashboard mode context and applies the matching dashboard preset when widget tabs are not included in the profile.
- Category Mix Trend in dark theme now keeps visible hybrid trend accents (up/down color strip) while preserving readable text contrast.

## 0.5.8 - 2026-02-15
### Changed
- Deck cards tag filters now disambiguate duplicate tag names by showing board context (plus board color marker) in each filter chip.

### Fixed
- Notes editor widget now binds `update:modelValue` correctly so saved note content is sent, persisted, and restored after reload.

## 0.5.7 - 2026-02-14
### Changed
- App Store release hardening: metadata, packaging hygiene, docs consistency, and public API alignment.
- Onboarding wizard panel now uses a consistent window size across steps, with internal scrolling for overflow to avoid layout jumping.
- Onboarding review step redesigned into a richer executive recap: grouped configuration cards, readiness checks, and direct edit/fix actions per area.
- Onboarding review typography and spacing refined for clearer hierarchy and improved screenshot quality.

### Fixed
- Light-theme onboarding headings were too muted; key titles (welcome/step/card headings) now render with stronger contrast.

## 0.5.5 - 2026-02-11
### Added
- Balance overview now surfaces a compact Balance index badge in the card header.
- Sidebar navigation is explicitly registered so Opsdash appears in Nextcloud’s app menu (and NC max version extended to 32).
- Deck cards widget auto-detects label tags as filters, shows counts, and lets users hide tag filters per widget.
- Deck cards widget adds a compact list toggle for denser card rows without losing metadata.
- Pie chart highlights slices on legend hover and direct slice hover.
- Pie chart scale is slightly reduced for a tighter visual footprint.
- Stacked chart widgets scale is slightly reduced for a tighter visual footprint.
- Stacked chart widgets highlight series on legend hover and direct bar hover.
- Stacked chart widgets now label each stack segment and show per-column totals with leader labels for small segments.
- Day-of-week and hours-of-day charts now fold in the configured lookback window for history context.
- Lookback charts now color weeks consistently in Per-day/Day-of-week, and Hours-of-day adds stacked/overlay lookback modes with a legend.
- Profiles management is now available in an onboarding-style overlay triggered from the sidebar icon.
- Cards toolbar now shows an `Updating...` refresh indicator during background data reloads.
- Backend load path now reuses identical event collect calls within a single request (request-local collector cache).

### Changed
- Sidebar layout: setup wizard block copy/numbered steps, framed sections, larger refresh button, and keyboard shortcuts moved to the bottom.
- Sidebar scrolling now uses the outer navigation container (single scrollbar) with left-side scroll positioning.
- Sidebar open/close state now persists locally (defaults to open if storage is missing or invalid).
- Widget layout editing keeps the active tab selected after widget changes.
- New dashboard tabs start empty instead of copying preset widgets.
- Widget cards now share the Balance Index-style border treatment (including Deck cards).
- Widget cards now use a deeper 3D border/shadow treatment for more depth in light/dark themes.
- Cards toolbar now has top spacing so the border reads cleanly above the tabs/edit layout button.
- Chart widgets now use a unified filter selector (category/calendar) with a single multiselect defaulting to all categories.
- Notes editor widget adds a quick "Use previous" fill action and clearer saving state.
- Onboarding assignments are optional and preserve the selection order for calendars.
- Day-off trend widget uses the global range unit (week/month) and defaults color pickers to red/green tones.
- Day-off trend widget adds Balance Index-style trend label options (date range, week/month, offset).
- Sidebar guided steps now include compact per-step hints (strategy, calendars, targets, etc.) instead of a separate summary block.
- Sidebar bottom icons now open the same keyboard shortcuts overlay as `?`, with updated iconography and sizing.
- Sidebar navigation is now full-height (no internal scroll), keeping the bottom icon row pinned.
- Category mix trend tiles use tone-aware gradients and contrast in light/dark themes.
- Dashboard load uses core-first/data-second requests so layout renders before stats/charts.
- Template bootstraps default widget presets to avoid a blank main area on hard reloads.
- Frontend component tree regrouped into feature folders (widgets/charts/tables/panels), with unused sidebar panes removed.
- Trend/history widgets now use a consistent default sequence of oldest -> newest (left to right), with a shared `reverseOrder` widget option to flip to newest-first.
- Widget loading overlays are now limited to first paint; refresh keeps existing widget content visible.
- Notes fetching now runs non-blocking after main data payload application.
- E2E coverage was simplified to stable dashboard-start flows; deck-tab specific assertions were removed from `dashboard.spec.ts` to reduce env-dependent skips/flakes.
- Dashboard E2E selectors were aligned with the current UI (sidebar onboarding trigger + profiles overlay), keeping tests focused on startup/config smoke paths.

### Fixed
- Dense widget mode no longer inflates chart padding; compact mode keeps charts tight.
- Rapid widget edits no longer revert due to out-of-order persist responses.
- Balance Index current value now uses the same status color as the current indicator.
- Calendar table hover now matches category/calendar rows and stays readable in dark mode.
- Stale notes responses are ignored so quick range/offset switches cannot overwrite newer note state.
- Core cache version is bumped after persist writes so updated config is reflected on the next core load.

### Added
- Onboarding wizard “Dashboard preset” step (Quick / Standard / Pro) that applies a preset widget layout and stores the chosen dashboard mode.
- Dashboard layout tabs (add/rename/remove/set default) with per-tab widget lists.
- Deck cards widget overhaul: per-widget board/filter selection, auto-scroll/count options, reset-to-preset action in the widget toolbar.
- Day-off trend and Category mix trend widgets now expose Low/High color pickers; colors blend and apply to tiles with contrast-aware text.
- Backend refactor: extracted `/overview/persist` and `/overview/notes` into dedicated controllers (URLs unchanged).
- Frontend refactor: split `DashboardLayout` into grid/toolbar/add-menu/advanced-overlay components.

### Changed
- Backend refactor: `OverviewController` focuses on `/overview/load` (+ index/ping); config reads consolidated in `UserConfigService`.
- Frontend perf: widget components are now lazy-loaded via `defineAsyncComponent()` from per-widget registry files (enables future code-splitting/tree-shaking).
- Sidebar hides Profiles/Report tabs when the Quick dashboard preset is active; default widgets now come from the Standard preset.
- Widget toolbar includes “Reset preset” to restore the current dashboard mode’s layout.
- Widget layouts now persist as a tabbed payload (`{ tabs, defaultTabId }`), with legacy arrays normalized into a single tab.
- Layout toolbar is left-aligned and tab visuals are more pronounced for quick scanning (dark theme contrast improved).

## 0.4.7
### Added
- Targets card and By Calendar progress bars now show today's hours as an overlay in the same series color, including the over-100% portion.
- Dashboard cards render through a widget registry and grid layout (`DashboardLayout`) so we can introduce an editor mode later.
### Changed
- Bump version to 0.4.7 and update fixtures/export metadata.

## 0.4.6
### Added
- Keyboard shortcuts overlay + `useKeyboardShortcuts` composable: Alt+←/→ navigation, Alt+N notes pane, Alt+T Config & Setup, Ctrl/⌘+S note save, and `?` cheat sheet.
- QA month + notes fixtures (`load-month-qa.json`, `notes-month-qa.json`) wired into Vitest + PHPUnit to keep `/overview/load` + `/overview/notes` schema coverage in sync.
- Localization helpers: `npm run i18n:scan` highlights untranslated strings and `npm run i18n:extract` wraps `occ translations:create-app` for template generation.
- Vitest coverage for `DeckCardsPanel` (filters, loading/error/empty states) and `TimeSummaryCard` to lock UI copy/metrics before Playwright runs.
- Deck preview: `src/services/deck.ts` normalises Deck API payloads, `composables/useDeckCards.ts` wires them into the SPA, and App.vue now exposes a Deck tab powered by `DeckCardsPanel.vue`.
- QA Deck seed script `apps/opsdash/tools/seed_deck_boards.php` (plus Vitest fixtures/tests) ensures CI and Playwright runs have deterministic Deck boards/cards.
- Deck tab now caches responses per range, surfaces explicit error states, and links out to the Deck app for deeper triage.
- Playwright e2e suite now exercises the Deck tab to confirm the seeded QA cards render end-to-end.
- Deck tab adds an “All cards / My cards” filter driven by assignees so individual workload snapshots stay focused.
- Sidebar gains a “Report” tab to configure weekly/monthly digests, interim reminders, and Deck visibility/filter defaults (persisted per user).
- Balance Overview mix rows now render as a heatmap grid that color-codes week/month deltas while keeping the exact share percentage inside every tile.
- Activity & Schedule card’s “Days off” comparison has been redesigned as a mini heatmap with tone-aware tiles so the current range vs. lookback window is readable at a glance.

### Changed
- Dashboard persistence now relies on server-provided `balance.ui.*` flags (fallback only triggers when an entire block is missing), matching the updated `/overview/persist` response.
- Playwright multi-user scenario now logs in as the secondary user to persist selection state, eliminating the flaky hard-coded assumption.
- Deck seeding is no longer exposed as an OCC command during CI packaging; use the PHP helper scripts directly when QA data is required.
- Balance config trimmed: removed `roundPercent`/`roundRatio`/`showDailyStacks` UI knobs, hardcoded ratio rounding to 1 decimal, unified default lookback to 3 (clamped 1–6), and kept basis/index sanitisation consistent across TS/PHP.
- Sidebar Activity & Balance pane copy fully in English with clearer help text and grouped toggles; basis selector hints now explain “Off/Category/Calendar/Both”.

### Fixed
- `cleanBalanceConfig()` propagates `showNotes`, so `/overview/persist` always echoes all balance UI toggles and the client no longer re-injects missing fields.
- Fixed `/overview/load` crashes when all-day events were normalised without a pass-by-reference day map (Nextcloud 31’s controller now updates the accumulator safely).

## 0.4.5 - 2025-11-10
### Added
- CI matrix that provisions Nextcloud server branches (`stable30`, `stable31`) across PHP 8.2/8.3 and runs Vitest, PHPUnit, and Playwright.
- Playwright flow that re-runs onboarding and saves a preset to guard main UI paths.
- Security automation scripts (`tools/security/run_curl_checks.sh`, `import_fuzz.sh`, `preset_roundtrip.sh`, `opsdash/tools/security/run_notes_csrf.sh`).
- `make appstore` target for reproducible packaging + signing.
- `opsdash/tools/security/rerun_onboarding.sh` to replay the wizard payload (strategy/theme/targets) via `/overview/persist`.
- Fixture-backed tests that replay the Config & Setup export: Vitest simulates preset import and PHPUnit verifies the controller’s sanitiser accepts the same payload without warnings.

### Changed
- README simplified for end users; screenshots moved under `img/`.
- Docs moved out of the distribution package to keep releases lean.
- Internal doc set consolidated (`DEV_WORKFLOW.md`, `TESTING.md`, `ROADMAP.md`) while legacy references now sit under the separate `opsdash-docs/archive/` repo for historical lookup.

### Fixed
- Preset names are sanitised end-to-end (API + UI) after fuzz testing uncovered path/HTML issues.
- Notes endpoint enforces CSRF tokens even for curl clients.

## 0.4.4 - 2025-10-20
- First public beta: calendar overview, targets/pacing widgets, presets, onboarding wizard, notes panel, theme syncing.
