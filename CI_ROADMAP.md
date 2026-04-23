# CI Roadmap

## Current temporary state
- Forgejo server matrix runs `npm`, `composer`, build, PHPUnit, and PHP static analysis.
- Playwright smoke is temporarily disabled in Forgejo so the matrix can unblock and the next migration phase can continue.

## Next phase target
1. Replace or harden the temporary Nextcloud web server used in Forgejo.
2. Make E2E state deterministic so onboarding, release-notes, and profile tests do not depend on prior user state.
3. Re-enable Playwright smoke and restore artifact upload once the Forgejo browser path is stable.
