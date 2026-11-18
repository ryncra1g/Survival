---
name: release-check
description: Run ReadyPlan's full pre-release check (types, unit + safety tests, production build, browser tests, 10-household smoke loop, sample + demo rebuild) and report pass/fail. Use before any deploy or when asked "is it ready to ship?".
---

# Release check

0. **Name check:** `NEXT_PUBLIC_BRAND_NAME` must be set in the deploy environment to the final product name.
   If it's unset or "ReadyPlan" (the working name, already used by another emergency-planning app), STOP: a
   production deploy is not allowed. Everything else below can still run for a preview.

Run these in order from the repo root. Stop at the first failure, show its output, and fix it (or report it) before continuing.

1. `npm run lint` — type-check must be clean.
2. `npm test` — all unit, safety (incl. 300-household fuzz), persona and affiliate tests.
3. `npx next build` — production build.
4. `npm run test:e2e` — browser tests on an iPhone viewport.
5. Smoke loop:
   ```
   rm -rf .data/loop
   READYPLAN_DATA_DIR=.data/loop APP_URL=http://localhost:3300 ADMIN_EMAILS=admin@example.com CRON_SECRET=loop npx next start -p 3300 &
   npm run smoke
   ```
   All 10 lines must say PASS. Stop the server afterwards.
6. `npm run sample` and `npm run demo` — regenerate the sample plan and the shareable demo.
7. Run the `/code-review` and `/security-review` skills on the changes since the last release.

Report a short table: step → pass/fail → notes. Then list anything that changed user-visible behaviour, so the owner can re-check it on a phone.
