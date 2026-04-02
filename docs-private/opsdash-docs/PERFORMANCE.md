# Performance Guide

## Server Aggregation
- Time range limited to week/month; offset clamped to +/-24.
- Soft caps: 2,000 events per calendar, 5,000 total per request.
- Response includes `meta.truncated` and `meta.limits` when caps are hit.
- Response cache is available; see `DEV_WORKFLOW.md` for toggles.
- Lookback chart history is optional and only computed when `include=lookback` is requested.
- Repeated collector calls for identical query windows are reused within one `/overview/load` request via a request-local cache in `OverviewEventsCollector`.

## Client Rendering
- Canvas draws are batched via `requestAnimationFrame`.
- Resize events are debounced; avoid observing large containers to prevent feedback loops.
- Heatmap uses a blue->purple gradient tuned for contrast.
- Initial load uses core-first/data-second: layout renders after the core payload, then charts/stats hydrate on the data payload.
- Default widget presets are bootstrapped in the HTML template to avoid a blank main area on hard reloads.
- Widget loading overlays are first-load only; refresh keeps stale content on screen and surfaces a compact `Updating...` hint in the toolbar.
- Notes fetch runs after main data hydrate and does not block dashboard readiness.
- Frontend bundle size is now a tracked follow-up area; see `BUNDLE_SIZE_PLAN.md` for the chunk-splitting strategy instead of just raising the Vite warning limit.

## Tips
- For extremely busy users, suggest filtering calendars or switching to weekly range.
- Admins can monitor caps/truncation via logs and UI banner.
