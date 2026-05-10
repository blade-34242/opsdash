# CI Roadmap

## Current temporary state
- Forgejo server matrix runs `npm`, `composer`, build, PHPUnit, and PHP static analysis.
- Forgejo now runs the narrow must-pass Playwright smoke path only; broader dashboard E2E coverage remains outside the Forgejo matrix until the browser path is proven stable there.

## Next phase target
1. Replace or harden the temporary Nextcloud web server used in Forgejo.
2. Keep E2E state deterministic so onboarding, release-notes, and profile tests do not depend on prior user state.
3. Expand from must-pass smoke back to broader Playwright coverage once the Forgejo browser path is stable.
