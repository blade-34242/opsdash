# Onboarding Workflow

## Entry Conditions
- First load without onboarding state.
- Stored onboarding version older than required.
- Manual reset via `?onboarding=reset`.

## Flow (current)
1. Intro
   - Existing config: default path is `Change current setup`.
   - New setup: default path is `Quick setup`.
   - `Quick setup` completes onboarding immediately.
2. Strategy
   - Modes: `Single Goal`, `Calendar Goals`, `Calendar + Category Goals`.
   - This decides how the Goals step behaves later.
3. Calendars
   - Select calendars only.
   - No defaults for manual setup; at least one selected calendar is required.
   - Long calendar lists scroll inside the step, like Deck board selection.
4. Deck
   - `Show Deck in this setup` stays positive by default.
   - When boards exist, users choose visible boards from a scrollable list.
   - When Deck or boards are unavailable, the step stays visible with an info/empty state.
5. Goals
   - `Single Goal`: one overall weekly target with a summed suggestion from recent selected-calendar history.
   - `Calendar Goals`: per-calendar weekly goals with per-row history suggestions.
   - `Calendar + Category Goals`: category targets, calendar targets, assignments, suggestions, and reorder controls.
   - Suggestions use the currently available 1-6 week lookback window from previous weeks.
   - Clicking a visible suggestion applies that value directly into the matching target field.
   - The wizard snapshots the existing config when it opens so switching strategies during one session does not wipe the original categories/assignments.
   - Widget-local advanced editing for the `Targets` widget now reuses this same Goals UI and routes by the current strategy, but saves only to widget-local override fields.
6. Preferences
   - Core defaults on the left, optional recap module on the right.
   - Includes theme, all-day hours, and trend lookback.
7. Dashboard
   - Choose `Empty`, `Standard`, or `Advanced`.
   - Uses visual preview thumbnails that match the saved widget preset.
8. Review
   - Configuration summary, readiness checks, and optional `save as new profile`.

## Rules
- Wizard step order is fixed to `Intro -> Strategy -> Calendars -> Deck -> Goals -> Preferences -> Dashboard -> Review`.
- `Quick setup` selects all calendars, uses `Calendar Goals`, sets the standard dashboard, follows the Nextcloud theme, disables recap by default, and enables all Deck boards when available.
- If recent history exists, `Quick setup` and the Goals step use lookback-based suggestions; otherwise fallback quick targets use small defaults (`4 / 5 / 6h` pattern).
- Goal suggestions are expected to work in all three strategy modes; category suggestions depend on the current calendar-to-category assignments.
- Calendar targets are used in `Calendar Goals` and `Calendar + Category Goals`.
- Category assignment is optional; `Unassigned` calendars are allowed.
- Each calendar can map to at most one category.
- Category presets seed common defaults for `Calendar + Category Goals`.
- Wizard can save per step without finishing.

## Persistence
- Writes through `/overview/persist`.
- Profiles (via `/overview/presets`) include widgets/tabs, theme, Deck, reporting, and targets.
- Widget-local `Targets` overrides persist separately from the global goals config via `useLocalConfig`, `localConfig`, `localTargetsWeek`, and `localGroupsById`.
