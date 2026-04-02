# Bundle Size Plan

## Context

The frontend build currently completes successfully, but Vite warns that the main bundle is larger than the default chunk-size threshold after minification.

This is not a release blocker by itself, but it is a real maintenance and performance signal:
- more JavaScript downloaded on first load
- slower parse/execute time on weaker devices
- less headroom for future widget and onboarding work

The warning should be treated as a planned performance task, not silenced by raising the threshold.

## Current Position

Observed behavior:
- build succeeds
- warning is emitted for the main app chunk
- the dashboard still works, but the app entry is carrying too much code in one bundle

What this probably means in this codebase:
- too much widget code is still reachable from the main entry
- chart-specific logic is expensive and likely a top contributor
- onboarding/config overlays and less-frequent widgets may still be pulled in earlier than necessary

## Goal

Reduce first-load JavaScript without changing user-facing behavior.

Success criteria:
- smaller initial app chunk
- no regression in widget rendering or edit/config flows
- no broken hashed asset output
- tests/build remain green

## Principles

1. Do not hide the warning by increasing Vite limits unless we have already done the real work.
2. Prefer structural code-splitting over micro-optimizing utilities.
3. Split rare paths first:
   - advanced configuration
   - onboarding flows
   - heavy chart widgets
   - optional Deck-related widgets
4. Keep the dashboard bootstrap path stable:
   - layout should still render fast from the core payload
   - async widgets should show a reasonable loading state

## Likely Split Targets

### 1. Heavy chart widgets

Best first candidates:
- `chart_hod`
- `chart_stacked`
- `chart_per_day`
- `chart_dow`
- chart helper code that is only needed once those widgets mount

Reason:
- chart rendering logic is heavier than simple stat/list widgets
- users often do not need every chart on first paint

### 2. Onboarding-only UI

Candidates:
- onboarding wizard steps
- preview cards and helper modules only used during setup/rerun

Reason:
- onboarding is important, but not part of the steady-state dashboard path

### 3. Advanced widget configuration

Candidates:
- large config overlays
- complex option builders that are only needed in edit mode

Reason:
- regular dashboard viewing should not pay the full edit-mode cost up front

### 4. Optional Deck surfaces

Candidates:
- `Deck cards`
- `Deck stats`
- shared Deck widget helpers if not needed elsewhere at startup

Reason:
- useful, but not universally present on every dashboard

## Proposed Implementation Phases

## Phase 1: Measure

Before changing chunking rules:
- run a production build
- inspect which modules dominate the main chunk
- record current bundle sizes in a short note or PR description

Recommended checks:
- Vite output sizes
- module graph for the main entry
- browser first-load behavior on the overview page

## Phase 2: Safe structural splits

Make the lowest-risk code-splitting changes first:
- verify all widgets are loaded through async registry entries where practical
- move rare widget/helper imports behind those async boundaries
- keep shared primitives in the base bundle only when they are truly common

Expected outcome:
- main chunk drops without changing widget semantics

## Phase 3: Manual chunk strategy

If Phase 2 is not enough:
- add targeted `manualChunks` rules in Vite config
- split by functional area, not by random file count

Preferred chunk families:
- chart widgets
- onboarding
- deck
- editor/config UI

Avoid:
- too many tiny chunks
- unstable chunk boundaries that churn on every small refactor

## Phase 4: Verify real UX

After splitting:
- build again
- compare initial chunk size
- verify dashboard startup, widget rendering, and edit mode
- verify no lazy widget stalls or broken chunk loads in Nextcloud

## Test Plan

Minimum validation after each phase:
- `npm run test:unit`
- `npm run build`

Recommended smoke coverage:
- overview page initial load
- open widget edit mode
- mount chart widgets
- run onboarding overlay
- render Deck widgets when enabled

## Non-Goals

Not part of this task:
- rewriting charts for canvas performance
- reducing PHP payload size
- changing user-visible widget behavior
- raising the warning threshold without doing the real split work

## Recommended Next Action

Start with a one-pass bundle analysis and then implement Phase 2 on the chart widgets first.

That is the highest-probability win for this codebase with the lowest behavioral risk.
