# Build log: owner brief D1–D13 (docs/BUILD_BRIEF.md)

Plan: four stacked draft PRs. A, B and C are the launch track. D is the accounts track, behind `ACCOUNTS_ENABLED`, which defaults to off.
If a session restarts: re-read this file and continue from the first task that isn't done. Never redo a finished task.

## Final report

**Status: all four batches built and verified. Nothing merged, no migrations applied, both flags still off.**

### PRs (stacked drafts, merge in this order, only with the owner's OK)
#6 (headline) → [#7 Batch A](https://github.com/ryncra1g/Survival/pull/7) → [#8 Batch B](https://github.com/ryncra1g/Survival/pull/8) → [#9 Batch C](https://github.com/ryncra1g/Survival/pull/9) → #10 Batch D (accounts track).

### What shipped
- **A, shell and front page:**
  - site menu (D9);
  - Help, About and Sources & safety pages;
  - Share / Download / Print menu;
  - one slim save bar ("Saved on this device for 30 days…");
  - four chapter cards and a small sample button on the front page (D10);
  - loading screen with three real stages (D11);
  - Copy for your AI assistant, with an admin click count (D12b, D13).
- **B, questionnaire (answers v2, old plans migrate automatically):**
  - evacuation approach and destination (D4);
  - home features vs usable storage, including "No suitable storage" (D5);
  - water filter type (D6).
- **C, plan content and layout:**
  - Good to know / To do / To have labels (D8);
  - card-grid plan view with key numbers (D10);
  - Compare options, with safety items first and commission never affecting the order (D3);
  - food approaches with the calorie total fixed (D7);
  - water treatment layers and a water kit, with no dosages anywhere (D6);
  - DIY tips behind `DIY_TIPS_ENABLED` and the new linter rule (D3b);
  - "When you must leave" in every plan, plus a printable places page that saves and sends nothing (D4);
  - Add to my calendar (.ics) and a printable maintenance list (D12).
- **D, accounts track, all behind `ACCOUNTS_ENABLED`:**
  - My plans;
  - inventory: have / need / bought / low, with quantity and expiry;
  - "To have" items linked to the inventory;
  - My places, encrypted;
  - Overview / Inventory / Report tabs;
  - the food mix on the Overview;
  - tips matched to the inventory;
  - opt-in email reminders;
  - export and delete cover everything;
  - authorization tests.
  - Migrations 0006–0008 are files only.

### Test results (Windows, final branch)
- Type-check ✓
- 504 unit tests ✓, including the 300-household safety fuzz, the pathways (69 single answers, 80 pairwise households, 2,419 pairs), authorization, migration and calendar tests
- Production build ✓
- 14 browser tests ✓: 12 with the flags off, 2 with the flags on
- Smoke run 10/10 ✓
- Phone screenshots in light and dark for every changed screen (`.data/screens/A–D`)

### Blocked
None.

### For the owner
- **Fact-check:** 54 rows in `docs/FACTCHECK.md` are waiting for review. 1 sentence was left out because no official source was found. Approve the DIY rows before turning on `DIY_TIPS_ENABLED`.
- **Assumptions:** see the list below. The top ones to review:
  - "$X over your budget" compares against the top of the stated range.
  - The food-mix rule and two price estimates.
  - Bleach drop amounts were replaced with a pointer to the label and EPA/CDC.
  - The email leaves out detail tables to stay under Gmail's clipping limit.
  - A saved place's distance doesn't rebuild the plan by itself.
- **Owner-only steps:**
  - apply migrations 0004–0008 (whether 0004 and 0005 are already live isn't recorded);
  - choose when to turn each flag on;
  - merge the PRs.

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
- [C2] Section cards show a key number where the engine has one (water, calories, steps, fuel reserve, pet food...) and a 2-line summary otherwise.
- [C3] "$X over your budget" compares with the top of the stated range ($500 / $1,500 / $5,000; none for $5,000+), using the middle of each price range. The first aid kit is now essential (never deferred) so safety items always lead.
- [C4] Draft food-mix rules (not live yet): no storage, no way to cook without grid power, or a 72-hour plan → all ready-to-eat; very limited space → 75% ready / 25% bulk; otherwise 50/50; $5,000+ moves a quarter of the bulk share to kits. Ready-to-eat planning cost $3 per 1,000 kcal and 30 lb per 5-gal bucket are estimates for owner review.
- [C4] Recommended food mix follows the plan's eating order: ready-to-eat for the first 14 days, bulk staples after; all ready-to-eat with no suitable storage or no way to cook without grid power (apartment, non-gas stove, no backup power); $5,000+ moves a quarter of the bulk share to ration & freeze-dried kits. A 50/50 split was tried first but made ready-to-eat so costly the sample household could no longer afford its generator.
- [C4] The storage buckets item is now priced per bucket ($20–35, estimate) and sized to the bulk staples; it can land under "buy next" when the budget is full (the budget is a target).
- [C4/C5] To keep the plan email under Gmail's clipping limit: detail tables (per-person calories, Compare food options, the staples reference) and the duplicate compact shopping list stay on the web and in the PDF; the email shows each item's chosen level only.
- [C5] The bleach callout no longer gives drop amounts (owner D6: never write dosages). It keeps CDC's boiling time (1 minute, 3 above 6,500 ft): a time, not a dosage.
- [C6] Tips are built into every plan's data and linted always; the web, PDF and email render them only when DIY_TIPS_ENABLED is on, so turning the flag on needs no rebuild.
- [C7] The launch places page is reachable only by the browser that can open the plan (same rule as the plan). Directions links go to Apple Maps or Google Maps only when tapped.
- [D2] Inventory lives on each plan (like checklist ticks), so it follows the plan's access rule: this browser for 30 days without an account, any device with one. "Household & inventory" in the menu opens the newest plan's inventory.
- [D2] Items marked have or bought in the inventory also count as "I have this" on the dashboard's shopping list. Ticking "I have this" on the dashboard seeds the inventory once (it isn't two-way live sync).
- [D4] A saved place can carry the person's own distance estimate. It doesn't change the plan by itself: the fuel math still comes from the "If you have to leave" answer (no geocoding, no map service). Wiring a saved place's distance into a rebuild is left for owner review.
- [D8] Reminder schedules count from the newest plan's creation date. "When it's due" follows the maintenance table's intervals; "Monthly" and "Every 3 months" override them. Reminder emails are opt-in, not marketing, and are skipped for unsubscribed addresses.
- [D9] Unit tests call the real route handlers; vitest stubs the "server-only" import, which only guards client bundles.
- [R1] The linter counts a negation only when it directly governs the hazard (right before it, or "X are never safe / must not be used" right after). LLM summaries are stricter: any combustion, back-feed or DIY hazard word rejects that summary and its template is used instead (a section whose rewrite would need one of those words keeps its template wording).
- [R2] Food buckets count dry staples only (rice, beans, oats, pasta, powdered milk) at 33/30/20/20/25 lb per 5-gallon bucket. These are estimates: no official source was found (FACTCHECK FD-2-*).
- [R3] Copy for AI: 30 clicks per browser and 120 per IP per hour, then 429; at most one ai_copy event per plan per UTC day (the admin count is now "plans copied per day", not clicks).
- [R9] Security fix M1: "Email me my plan" for an address that already has an account no longer moves the plan, changes marketing consent or ties the browser to that account. It emails a link carrying a signed claim; the plan is attached when the address owner uses it. The reply is "check your inbox" either way, so it no longer reveals which addresses are confirmed. Signed-in owners keep the instant "sent" path. The "send me updates" tick travels signed in that link and is applied only when the owner uses it. Confirmed accounts get the 1-hour sign-in email, unconfirmed ones the 7-day confirm email.
- [R9] Security fix M2: the browser that built a plan opens it only while the plan isn't in a confirmed account. After the owner confirms (on any device), other browsers need the sign-in link. UX cost: someone who confirms on their phone has to sign in on the laptop where they built the plan. Copy ("Saved on this device for 30 days…") is unchanged and still true before confirming.
- [R9] Security review LOW items, not fixed (defense in depth, no concrete exploit): (1) the cron secret is compared with !== rather than a constant-time compare (app/api/cron/emails/route.ts); (2) Supabase account deletion removes stored PDFs by the plans the user owns now, not by the storage prefix `<userId>/` (lib/server/store/supabase.ts deleteUserCascade); (3) the email `esc` helper doesn't escape single quotes (safe today: all attributes are double-quoted); (4) sameOrigin trusts x-forwarded-host (fine behind Vercel; compare to APP_URL only if self-hosted); (5) decodeSession doesn't validate the shape of the signed JSON; (6) the plan-id check in loadPlanFor is a loose UUID regex (the store uses parameterised lookups). Full list: docs/review/07_SECURITY_REVIEW.md.

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
| C1 | D8 | done | 8f2a7ec | Kinds on every block (Good to know / To do / To have), labels on web + PDF, tests/kinds.test.ts |
| C2 | D10 | done | e9fea6c + 04ac3fd | Card grid per chapter (2 across on phones) with engine key numbers; e2e 10/10 after fix |
| C3 | D3 | done | bc59569 | Compare options (Lower-cost / Upgrade / Other choices, difference, new total, $X over budget); safety-first order; first aid essential; tests/budget.test.ts |
| C4 | D7 | done | 1211eba + 0082a7f | Food mix (bulk / ready-to-eat / kits), calorie total fixed, buckets sized to bulk pounds, switch or mix, comparison table, notes; tests/food.test.ts |
| C5 | D6 | done | 19a0203 | Treatment layers with what each doesn't remove (CDC), no dosages (bleach rule points to label + EPA/CDC), water kit, 2 catalog items; tests/water.test.ts |
| C6 | D3b | done | 699df6d | Tip library + unsafe_diy linter rule; tips built into plans but shown only with DIY_TIPS_ENABLED (off); tests/tips.test.ts |
| C7 | D4 | done | a2ed3aa | "When you must leave" in every plan + override line + backup-destination To do; /plan/<id>/places (nothing saved or sent); e2e sentinel check |
| C8 | D12, D12b | done | fec1a2c | Maintenance as data (table text unchanged), .ics calendar, printable list, Stay ready row with Copy for AI; tests/calendar.test.ts |
| C9 | — | done | (this commit) | Batch C verified: lint ✓, 472 unit ✓, build ✓, 12 e2e ✓, smoke 10/10 ✓ (smoke now waits for both attachments; level count reads Compare options), screenshots light+dark ✓ |
| D1 | D2 | done | ea8003e | Tiers: no account = saved on this device for 30 days (existing purge, now tested to never remove an account's plans); /account/plans lists every plan on the account |
| D2 | D2 | done | 7ace44d + ea8003e | Inventory (have/need/bought/low, qty, expiry) on the plan, encrypted; migration 0006 + file store; /plan/<id>/inventory; old ticks seed "have" |
| D3 | D8 | done | 262efc6 | "To have" items link to their inventory row; have/bought come off the shopping list |
| D4 | D4 | done | 7ace44d + ea8003e | My places saved encrypted (migration 0007), printable, directions on tap; never in emails, analytics or AI |
| D5 | D9/D10 | done | 262efc6 | Overview / Inventory / Report tabs on the plan page |
| D6 | D7 | done | 262efc6 | Food mix card on the Overview (same switch; calorie total unchanged) |
| D7 | D3b | done | 262efc6 | Tips show "You have: …" for materials matched to owned inventory |
| D8 | D12 | done | 7ace44d + 262efc6 | Opt-in email reminders per item and frequency (migration 0008), separate from marketing; sent by the daily cron, one email a day |
| D9 | D2 | done | 262efc6 + 42c8e7a | Export includes inventory, places, reminder prefs; delete removes them; tests/authz.test.ts (other user, other browser, no session, other site all refused; flag off = 404) |
| D10 | — | done | (this commit) | Batch D verified: lint ✓, 504 unit ✓, build ✓, 14 e2e ✓ (12 flags off + 2 flags on), smoke 10/10 ✓ (flags off), screenshots light+dark ✓ (flags on) |

## Blocked
_(none yet)_
