# UX Polish — Widget-by-Widget Review

> Goal: Analyze every widget across all tabs individually, document concrete UX issues,
> specify improvements, and sketch ASCII mockups.
> Status column: 🔍 analyzed | 🛠 in progress | ✅ done

---

## Global Widget Layout — Behavior & Scroll Strategy

### How the current system works (from code)

**Grid** (`DashboardGrid.vue`):
- 4-column grid, `grid-auto-rows: 24px`
- Width: `quarter` = 1 col, `half` = 2 cols, `full` = 4 cols
- Height buckets mapped to row spans:

| Height key | Row span | Actual px (24px × span) |
|-----------|----------|------------------------|
| `s`       | 4        | ~96px                  |
| `m`       | 8        | ~192px                 |
| `l`       | 13       | ~312px                 |
| `xl`      | 22       | ~528px                 |

**Overflow**: every widget container has `overflow: auto` — so any content taller than the fixed height bucket silently scrolls inside the widget. This is the root cause of unwanted in-widget scrolling.

---

### The problem with variable-length widgets

Some widgets have **dynamic content height** — the amount of content depends on user data:
- **Targets**: 1–N categories (user has 5)
- **Deck Cards**: 0–N cards
- **Calendar Table**: 0–N events
- **Balance Index**: bar chart grows with lookback count
- **Period Comparison**: accordion with N past weeks

A fixed height bucket either wastes space (too tall) or forces scrolling (too short). Neither is good.

Fixed-height widgets are fine — charts, pie, heatmap, stats boxes always render at a predictable size.

---

### Options available

#### Option A — `auto` height (new height bucket)
Add a 5th height value `'auto'` to `WidgetHeight` type. The grid item uses `grid-row-end: auto` and `height: fit-content`. The widget grows as tall as its content needs.

```
Pros:  No scrolling ever. Always shows full content.
Cons:  Page gets taller with many categories. Layout feels less grid-like.
       Two widgets side-by-side at 'half' width can't align if heights differ.
Best for: Targets, Period Comparison, Balance Index, Note Snippet
```

#### Option B — Smarter height buckets (`s/m/l/xl/xxl`)
Add `xxl` = 30 rows = 720px. Targets with 5 categories fits in `l` (~312px).
Users manually set the right bucket in Edit Layout.

```
Pros:  Simple, no system change needed beyond a new CSS class.
Cons:  User has to manually resize when they add a 6th category. Still can scroll.
Best for: Quick fix, no architecture change.
```

#### Option C — Content-aware height per widget type
Each registry entry declares `heightMode: 'fixed' | 'auto'`. Fixed widgets keep the bucket system. Auto widgets ignore the height bucket and render `height: fit-content`.

```
Pros:  Each widget uses the right strategy for its content type.
Cons:  Two half-width widgets in a row with 'auto' height won't align — one could be taller.
Best for: Mixed dashboard — charts fixed, data widgets auto.
```

#### Option D — `minHeight` + scroll threshold
Widget renders `min-height` based on its bucket but can grow beyond it. Scrolling only kicks in if content exceeds a hard `max-height` (e.g. `max-height: 600px`).

```
Pros:  Content drives height up to a cap. Prevents runaway tall widgets.
Cons:  More complex CSS. Still scrolls at the cap.
Best for: Deck Cards (potentially huge card lists).
```

---

### Implemented strategy — Hybrid (Option C + per-instance override) ✅

**Status: Implemented in 0.7.3**

| Widget | Registry default | Rationale |
|--------|-----------------|-----------|
| `targets_v2` | `auto` | Categories vary — 3 to 10+ rows |
| `time_summary_lookback` | `auto` | History rows scale with lookback window |
| `dayoff_trend` | `auto` | Row count varies by period entries |
| `category_mix_trend` | `auto` | Category rows vary by setup |
| `calendar_table` | `auto` | Table rows scale with calendar count |
| `deck_cards` | `auto` | Card count is dynamic |
| `note_editor` | `auto` | Text content determines height |
| `note_snippet` | `auto` | Note length is unpredictable |
| `time_summary_overview` | `fixed` | 4 KPI blocks — always same height |
| `balance_index` | `fixed` | Bar chart with defined aspect ratio |
| `chart_*` / `chart_hod` | `fixed` | All charts have defined aspect ratios |
| `deck_stats` | `fixed` | Always 6 fixed rows |

**Resolution order**: `options.heightMode` (user override) → `registry.heightMode` → `'fixed'`

**CSS Grid masonry fix**: `h-auto` widgets set `align-self: start; height: auto; overflow: visible`. A `ResizeObserver` measures the rendered content height and dynamically sets `grid-row-end: span N` using the formula `Math.ceil((height + 12) / (24 + 12))`, so grid neighbors never overlap regardless of content size.

**User override in toolbar**: A toggle button ("Auto" / "Fixed") sits next to the height-cycle button in the Layout group of the widget toolbar. Clicking it writes `options.heightMode` for that widget instance only. When Auto is active, the S/M/L/XL height-cycle button is disabled (greyed out).

---

### Files changed

| File | Change |
|------|--------|
| `src/services/widgetsRegistry/types.ts` | Added `WidgetHeightMode` type and `heightMode?` to `RegistryEntry` |
| `src/services/widgetsRegistry/registry.ts` | `mapWidgetToComponent` resolves effective heightMode via options → registry → `'fixed'` |
| `src/services/widgetsRegistry/widgets/targets_v2.ts` | `heightMode: 'auto'` |
| `src/services/widgetsRegistry/widgets/time_summary_v2.ts` | `heightMode: 'auto'` on `timeSummaryLookbackEntry` |
| `src/services/widgetsRegistry/widgets/dayoff_trend.ts` | `heightMode: 'auto'` |
| `src/services/widgetsRegistry/widgets/category_mix_trend.ts` | `heightMode: 'auto'` |
| `src/services/widgetsRegistry/widgets/calendar_table.ts` | `heightMode: 'auto'` |
| `src/services/widgetsRegistry/widgets/deck_cards.ts` | `heightMode: 'auto'` |
| `src/services/widgetsRegistry/widgets/note_editor.ts` | `heightMode: 'auto'` |
| `src/services/widgetsRegistry/widgets/note_snippet.ts` | `heightMode: 'auto'` |
| `src/components/layout/DashboardGrid.vue` | ResizeObserver masonry logic, `h-auto` CSS class |
| `src/components/layout/DashboardLayout.vue` | `heightMode` flows through `ordered` computed |
| `src/components/layout/DashboardToolbar.vue` | Auto/Fixed toggle button, height-cycle disabled state |


## Widget Index

### Tab: Overview
| # | Widget | Component | Status |
|---|--------|-----------|--------|
| 1 | [Targets](#1-targets) | `TimeTargetsCard.vue` | 🔍 |
| 2 | [Time Summary](#2-time-summary) | `TimeSummaryCard.vue` | 🔍 |
| 3 | [Period Comparison](#3-period-comparison) | *(inline in Overview layout)* | 🔍 |
| 4 | [Balance Index](#4-balance-index) | `BalanceIndexCard.vue` | 🔍 |
| 5 | [Time Off Trend](#5-time-off-trend) | `DayOffTrendCard.vue` | 🔍 |
| 6 | [Category Mix Trend](#6-category-mix-trend) | `CategoryMixTrendCard.vue` | 🔍 |
| 7 | [Sidebar](#7-sidebar) | *(layout)* | 🔍 |

### Tab: Charts
| # | Widget | Component | Status |
|---|--------|-----------|--------|
| 8 | [Pie Chart — By Calendar](#8-pie-chart--by-calendar) | `ChartPieWidget.vue` | 🔍 |
| 9 | [Pie Chart — By Category](#9-pie-chart--by-category) | `ChartPieWidget.vue` | 🔍 |
| 10 | [Stacked Chart](#10-stacked-chart) | `ChartStackedWidget.vue` | 🔍 |
| 11 | [Daily Chart](#11-daily-chart) | `ChartPerDayWidget.vue` | 🔍 |
| 12 | [Day-of-Week Chart](#12-day-of-week-chart) | `ChartDowWidget.vue` | 🔍 |
| 13 | [Time-of-Day Chart / Heatmap](#13-time-of-day-chart--heatmap) | `ChartHodWidget.vue` | 🔍 |

### Tab: Table
| # | Widget | Component | Status |
|---|--------|-----------|--------|
| 14 | [Calendar Table](#14-calendar-table) | `CalendarTableWidget.vue` | 🔍 |

### Tab: Workspace
| # | Widget | Component | Status |
|---|--------|-----------|--------|
| 15 | [Notes Editor](#15-notes-editor) | `NoteEditorWidget.vue` | 🔍 |
| 16 | [Note Snippet](#16-note-snippet) | `NoteSnippetWidget.vue` | 🔍 |
| 17 | [Deck Stats](#17-deck-stats) | `DeckStatsWidget.vue` | 🔍 |
| 18 | [Deck Cards](#18-deck-cards) | `DeckCardsWidget.vue` | 🔍 |

---

## 1. Targets

### Screenshot Reference
`.playwright-mcp/element-2026-04-11T22-47-37-841Z.png`

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Targets                                          2%  │
│                                                      │
│  1 / 42 h  Δ −41h                                   │
│  Planned 11.5 h upcoming                            │
│  Days left 7 • Need 5.9 h/day                       │
│  Pace: 2% vs 0% →  [ON TRACK]                       │
│  Forecast: Linear ±1.5h ≈ 0–2.5 h                  │
│  Linear 1h · Momentum 4.5h · Primary: Linear        │
│  [ON TRACK]                                          │
│                                                      │
│  ● Work                              0%  [ON TRACK]  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (empty)         │
│  0h / 32h  Δ −32h  Planned 2.5h  Need 6.4h/day...  │
│  1 calendar                                          │
│                                                      │
│  ● Hobby                             0%  [ON TRACK]  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (empty)         │
│  0h / 6h  Δ −6h  Planned 9h  Need 0.9h/day...      │
│  2 calendars                                         │
│                                                      │
│  ● Sport                             25% [ON TRACK]  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░                │
│  1h / 4h  Δ −3h  Today 1  Need 0.4h/day...         │
│  1 calendar                                          │
│                                                      │
│                                                      │  ← unnecessary empty space
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| T-1 | 🔴 high | `Δ −41h` in red directly next to the hero number — feels alarming at the start of the week |
| T-2 | 🔴 high | Two `[ON TRACK]` badges visible at once — duplicate, confusing |
| T-3 | 🟡 medium | `1 / 42 h` — actual and target value have identical visual weight |
| T-4 | 🟡 medium | `2%` top-right — too small, no context, looks like a bug label |
| T-5 | 🟡 medium | Technical details (`Linear 1h · Momentum 4.5h · Primary: Linear`) always visible — too much noise |
| T-6 | 🟢 low | Excess empty space at the bottom of the widget |
| T-7 | 🟢 low | Sub-category rows are text-overloaded with `Δ`, `Need x/day`, and `calendar` all at once |

### Improvements

- **T-1**: Move delta to a secondary line, smaller font, neutral color when status = On Track
- **T-2**: Single status badge top-right only; remove badges from sub-category rows
- **T-3**: Actual value `1h` large + white; `/ 42 h` smaller + dimmed (`var(--color-text-maxcontrast)`)
- **T-4**: Replace `2%` with a mini progress ring (SVG circle) with the number inside, or inline it into the hero row
- **T-5**: Forecast detail line collapsible (▼ toggle) or show on hover via tooltip
- **T-6**: `height: fit-content` instead of fixed height
- **T-7**: Sub-category row more compact: only `Xh / Yh` + need/day; hide the rest

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Targets                              ● ON TRACK      │
│                                                      │
│   1 h  / 42 h                    ○ 2%               │
│   Δ −41h  ·  Planned 11.5 h  ·  Need 5.9 h/day     │
│                                                      │
│  ● Work        0h / 32h    Need 6.4h/day   5d left  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%              │
│                                                      │
│  ● Hobby       0h / 6h     Need 0.9h/day   7d left  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%              │
│                                                      │
│  ● Sport       1h / 4h     Need 0.4h/day   7d left  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%             │
└─────────────────────────────────────────────────────┘
```

---

## 2. Time Summary

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Time Summary (Overview) · Week                       │
│                                                      │
│  Total today  1.00 h          Later today 11.50 h   │
│                                                      │
│  Sport  1.00 h                                       │
│  1.00 h total                                        │
│  11.50 h planned later                               │
│  1.00 h/day (active days) · 1.00 h/event · ...     │
│  Busiest 2026-04-12 — 1.00 h                        │
│  Workdays  0.00 h avg · 0.00 h median               │
│  Weekend   1.00 h avg · 1.00 h median  (100.0%)     │
│  12 calendars · Opsdash · Sport 100.0% ...          │
│  Top category  Sport — 1.00 h (25% of 4.00 h)      │
│  Activity & Schedule                                 │
│  Events 1 • Active Days 1 • Typical 03:00–05:00     │
│  Weekend 100.0% (Δ vs. offset ...) • Evening 0.0%   │
│  Earliest/Late 03:30 AM / 04:30 AM                  │
│  Overlaps 0 • Longest 1.0 h                         │
│  Last day off 2026-04-11                             │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| S-1 | 🔴 high | No visual separator between sections — everything is one text block |
| S-2 | 🔴 high | "Total today" and "1.00 h total" — duplicate information |
| S-3 | 🟡 medium | Workdays/Weekend stats always visible — only relevant when multiple days logged |
| S-4 | 🟡 medium | `12 calendars · Opsdash · Sport 100.0% ...` — too long, not scannable |
| S-5 | 🟡 medium | "Activity & Schedule" header has no visual separation from the block above |
| S-6 | 🟢 low | Hours always formatted as `1.00 h` instead of `1h` — inconsistent with Targets widget |

### Improvements

- **S-1**: Add section dividers (`border-top: 1px solid var(--color-border)`) or spacing between sections
- **S-2**: "Total today" as hero value; weekly total as a secondary line below
- **S-3**: Workdays/Weekend stats in a collapsed section, or only shown when > 1 active day
- **S-4**: Calendar list truncated to max 2 + `…+10` badge
- **S-5**: "Activity & Schedule" as a proper subheader row with an icon
- **S-6**: Consistent format `1h` or `1:00 h` across all widgets

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Time Summary · Week                                  │
│ ─────────────────────────────────────────────────── │
│   1h today    /   1h this week                      │
│   + 11.5h more planned today                        │
│                                                      │
│   Sport  1h (100%)                                  │
│   Top: Sport — 1h (25% of 4h goal)  ● On Track     │
│ ─────────────────────────────────────────────────── │
│   ▾ Activity & Schedule                             │
│   1 event  ·  typical 03:00–05:00  ·  0 overlaps   │
└─────────────────────────────────────────────────────┘
```

---

## 3. Period Comparison

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Period Comparison · Week                             │
│  Lookback            [Accordion]                     │
│                                                      │
│  ▼ Week -1 (2026-03-30 to 2026-04-05)               │
│     Mar 30–Apr 5    0.00 h    −36.00 h · −100.0%    │
│     Core: Total 0h  Avg/day 0h  ...                  │
│     Pace: Workdays ... Weekend ...                   │
│     Category: Top __uncategorized__ ...              │
│     Pattern: Busiest — Events 0 Active 0 ...        │
│                                                      │
│  + Week -2 ...  36.00 h  −3.25 h · −8.3%           │
│  + Week -3 ...  39.25 h  −41.00 h · −51.1%         │
│  + Week -4 ...  80.25 h  +64.00 h · +393.8%        │
│  + Week -5 ...  16.25 h                             │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| P-1 | 🔴 high | Accordion header is too text-heavy — `(2026-03-30 to 2026-04-05)` and `Mar 30–Apr 5` both show the same date |
| P-2 | 🔴 high | Delta `−36.00 h · −100.0%` has no color signal (red/green) |
| P-3 | 🟡 medium | Expanded row shows 4 sub-sections (Core/Pace/Category/Pattern) — too much at once |
| P-4 | 🟡 medium | `__uncategorized__` — internal key exposed in the UI |
| P-5 | 🟢 low | Deltas like `−100.0%` feel dramatic without context (simply no entries that week) |

### Improvements

- **P-1**: Show only one date format — e.g. `W14 · Mar 30–Apr 5`
- **P-2**: Delta green if positive, red if negative, gray if zero
- **P-3**: Expanded row shows "Core" only by default; rest behind ▼ "Details"
- **P-4**: `__uncategorized__` → `Uncategorized` or `—`
- **P-5**: Tooltip or subtitle: "(no entries this week)"

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Period Comparison · Last 5 Weeks                     │
│                                                      │
│  ▼ W14 · Mar 30–Apr 5                               │
│     0h              −36h (−100%)  ← red             │
│     0 events · 0 active days · — top category       │
│     ▾ Details                                        │
│                                                      │
│  + W13 · Mar 23–29   36h   −3.25h (−8%)   ← red    │
│  + W12 · Mar 16–22   39h   −41h   (−51%)  ← red    │
│  + W11 · Mar 9–15    80h   +64h   (+394%) ← green   │
│  + W10 · Mar 2–8     16h                            │
└─────────────────────────────────────────────────────┘
```

---

## 4. Balance Index

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Balance Index          Last 6 weeks                  │
│                                                      │
│   [0.10]  Current index  Week                       │
│                                                      │
│  -6wk  -5wk  -4wk  -3wk  -2wk  Last  Week          │
│  0.24  0.14  0.24  0.24  0.24  0.24  0.10           │
│  WK9   WK10  WK11  WK12  WK13  WK14  WK15           │
│                                                      │
│  Messages:                                           │
│  • Sport above target by 90.5pp (100% vs 9.5%)      │
│  • Work below target by 76.2pp (0% vs 76.2%)        │
│  • Balance index low (0.10)                          │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| B-1 | 🔴 high | Week history is purely numerical — no visualization, trend not visible at a glance |
| B-2 | 🟡 medium | `[0.10]` as a box — unclear what is good or bad without a scale |
| B-3 | 🟡 medium | `pp` (percentage points) is not intuitive for most users |
| B-4 | 🟢 low | History column widths are uneven |

### Improvements

- **B-1**: Mini bar chart (SVG/CSS bars) instead of a row of numbers — trend immediately visible
- **B-2**: Color scale: 0.0–0.3 red, 0.3–0.7 yellow, 0.7–1.0 green + label "low/ok/good"
- **B-3**: `pp` → plain `%` or written out: "Sport 100% vs. target 10%"
- **B-4**: Equal column widths using `grid` or `flex: 1`

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Balance Index  ·  Last 6 Weeks                       │
│                                                      │
│   0.10  ● low                                        │
│   ▓▓░░░░░░░░  Scale: 0 ──── 0.5 ──── 1.0           │
│                                                      │
│   W9    W10   W11   W12   W13   W14   W15            │
│   ████  ███   ████  ████  ████  ████  ██             │
│  0.24  0.14  0.24  0.24  0.24  0.24  0.10           │
│                                                      │
│   ⚠ Sport over target (100% vs. goal 10%)           │
│   ⚠ Work under target (0% vs. goal 76%)             │
└─────────────────────────────────────────────────────┘
```

---

## 5. Time Off Trend

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Time Off Trend         Last 6 weeks                  │
│                                                      │
│  WEEK 9  · 100% off · 7 off · 0 on                  │
│  WEEK 10 ·  57% off · 4 off · 3 on                  │
│  WEEK 11 ·   0% off · 0 off · 7 on                  │
│  WEEK 12 ·   0% off · 0 off · 7 on                  │
│  WEEK 13 ·   0% off · 0 off · 7 on                  │
│  WEEK 14 · 100% off · 7 off · 0 on                  │
│  WEEK 15 ·  86% off · 6 off · 1 on                  │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| O-1 | 🔴 high | Plain text list — trend not visible at a glance |
| O-2 | 🟡 medium | `7 off · 0 on` is redundant when `100% off` is already shown |
| O-3 | 🟢 low | `WEEK 9` label style is inconsistent with `W9` / `KW` formats used elsewhere |

### Improvements

- **O-1**: Horizontal bar per week (off = muted red fill, on = muted green) — like a mini heatmap
- **O-2**: Hide `X off · Y on` counts when percentage is shown; move to tooltip
- **O-3**: Standardize week label to `W9` or `KW9` across all widgets

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Time Off Trend  ·  Last 7 Weeks                      │
│                                                      │
│  W9   ████████████████░░░░░░░░░░░░░  100% off       │
│  W10  ████████░░░░░░░░░░░░░░░░░░░░░   57% off       │
│  W11  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    0% off       │
│  W12  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    0% off       │
│  W13  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    0% off       │
│  W14  ████████████████░░░░░░░░░░░░░  100% off       │
│  W15  █████████████░░░░░░░░░░░░░░░░   86% off       │
└─────────────────────────────────────────────────────┘
```

---

## 6. Category Mix Trend

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Category Mix Trend  ·  History · last 6 weeks        │
│ Shifting to Sport                                    │
│                                                      │
│  CAT        W9   W10  W11  W12  W13  W14  W15       │
│  Work:       0%   0%   0%   0%   0%   0%   0%       │
│  Hobby:      0% 100%  78%  52%  50%   0%   0%       │
│  Sport:      0%   0%  22%  46%  50%   0% 100%       │
│  Unassigned: 0%   0%   0%   3%   0%   0%   0%       │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| C-1 | 🔴 high | Pure percentage table — no visual share, no stacked bar |
| C-2 | 🟡 medium | `Unassigned` label visible as a raw internal name |
| C-3 | 🟡 medium | "Shifting to Sport" as plain text — not styled as a status chip |
| C-4 | 🟢 low | Work row is all `0%` — adds clutter; should be hidden if constantly zero |

### Improvements

- **C-1**: Stacked bar per week (each color = category) — mix and trend instantly readable
- **C-2**: `Unassigned` → `Uncategorized` or hide if all zeros
- **C-3**: "Shifting to Sport" as a colored status chip next to the widget title
- **C-4**: Hide categories that are 0% across all visible weeks (opt-in to show)

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Category Mix Trend  ·  Last 7 Weeks   ↗ Sport       │
│                                                      │
│  W9   [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  no data     │
│  W10  [████████████████████████░░░░░░]  Hobby 100%  │
│  W11  [█████████████████░░░░░████░░░░]  H78% S22%   │
│  W12  [████████████░░░░░████████░░░░░]  H52% S46%   │
│  W13  [████████████░░░░████████░░░░░░]  H50% S50%   │
│  W14  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  no data     │
│  W15  [░░░░░░░░░░░░████████████████░░]  Sport 100%  │
│                                                      │
│  ● Hobby  ● Sport                                    │
└─────────────────────────────────────────────────────┘
```

---

## 7. Sidebar

### Current State
```
┌──────────────────────┐
│ [⟨] Hide sidebar     │
│ ● Week  ○ Month      │
│ ◀ 2026-04-06–04-12 ▶│
│ [Refresh]            │
│ ─────────────────── │
│ Guided Setup         │
│  [⚙ Setup wizard]   │
│  Revisit the setup.. │
│  • Strategy          │
│    Calendar + Categ… │
│  • Calendars         │
│    Personal, +10     │
│  • Deck              │
│  • Goals             │
│  • Preferences       │
│  • Dashboard         │
│  • Review            │
│ ─────────────────── │
│ [⌨] [🗄]            │
└──────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| SB-1 | 🔴 high | Guided Setup block takes up a lot of space — barely relevant after initial setup |
| SB-2 | 🟡 medium | `2026-04-06–04-12` ISO date format feels unnatural; `Apr 6–12` would be clearer |
| SB-3 | 🟡 medium | `[Refresh]` button has no icon — inconsistent with other icon buttons |
| SB-4 | 🟢 low | `[⌨] [🗄]` buttons at the bottom have no labels — purpose is unclear |

### Improvements

- **SB-1**: Collapse Guided Setup by default after first completion; show only a small ⚙ icon
- **SB-2**: Date format `Apr 6–12, 2026` or relative `W15`
- **SB-3**: Add ↺ icon to the Refresh button
- **SB-4**: Add hover tooltips to icon-only buttons, or show labels on first hover

---

## 8. Pie Chart — By Calendar

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Pie Chart · By calendar                              │
│                                                      │
│         [large donut/pie SVG]                        │
│                                                      │
│  ● Opsdash · Sport   1.0h · 100%                    │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| PC1-1 | 🟡 medium | Widget title "Pie Chart" is generic — no indication of what it shows before looking at the legend |
| PC1-2 | 🟡 medium | Legend uses `·` as separator between calendar and category name — hard to parse |
| PC1-3 | 🟢 low | No center label in the donut showing total hours |

### Improvements

- **PC1-1**: Title `Pie Chart · By calendar` → `Time by Calendar` (more descriptive)
- **PC1-2**: Legend row: `Opsdash / Sport  —  1.0h (100%)` with clearer structure
- **PC1-3**: Add total hours as center label in the donut (e.g. `1h`)

---

## 9. Pie Chart — By Category

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Pie Chart · By category                              │
│                                                      │
│         [large donut/pie SVG — green]                │
│                                                      │
│  ● Sport   1.0h · 100%                              │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| PC2-1 | 🟡 medium | Same generic title problem as widget 8 |
| PC2-2 | 🟢 low | Two nearly identical pie charts side by side — visual redundancy, no immediate distinction |

### Improvements

- **PC2-1**: Title → `Time by Category`
- **PC2-2**: Place both pies in a 2-column grid with a clear visual separator; consider combining into a single widget with a toggle (Calendar / Category)

---

## 10. Stacked Chart

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Stacked Chart · By calendar                          │
│                                                      │
│  [stacked bar SVG — multi-week]                      │
│                                                      │
│  ● Opsdash · Sport                                  │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| SC-1 | 🟡 medium | Title "Stacked Chart" — generic, doesn't say what dimension is stacked |
| SC-2 | 🟡 medium | Legend label `Opsdash · Sport` is the calendar+category compound — same parse issue as pie |
| SC-3 | 🟢 low | No Y-axis label or unit (hours) |

### Improvements

- **SC-1**: Title → `Weekly Hours — Stacked by Calendar`
- **SC-2**: Consistent legend format across all chart widgets
- **SC-3**: Add `h` unit to Y-axis ticks

---

## 11. Daily Chart

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Daily Chart · Totals by calendar                     │
│                                                      │
│  [bar chart per day, multi-week overlay]             │
│                                                      │
│  Week -5 (2026-03-02 to 2026-03-08)                 │
│  Week -4 (2026-03-09 to 2026-03-15)                 │
│  Week -3 ...                                         │
│  Week -2 ...                                         │
│  Current week (2026-04-06 to 2026-04-12)            │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| DC-1 | 🔴 high | Legend labels use full ISO date ranges — `Week -5 (2026-03-02 to 2026-03-08)` is too verbose |
| DC-2 | 🟡 medium | "Daily Chart" — generic title |
| DC-3 | 🟢 low | "Current week" inconsistent label vs. "Week -N" pattern for all others |

### Improvements

- **DC-1**: Legend labels → `W10`, `W11`, … `W15 (now)` — short and consistent
- **DC-2**: Title → `Daily Hours by Calendar`
- **DC-3**: Use `W15 (current)` instead of "Current week"

---

## 12. Day-of-Week Chart

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Day-of-Week Chart · By calendar                      │
│                                                      │
│  [bar chart grouped by Mon–Sun]                      │
│                                                      │
│  Week -5 ... Week -4 ... Week -3 ... Week -2 ...    │
│  Current week                                        │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| DW-1 | 🔴 high | Same verbose legend label issue as Daily Chart (DC-1) |
| DW-2 | 🟡 medium | Title "Day-of-Week Chart" — functional but not user-friendly |

### Improvements

- **DW-1**: Same fix as DC-1 — short week labels `W10`…`W15`
- **DW-2**: Title → `Hours by Weekday`

---

## 13. Time-of-Day Chart / Heatmap

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Time-of-Day Chart · History · last 6 weeks           │
│                                                      │
│  Less hours ←────────────────→ More hours           │
│  0 to 2.5 h                                         │
│                                                      │
│  [heatmap grid: weeks × hours of day]               │
│                                                      │
│  Week -5 ... Week -4 ... Week -3 ... Week -2 ...    │
│  Current week                                        │
│                                                      │
│  "24×7 Heatmap: hours by weekday and hour."         │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| HM-1 | 🔴 high | Same verbose week labels in the legend |
| HM-2 | 🟡 medium | Scale label `0 to 2.5 h` is computed inline text — no visual gradient legend |
| HM-3 | 🟡 medium | Description text `"24×7 Heatmap: hours by weekday and hour."` is redundant at the bottom |
| HM-4 | 🟢 low | `Less hours ←── More hours` directional label is unusually wide and text-heavy |

### Improvements

- **HM-1**: Short week labels throughout
- **HM-2**: Add a small color gradient swatch legend: `0h ░░▒▒▓▓█ 2.5h`
- **HM-3**: Remove the description text; the widget title conveys enough
- **HM-4**: Replace directional text with a compact inline gradient swatch

---

## 14. Calendar Table

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Calendar Table                                       │
│                                                      │
│  [table with rows per event, columns: date/time,    │
│   calendar, duration, status, progress bar]         │
│                                                      │
│  Work  (section header)                             │
│  Hobby (section header)                             │
│  Sport                                              │
│    ████████  1h / 4h  [ON TRACK]                    │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| CT-1 | 🟡 medium | Section headers (Work, Hobby, Sport) have no visual weight differentiation from data rows |
| CT-2 | 🟡 medium | `[ON TRACK]` badge repeated per row — same visual noise as in Targets widget |
| CT-3 | 🟢 low | Progress bars in a table column are narrow and hard to read at table row height |

### Improvements

- **CT-1**: Section headers as sticky rows with background color + uppercase label
- **CT-2**: Status badge only on rows where status differs from default (e.g. only show "AT RISK" or "BEHIND")
- **CT-3**: Progress bar height at least 6px, or replace with a simple `Xh / Yh` text column

---

## 15. Notes Editor

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Notes                                    [Save]      │
│                                                      │
│  Last week   [Use previous ▶] (disabled)            │
│  ┌─────────────────────────────────────┐            │
│  │ (empty textarea)                    │            │
│  └─────────────────────────────────────┘            │
│                                                      │
│  ▸ This week                                        │
│  ┌─────────────────────────────────────┐            │
│  │ Write this week notes…              │            │
│  └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| NE-1 | 🟡 medium | `[Save]` button is top-right, far from the textarea — standard UX puts Save near the input |
| NE-2 | 🟡 medium | "Last week" section is always visible but `Use previous` is disabled — creates confusion |
| NE-3 | 🟢 low | No character count or saved/unsaved indicator |
| NE-4 | 🟢 low | Textarea placeholder `Write this week notes…` — grammatically awkward |

### Improvements

- **NE-1**: Move `[Save]` below the active textarea, or show as a floating "Unsaved changes" bar
- **NE-2**: Collapse "Last week" by default if empty; only expand when `Use previous` makes sense
- **NE-3**: Add a subtle `● Unsaved` dot indicator when content has changed
- **NE-4**: Placeholder → `Notes for this week…`

---

## 16. Note Snippet

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Note                                                 │
│                                                      │
│  —                                                   │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| NS-1 | 🟡 medium | Widget shows `—` when empty — gives no affordance to add a note |
| NS-2 | 🟢 low | Title "Note" (singular) vs. "Notes" on the editor widget — inconsistent naming |

### Improvements

- **NS-1**: When empty, show a subtle `+ Add note for this week` CTA instead of `—`
- **NS-2**: Standardize to "Notes" across both widgets

---

## 17. Deck Stats

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Deck stats · Showing week                            │
│                                                      │
│  Open now        (Current snapshot)   5             │
│  Overdue now     (Current snapshot)   0             │
│  Mine open       (Current snapshot)   0             │
│  Created in range (Within week)       0             │
│  Completed in range (Within week)     0             │
│  Due in range    (Within week)        0             │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| DS-1 | 🟡 medium | Sub-labels `(Current snapshot)` and `(Within week)` repeated on every row — noisy |
| DS-2 | 🟡 medium | All values are `0` except "Open now" — a wall of zeros provides no value |
| DS-3 | 🟢 low | Numbers right-aligned but no visual bar or spark — hard to sense magnitude |

### Improvements

- **DS-1**: Group rows under two sub-headers: "Current Snapshot" and "This Week" instead of repeating inline
- **DS-2**: Dim or de-emphasize zero rows; highlight non-zero values
- **DS-3**: Add a small inline bar or color accent on non-zero values

### Mockup — Target State

```
┌─────────────────────────────────────────────────────┐
│ Deck Stats                                           │
│                                                      │
│  Current snapshot                                    │
│  Open         5  ████░░░░░░                         │
│  Overdue      0  —                                  │
│  Mine open    0  —                                  │
│                                                      │
│  This week                                           │
│  Created      0  —                                  │
│  Completed    0  —                                  │
│  Due          0  —                                  │
└─────────────────────────────────────────────────────┘
```

---

## 18. Deck Cards

### Current State
```
┌─────────────────────────────────────────────────────┐
│ Deck cards · Showing week selection        5 cards   │
│ [Open Deck ↗]  [Refresh]                            │
│                                                      │
│ [Open·All 5][Open·Mine 0][Done·All 0][Done·Mine 0]  │
│ [Arch·All 0][Arch·Mine 0][Due·All 0][Due·Mine 0]    │
│ [Due today·All 0][Due today·Mine 0]                 │
│ [Created today·All 0][Created today·Mine 0]         │
│ [Read more inside 4][Action needed 1]               │
│                                                      │
│  Active  1. Open to learn more...    Read more      │
│  Active  2. Drag cards left and right  Read more    │
│  Active  Create your first card!   Action needed    │
│  Active  3. Apply rich formatting    Read more      │
│  Active  4. Share, comment...        Read more      │
└─────────────────────────────────────────────────────┘
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| DK-1 | 🔴 high | 14 filter buttons in a row — overwhelming, most are zeros |
| DK-2 | 🟡 medium | `Open · All` / `Open · Mine` split adds cognitive load — most users only need `Open` |
| DK-3 | 🟡 medium | Card rows show `Active` status label but it's the same for all — redundant |
| DK-4 | 🟢 low | `[Open Deck ↗]` and `[Refresh]` are visually equal weight — secondary actions shouldn't compete with content |

### Improvements

- **DK-1**: Show only filters with non-zero counts by default; collapse zero-count filters
- **DK-2**: Merge `All`/`Mine` into one toggle; default to `All`, toggle to `Mine`
- **DK-3**: Remove `Active` label from rows; show status badge only for non-default states (Overdue, Done)
- **DK-4**: Make `Open Deck ↗` a subtle text link; make `Refresh` an icon-only button

---

## Priority Overview

| Priority | IDs | Effort |
|----------|-----|--------|
| 🔴 Now | T-1, T-2, T-3, S-1, P-2, B-1, O-1, C-1, DC-1, DW-1, HM-1, DK-1 | Medium |
| 🟡 Soon | T-4, T-5, S-2, S-3, P-1, P-3, B-2, SB-1, PC1-1, PC2-2, DS-1, DS-2, NE-1, NE-2, DK-2, DK-3 | Medium |
| 🟢 Nice-to-have | T-6, T-7, S-4–S-6, P-4, P-5, B-3, O-2, C-2–C-4, SB-2–SB-4, PC1-3, SC-3, DC-3, HM-2–HM-4, CT-2, CT-3, NE-3, NE-4, NS-1, NS-2, DS-3, DK-4 | Small |
