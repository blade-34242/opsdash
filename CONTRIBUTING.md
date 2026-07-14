# Contributing Guide

Thanks for your interest in improving this app! A few guidelines:

Long-form internal docs, release runbooks, and ops notes live in the sibling `opsdash-docs` and `opsdash-ops` workspace repos. Keep this repo's docs limited to contributor-facing guidance.

## Development
- Requirements: Node.js 20+, Nextcloud 31-34.
- Install deps: `npm ci`
- Build: `npm run build` (produces `js/.vite/manifest.json` + hashed assets).
- Dev: `npm run dev` for frontend iteration; build for NC integration.

## Coding Standards
- PHP: PSR-12, strict types where possible, thin controllers, logic in services.
- TypeScript: prefer strict typing, avoid `any`, keep components small (<150 LOC).
- Security: never add state changes to read endpoints; POST+CSRF for writes.
- CSP: no inline scripts; minimize inline styles (prefer CSS classes/files).

## Commits & PRs
- Keep PRs scoped; include tests or testing steps.
- Update app-facing docs (`README.md`, `SECURITY.md`, `CHANGELOG.md`, this file) when behavior changes.
- Update sibling long-form docs when architecture, release, or ops workflows move.
- Describe any performance impact and migration notes.

## Tests (recommended)
- `npm run test:unit` (Vitest) and `composer run test:unit` (PHPUnit).

## Reporting Issues
- Include NC version, app version, steps to reproduce, and server logs (sanitized).
