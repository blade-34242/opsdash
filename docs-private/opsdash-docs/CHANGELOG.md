# Changelog - Opsdash (internal)

This file is a short internal log. Full release notes live in the repo root `CHANGELOG.md`.

## Unreleased
- None yet.

## 0.7.3 - 2026-04-03
- Current-period aggregation now splits `actual` and `planned`: the active week/month counts only time up to `now`, while later events and later recurrence instances remain in `future_hours`.
- The frontend now shows that split visibly in `Time Summary`, `Targets`, and `Calendar Table` (`planned later`, `upcoming`, and per-category planned values).
- The `Day off` trend for the active period now clips to the current day instead of counting future days as off in advance.
- Current-week/current-period highlight styling is now consistent across multiple widgets.
- Calendar parsing is hardened against structured Sabre/CalDAV values (`DURATION`, summary, ICS text arrays), preventing `Array to string conversion` warnings.
- `Period Comparison` now shows a clear in-widget hint when `lookbackWeeks = 1` and no comparison data is being loaded.
- Widget options now include direct `Move` / `Copy` actions for other dashboard tabs in addition to the existing drag-and-drop flow.
- Deck widgets are now separated into a management-first `Deck cards` widget and a compact `Deck stats` widget. Both widgets share the same base filter language (`boards`, `stacks`, `tags`, `mine/unassigned` scope), while `Deck stats` stays bound to the current dashboard week/month context.
- Standard and Advanced dashboard presets now include `Deck stats` in their shipped defaults (`Overview` for Standard, `Workspace` for Advanced).
- Widget-local advanced editing for `Targets` now routes by strategy and reuses the onboarding Goals UI while saving only widget-local overrides (`useLocalConfig`, `localConfig`, `localTargetsWeek`, `localGroupsById`).
- `Time Off Trend` now snaps to a single row or clean vertical stack based on widget width instead of falling into mixed wrapping states.
- Widget config menus now resolve effective `Targets` defaults from the active config, so checkbox state and rendered widget state stay aligned.
- The `Targets` widget `Never Finished · Stay Hard` mode now uses a much larger icon-only badge and an inset flame frame that stays clipped inside the widget.

## 0.7.2 - 2026-03-25
- `Targets`-Widget erweitert um den optionalen Modus `Never Finished · Stay Hard`.
- Widget-Edit-Toolbar von der unteren Floating-Bar in eine obere Secondary Toolbar unter den Tabs verschoben.
- Widget-Konfigurationskarte geometrisch an die Edit-Toolbar angeglichen.
- Goals-Step im Onboarding für Kalender- und Kategorieplanung visuell und responsiv überarbeitet.
- Goal-Suggestions laden jetzt aus vergangenen Wochen und greifen konsistent in `Single Goal`, `Calendar Goals` und `Calendar + Category Goals`.
- Sichtbare Goal-Suggestions lassen sich direkt anklicken und übernehmen ihren Stundenwert ins passende Feld.
- Wizard snapshotet bestehende Konfigurationen beim Öffnen, sodass Strategy-Wechsel in derselben Session Assignments/Suggestion-Kontext nicht verlieren.
- Targets-Badge auf lokale SVGs umgestellt; die `@iconoir/vue`-Warnungen in den Unit-Tests entfallen.
- Playwright-E2E für den Wizard-Rerun an den aktuellen Close-Flow angepasst (`Close onboarding` statt altem `Maybe later`).

## 0.7.1 - 2026-03-23
- Calendar Table auf alle drei Strategy-Modi angepasst: `Single Goal`, `Calendar Goals`, `Calendar + Category Goals`.
- Calendar Table erkennt den echten Onboarding-Strategy-State jetzt vor eventuell alten gespeicherten Kategorien; `Single Goal` kippt damit nicht mehr fälschlich in den Category-Modus.
- `Category Mix Trend` aus `Single Goal` und `Calendar Goals` Presets entfernt; bleibt nur für `Calendar + Category Goals`.
- Category-Zeilen im Calendar Table bekommen jetzt eigene Progress Bars.
- Die alte numerische `today`-Einblendung in den Progress Bars wurde durch einen ruhigeren Neon-Highlight-State ersetzt.
- Strategy-Step nutzt jetzt dieselbe Card-Sprache wie Intro statt eines separaten Artikel-Layouts.
- Calendars-Step hat jetzt wie Deck einen eigenen internen Scroll-Container für lange Listen.

## 0.7.0 - 2026-03-23
- Onboarding komplett auf den neuen 8-Schritte-Flow umgebaut: `Intro -> Strategy -> Calendars -> Deck -> Goals -> Preferences -> Dashboard -> Review`.
- Neue Arrow-Navigation mit `done/current/upcoming`-Zuständen ersetzt die alte kompakte Step-Pill-Optik im Wizard.
- `Quick setup` jetzt als echter Autopilot umgesetzt: wählt Kalender/Deck, setzt Standard-Dashboard, nutzt Lookback-Daten wenn vorhanden und fällt sonst auf kleine Default-Ziele zurück.
- Goals-Step auf kombinierte Kalender-/Kategorie-Planung mit Suggestion-Logik, Reorder und klarerer Zuordnung ausgebaut.
- Preferences-, Dashboard- und Review-Screens an die finalen Mockups angepasst; überflüssige Summary-/Future-Blöcke entfernt.
- Onboarding-Initialisierung stabilisiert; ein früher Wizard-Start-`ReferenceError` wurde behoben.

## 0.6.4 - 2026-03-07
- CI gates erweitert: verpflichtender TS-Typecheck + PHPStan static analysis.
- Release-Hygiene erweitert: Versionskonsistenz-Check (`info.xml`/`package.json`/`VERSION`/`SECURITY.md`) als CI-Guard.
- Packaging vereinheitlicht auf `make appstore`; altes `tools/release/package.sh` als delegierender Legacy-Wrapper markiert.
- Frontend-Orchestrierung reduziert: Tab-Context/Edit-Logik aus `App.vue` in `useLayoutTabsContext` extrahiert.
- Persist-Sanitizer modularisiert: Deck-, Widget- und Onboarding-Sanitization in eigene Services ausgelagert.
- Deterministische Must-pass-E2E-Spec mit 3 stabilen Dashboard-Journeys ergänzt.

## 0.6.0 - 2026-02-21
- Strategy modes renamed/reworked to: Single Goal, Calendar Goals, Calendar + Categories.
- Dashboard presets remapped to Empty/Standard/Advanced (internal IDs unchanged for compatibility).
- Empty preset behavior updated to keep one default tab and no widgets.
- Preset save/load/export now carries onboarding + dashboard context fields and applies preset fallback when widgets are missing.
- Period Comparison history layout options are now `Timeline` / `Accordion` (legacy `list`/`pills` values still map), with `Accordion` default.
- Single Goal strategy now removes `balance_index` widgets from tabs and hides it from the add-widget selector.
- Deck cards widget adds a `minFilterCount` option to hide low-count filter chips.
- Keyboard-shortcuts telemetry hook removed; opening the shortcuts overlay no longer emits telemetry events.
- Frontend boot logging is debug-gated; production mode no longer prints verbose startup/error payloads.
- Period Comparison: removed the redundant bottom footer delta summary line.
- Time Off Trend: refined colors and interpretation controls.
- Category Mix Trend: dark-theme trend accents restored (hybrid strip visible again) with improved contrast.
- Sidebar Guided Setup: cleaner step numbering/spacing, less left indent, clearer scanability.
- Category Mix Trend config + registry tests expanded.

## 0.5.8 - 2026-02-15
- Deck cards tag filters now show board context + board color marker when identical label names exist across multiple boards.
- Notes editor widget event binding fixed so note content is posted and restored correctly after save/reload.

## 0.5.5 - 2026-02-11
- Performance: `OverviewEventsCollector` now caches identical collect calls within one `/overview/load` request to reduce repeated calendar scans.
- Loading UX: widget overlays now apply only on initial paint; refresh keeps existing cards visible and shows `Updating...` in the toolbar.
- Notes load path: notes fetch is non-blocking after data hydrate, and stale responses are ignored on rapid range/offset changes.
- Cache consistency: core cache version is bumped after `/overview/persist` writes so saved config is reflected immediately on subsequent core loads.
- Widgets: dense mode now keeps chart padding stable so compact mode doesn't inflate charts.
- Widgets: new tabs start empty (no preset widgets) for a clean slate.
- Widgets: trend/history widgets now default to oldest -> newest sequence with a shared `reverseOrder` toggle for newest-first.
- Notes widget: add “Use previous” quick-fill and show saving state in the button.
- Persistence: ignore stale save responses to prevent rapid edits from reverting.
- Widgets: chart filters now use a single category/calendar selector with one multiselect (defaults to all categories).
- UI: cards toolbar has extra top spacing so the border reads above the tabs.
- Onboarding: calendar assignments are optional and keep selection order stable.
- Onboarding: edit-current vs new-profile entry, quick category presets, mandatory assignments.
- Profiles: saved layouts include widget tabs, theme, Deck settings, and reporting config.
- Profiles UI moved into an onboarding-style overlay triggered from the sidebar icon.
- UI: widget cards now use a deeper 3D border/shadow treatment in light/dark themes.
- Balance Index: current value color matches the current status indicator.
- Calendar table: hover state matches category/calendar rows and remains readable in dark mode.
- Widgets: hours-of-day legend labels clarified and range shown.
- Widgets: category mix trend tiles now use tone-aware gradients with light/dark contrast.
- Sidebar: guided steps include compact per-step hints (strategy/calendars/targets).
- Sidebar: keyboard shortcuts icon opens the same overlay as `?`, and the icon row is pinned to the bottom (no scroll).
- UI: onboarding panel adopts the rangebar-style frame.
- Load flow: core-first/data-second requests to render layout before stats/charts.
- Boot: server passes default widget presets into the template to avoid a blank main area on hard reloads.
- Frontend: component tree grouped into feature folders (widgets/charts/tables/panels) and unused sidebar panes removed.
- E2E: dashboard spec is now focused on startup/config smoke coverage (deck-specific tab assertions removed to avoid env-specific skips/flakes).

## 0.5.7
- Widget-driven dashboard with tabbed layouts.
- Profile save/load backed by `/overview/presets` endpoint.
- Targets + balance config sanitisation tightened server-side.

Older detail stays in git history to keep this doc compact.
