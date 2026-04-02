# Documentation Map

A quick guide to the docs that matter most when working on the Operational Dashboard.

## Quick Start
- **DEV_WORKFLOW.md** - single home for build loop, config knobs, seeding scripts, caches, and ops playbook.
- **TESTING.md** - unified strategy + how-to for Vitest/Playwright/PHPUnit, integration fixtures, and roadmap.
- **API.md** - endpoints exposed by the app (`/load`, `/persist`, `/notes`, `/ping`) with payload shapes.

## Architecture & Code
- **ARCHITECTURE.md** - high-level view of controllers, services, and Vue SPA structure.
- **DIRECTORY_STRUCTURE.md** - what ships in the App Store tarball and why.
- **ROADMAP.md** - consolidated backlog and priorities.

## Feature Specs
- **ONBOARDING_WORKFLOW.md** - current 8-step wizard flow, quick-setup behavior, goal suggestion rules, and persistence notes.
- **DECK_INTEGRATION.md** - API usage, seeding helpers, fixtures, and the current split between `Deck cards` and `Deck stats`.
- **REPORTING_FEATURE.md** - recap cadence, delivery channels, and notification/email plans.
- **SIDEBAR_CONFIGURATION.md** / **SIDEBAR_RANGE_CONTROLS.md** - every sidebar control, persistence path, and UX rationale.
- **LIGHT_DARK_THEMING.md** - theme tokens, bootloader behaviour, and testing notes.

## Ops, Config & Seeding
- **DEV_WORKFLOW.md** - dev loop, runtime behaviour, caps, cache flushing, seeding, and ops checklists.
- **PERFORMANCE.md** - deeper profiling guidance (Perfetto, NC logging).
- **KNOWN_ISSUES.md**, **TROUBLESHOOTING.md** - production quirks, reproduction tips, fixes.

## Release & Publishing
- **CHANGELOG.md** - user-facing release notes.
- **RELEASE.md** - consolidated build/sign/upload workflow, App Store publishing policy, and checklist.

> Tip: run `npm run build` before packaging so `js/.vite/manifest.json` and `js/assets/main-<hash>.js` stay in sync. All docs assume that hashed build output.

Historical references such as `CONFIGURATION.md`, `OPERATIONS.md`, `SEEDING.md`, `TESTING_STRATEGY.md`, `TESTING_IMPROVEMENT_PLAN.md`, `INTEGRATION_TESTING.md`, `TARGETS_PLAN.md`, `TARGET_STRATEGIES.md`, `NEXT_STEPS.md`, and `ARCHITECTURE_REFACTOR_PLAN.md` now live under `archive/` after being merged into `DEV_WORKFLOW.md`, `TESTING.md`, or `ROADMAP.md`.
