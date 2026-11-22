# Build log: owner brief D1–D13 (docs/BUILD_BRIEF.md)

Plan: four stacked draft PRs. A, B and C are the launch track. D is the accounts track, behind `ACCOUNTS_ENABLED`, which defaults to off.
If a session restarts: re-read this file and continue from the first task that isn't done. Never redo a finished task.

## Final report
_(written at the end of the run)_

## Owner decisions on the plan's questions (accepted defaults)
1. **Save-bar wording.** With accounts off: "Saved on this device for 30 days. Confirm your email to keep it and use it on any device." With accounts on: "Your plan and inventory are saved on this device for 30 days. Confirm your email to keep them and use them on any device."
2. **My places note at launch.** "This address isn't saved. Confirm your email to save your places and use them on any device." At launch the address isn't saved anywhere, so it's the one exception to the "saved on this device" wording.
3. **Ready-to-eat food and kits.** Shown as calorie targets only, never as can or pouch counts. Only bulk staples get pound amounts and containers.
4. **Calendar reminders.** Each one starts on the day it's added and repeats at the intervals already in the plan's maintenance table.
5. **Migrations 0004 and 0005.** Whether they're applied in production isn't recorded in the repo. That's noted here only; the owner applies migrations. The new migrations 0006 and up are files only.

## Assumptions for owner review
- [A1] Signed-in menu with accounts off shows only what exists today: My plan, Privacy & data (export/delete on /account), Sign out. The accounts-track items appear only with ACCOUNTS_ENABLED.
- [A2] The PDF keeps its sources page (it's read offline); only the web plan moved full sources to /sources. The standalone demo's "Sources & safety" link points to /sources, which only exists on the real site.
- [A3] Email me my plan in the Share menu opens the save bar's form (one email entry point). When an email is already given, the menu item is hidden and the status line stays.
- [A4] The sample-plan preview card was removed from the front page; the chapter cards carry the example values instead (D10: the front page is about building your own plan).
- [A5] The generate route streams only when the client asks (Accept: application/x-ndjson); other callers get the same JSON as before. If a host buffers the stream, all stages tick when the plan is ready.
- [A6] Copy for AI drops any clause that mentions a health topic, even generic ones in shared text (e.g. "medication lists" in the yearly maintenance line), as a second guard. Region is the ZIP's region name (e.g. "Long Island"), never the ZIP.
- [A7] /release-check's /code-review and /security-review steps were done as a focused manual review of each batch's auth-touching code (new routes use sameOrigin + loadPlanFor; /api/auth/me returns no personal data), not as separate multi-agent runs.
- [B1] Q2 destinations: Family or friends, Second property, Raw land, Hotel or motel, Public shelter, Not sure yet. A distance is asked for the first four (they're driven to), so hotel gets the fuel math; public shelter and "not sure yet" get their own steps instead.
- [B1] v1 migration: "shelter in place" → approach "Stay home when it's safe" + destination "Not sure yet"; a v1 fallback → that destination, approach "Family or friends" (friends/family) or "Another property" (second property, raw land).
- [B2] Storage that implies a feature (e.g. garage) also sets the feature (hasGarage), rather than rejecting the answer. This keeps old saved answers valid; the questionnaire only offers spaces the home has. "Very limited space" and "No suitable storage" can't be combined with other spaces (validation).
- [B2] A shed someone can't use for supplies still gets a step: it's the place for gas cans and propane (same guidance as the existing shed storage step).
- [B3] The personal-filter note says only that it belongs in the go-bag; a claim that it can't supply a household was left out (no official source).

## Tasks
| ID | Decision | Status | Commit | Note |
|---|---|---|---|---|
| 0.1–0.4 | — | done | f5a37b7 | Brief, build log, FACTCHECK, decisions recorded in BACKLOG (open decisions closed) |
| 0.5 | D1, D3b | done | 05f3d50 | lib/flags.ts: ACCOUNTS_ENABLED, DIY_TIPS_ENABLED, on only for "true", default off |
| A1 | D9 | done | 571122e | Top-right site menu (<details>, works without JS); /api/auth/me returns only signed-in + flag |
| A2 | D9 | done | 59bb14c | /help, /about, /sources; plan keeps guidance line, affiliate disclosure above Buy, safety callouts |
| A3 | D9, D2 | done | 47d8fd4 | Share menu + one slim save bar ("Saved on this device for 30 days…"); tests/copy.test.ts |
| A4 | D10 | done | 2aede82 | Four chapter cards with engine example values; small "See a sample plan" button |
| A5 | D11 | done | 8a6d55b | Three real stages streamed as NDJSON; calm card; reduced motion; live region; rebuild keeps spinner |
| A6 | D12b, D13 | done | c46914c | Copy for AI (allow-list text, 5 ground rules); "ai_copy" events; admin tile |
| A7 | — | done | 2066524 | Batch A verified: lint ✓, 398 unit ✓, build ✓, 11 e2e ✓, smoke 10/10 ✓, screenshots light+dark ✓ |
| B1 | D4 | done | 0075087 | Approach + destination questions on their own screen; hotel/shelter/not-sure steps with Ready.gov / Red Cross links (one schema bump with B2–B3) |
| B2 | D5 | done | 0075087 | Home features = property only (adds shed); storage offers only spaces the home has + Closets / Other indoor / Very limited / No suitable storage |
| B3 | D6 | done | 0075087 | Filter type household / personal / both / none; personal counts for the go-bag only |
| B4 | — | done | (this commit) | Batch B verified: lint ✓, 429 unit ✓ (incl. pathways 69 + 80 pairwise, migrate), build ✓, 10 e2e ✓, smoke 10/10 ✓, screenshots light+dark ✓ |

## Blocked
_(none yet)_
