# Review packet: index

Generated 2026-11-23 on branch `claude/accounts-d` (PR #10). Everything here is read from the repo and git. No app code, tests or docs were changed to make it.

## Contents

- [01_LOG.md](01_LOG.md): build log final report, assumptions, blocked; FACTCHECK verbatim
- [02_SECURITY.md](02_SECURITY.md): API routes, access code, migrations, export/delete
- [03_PRIVACY.md](03_PRIVACY.md): Copy for AI, reminder emails, places and health data paths
- [04_SAFETY.md](04_SAFETY.md): linter diff, tip library, new safety-relevant sentences
- [05_RULES.md](05_RULES.md): rules diffs, food mix, buckets, budget, safety-first order, hand-computed test values
- [06_SCREENS.md](06_SCREENS.md): screenshot list and copies
- [plans/](plans/): five households rendered as Markdown

## PRs

| PR | Title | Branch | Base | Head SHA |
| --- | --- | --- | --- | --- |
| [#6](https://github.com/ryncra1g/Survival/pull/6) | Front-page wording, every question traces to a resource, backlog in the repo | `claude/headline-copy` | `claude/dashboard-ux` | `11ad631e3490892704e7b253f59ecd3bd0f5f2e3` |
| [#7](https://github.com/ryncra1g/Survival/pull/7) | Batch A: site menu, Share menu and save bar, front page cards, real loading stages, Copy for AI | `claude/launch-a-shell` | `claude/headline-copy` | `4d809a26f6d71f65751e67e5b833ce07039d7f1d` |
| [#8](https://github.com/ryncra1g/Survival/pull/8) | Batch B: evacuation approach + destination, home vs storage, water filter type (answers v2) | `claude/launch-b-questionnaire` | `claude/launch-a-shell` | `54c4bcbe8e6ce54dc6a100e867da4774701a3a67` |
| [#9](https://github.com/ryncra1g/Survival/pull/9) | Batch C: content kinds, card grid, Compare options, food approaches, water layers, DIY tips (off), When you must leave, calendar | `claude/launch-c-plan` | `claude/launch-b-questionnaire` | `d80aae726082dd1f3ce37290b3ab06aad5c23508` |
| [#10](https://github.com/ryncra1g/Survival/pull/10) | Batch D (accounts track, flag off): inventory, My places, tabs, reminders, export/delete, authorization tests | `claude/accounts-d` | `claude/launch-c-plan` | `7ecc45f3e5f564e10d2f12e3ed009a05be9f945d` |

The head SHA of #10 is the commit before this review packet; the packet itself adds one commit on top, touching only `docs/review/`.

### #6 `git diff --stat claude/dashboard-ux...claude/headline-copy`

````text
 CLAUDE.md                           |   5 +-
 app/layout.tsx                      |   4 +-
 app/opengraph-image.tsx             |  12 ++--
 components/Landing.tsx              |  16 +++--
 demo/dist/demo.html                 |  36 +++++------
 docs/BACKLOG.md                     | 414 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 e2e/flow.spec.ts                    |   2 +-
 lib/plan/build.ts                   |  56 ++++++++++++----
 samples/sample-fridge-checklist.pdf | Bin 6698 -> 6698 bytes
 samples/sample-plan-email.html      |   2 +-
 samples/sample-plan.json            |  30 ++++++++-
 samples/sample-plan.pdf             | Bin 95756 -> 96211 bytes
 samples/sample-plan.txt             |   4 +-
 tests/pathways.test.ts              |  24 +++++++
 14 files changed, 553 insertions(+), 52 deletions(-)
````

### #7 `git diff --stat claude/headline-copy...claude/launch-a-shell`

````text
 .env.example                                 |   6 ++++
 app/about/page.tsx                           |  18 +++++++++++
 app/account/parts.tsx                        |   2 +-
 app/admin/page.tsx                           |   5 ++--
 app/api/auth/me/route.ts                     |   9 ++++++
 app/api/plans/[id]/ai-copy/route.ts          |  16 ++++++++++
 app/api/plans/[id]/checks/route.ts           |   2 +-
 app/api/questionnaire/[id]/generate/route.ts |  30 +++++++++++++++++--
 app/help/page.tsx                            |  38 +++++++++++++++++++++++
 app/layout.tsx                               |   8 ++---
 app/page.tsx                                 |   2 +-
 app/plan/[id]/page.tsx                       |  29 ++++++++----------
 app/sample/page.tsx                          |   2 +-
 app/sitemap.ts                               |   2 +-
 app/sources/page.tsx                         |  43 ++++++++++++++++++++++++++
 components/BuildProgress.tsx                 |  40 +++++++++++++++++++++++++
 components/ChecksContext.tsx                 |   2 +-
 components/CopyForAI.tsx                     |  43 ++++++++++++++++++++++++++
 components/Landing.tsx                       |  72 ++++++++++++++++++++++++--------------------
 components/PlanView.tsx                      |  14 ++++-----
 components/Questionnaire.tsx                 |  68 ++++++++++++++++++++++++++++++-----------
 components/SaveBar.tsx                       |  34 +++++++++++++++++++++
 components/ShareMenu.tsx                     |  45 ++++++++++++++++++++++++++++
 components/SiteMenu.tsx                      |  69 ++++++++++++++++++++++++++++++++++++++++++
 demo/dist/demo.html                          |  20 +++++++------
 demo/main.tsx                                |  27 ++++++++++++++---
 docs/BACKLOG.md                              |  95 ++++++++++++++++++++++++++++++++--------------------------
 docs/BUILD_BRIEF.md                          | 176 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 docs/BUILD_LOG.md                            |  39 ++++++++++++++++++++++++
 docs/FACTCHECK.md                            |  23 ++++++++++++++
 e2e/flow.spec.ts                             |  53 +++++++++++++++++++++++++++++++-
 lib/copy.ts                                  |  12 ++++++++
 lib/flags.ts                                 |  22 ++++++++++++++
 lib/menu.ts                                  |  32 ++++++++++++++++++++
 lib/plan/aiSummary.ts                        |  80 +++++++++++++++++++++++++++++++++++++++++++++++++
 lib/plan/generate.ts                         |   7 ++++-
 lib/plan/sampleSummary.ts                    |  14 +++++++++
 lib/plan/stages.ts                           |  25 ++++++++++++++++
 lib/server/plans.ts                          |   6 ++--
 lib/server/store/file.ts                     |   2 ++
 lib/server/store/supabase.ts                 |   6 ++--
 lib/server/store/types.ts                    |   5 ++++
 samples/sample-fridge-checklist.pdf          | Bin 6698 -> 6742 bytes
 samples/sample-plan-email.html               |   8 ++---
 samples/sample-plan.json                     |   6 ++--
 samples/sample-plan.pdf                      | Bin 96211 -> 96173 bytes
 samples/sample-plan.txt                      |   8 ++---
 scripts/screens.ts                           |  77 +++++++++++++++++++++++++++++++++++++++++++++++
 tests/aiSummary.test.ts                      |  73 ++++++++++++++++++++++++++++++++++++++++++++
 tests/copy.test.ts                           |  53 ++++++++++++++++++++++++++++++++
 tests/flags.test.ts                          |  17 +++++++++++
 tests/helpers/build.ts                       |  13 ++++++++
 tests/landing.test.ts                        |  24 +++++++++++++++
 tests/menu.test.ts                           |  32 ++++++++++++++++++++
 tests/stages.test.ts                         |  37 +++++++++++++++++++++++
 55 files changed, 1427 insertions(+), 164 deletions(-)
````

### #8 `git diff --stat claude/launch-a-shell...claude/launch-b-questionnaire`

````text
 CLAUDE.md                           |   4 ++--
 app/api/plans/[id]/edit/route.ts    |   2 +-
 components/ChangeAnswer.tsx         |   3 ++-
 components/Questionnaire.tsx        |  78 +++++++++++++++++++++++++++++++++++++++++------------------------
 demo/dist/demo.html                 |  56 +++++++++++++++++++++++------------------------
 docs/BACKLOG.md                     |  12 +++++-----
 docs/BUILD_LOG.md                   |   9 ++++++++
 docs/FACTCHECK.md                   |  15 ++++++++++++-
 docs/PATHWAYS.md                    |  23 ++++++++++++++-----
 e2e/flow.spec.ts                    |   8 +++++++
 lib/answers/schema.ts               | 140 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-------------
 lib/plan/build.ts                   |  61 ++++++++++++++++++++++++++++++++++++++++++++-------
 lib/plan/sample.ts                  |   6 +++--
 lib/rules/engine.ts                 |  21 ++++++++++++------
 lib/zip/resources.ts                |   2 ++
 samples/sample-answers.json         |   9 ++++----
 samples/sample-computed.json        |   9 ++++----
 samples/sample-fridge-checklist.pdf | Bin 6742 -> 6742 bytes
 samples/sample-plan-email.html      |   2 +-
 samples/sample-plan.json            |  18 ++++++++++++++-
 samples/sample-plan.pdf             | Bin 96173 -> 96827 bytes
 samples/sample-plan.txt             |   5 ++++-
 scripts/screens.ts                  |  13 +++++++++++
 tests/fixtures/households.ts        |  20 +++++++++++++++--
 tests/levels.test.ts                |   8 +++----
 tests/migrate.test.ts               |  67 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 tests/pathways.test.ts              |  55 +++++++++++++++++++++++++++++-----------------
 27 files changed, 504 insertions(+), 142 deletions(-)
````

### #9 `git diff --stat claude/launch-b-questionnaire...claude/launch-c-plan`

````text
 app/api/plans/[id]/calendar/route.ts |   22 +++
 app/api/plans/[id]/choose/route.ts   |    7 +-
 app/api/plans/[id]/pdf/route.ts      |    3 +-
 app/plan/[id]/maintenance/page.tsx   |   41 +++++
 app/plan/[id]/page.tsx               |   15 +-
 app/plan/[id]/places/page.tsx        |   23 +++
 components/CompareOptions.tsx        |   93 ++++++++++
 components/CopyForAI.tsx             |    4 +-
 components/Dashboard.tsx             |    2 +
 components/LevelChips.tsx            |    2 +-
 components/PlacesForm.tsx            |   51 +++++
 components/PlanView.tsx              |   96 +++++++---
 components/Questionnaire.tsx         |    2 +-
 demo/dist/demo.html                  |   66 +++----
 demo/main.tsx                        |    4 +-
 docs/BACKLOG.md                      |   20 +-
 docs/BUILD_LOG.md                    |   19 ++
 docs/FACTCHECK.md                    |   31 ++++
 e2e/flow.spec.ts                     |   62 ++++++-
 lib/answers/schema.ts                |   11 ++
 lib/calendar/ics.ts                  |   73 ++++++++
 lib/catalog/seed.ts                  |   20 +-
 lib/email/render.ts                  |   20 +-
 lib/pdf/PlanPdf.tsx                  |   35 +++-
 lib/plan/build.ts                    |  255 ++++++++++++++++++++-----
 lib/plan/compare.ts                  |   55 ++++++
 lib/plan/document.ts                 |   38 +++-
 lib/plan/kinds.ts                    |   45 +++++
 lib/plan/maintenance.ts              |   34 ++++
 lib/rules/constants.ts               |    7 +
 lib/rules/engine.ts                  |  145 ++++++++++++---
 lib/safety/linter.ts                 |   16 +-
 lib/safety/required.ts               |    2 +-
 lib/server/plans.ts                  |    5 +-
 lib/tips/library.ts                  |   98 ++++++++++
 lib/zip/resources.ts                 |    1 +
 samples/sample-computed.json         |  320 +++++++++++++++++++++++++-------
 samples/sample-fridge-checklist.pdf  |  Bin 6742 -> 6742 bytes
 samples/sample-plan-email.html       |    4 +-
 samples/sample-plan.json             | 1157 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-------------------------
 samples/sample-plan.pdf              |  Bin 96827 -> 107195 bytes
 samples/sample-plan.txt              |  106 +++++++----
 scripts/screens.ts                   |    8 +
 scripts/smoke-loop.ts                |    7 +-
 tests/budget.test.ts                 |   71 +++++++
 tests/calendar.test.ts               |   48 +++++
 tests/food.test.ts                   |   65 +++++++
 tests/kinds.test.ts                  |   63 +++++++
 tests/levels.test.ts                 |   11 +-
 tests/pathways.test.ts               |    5 +-
 tests/places.test.ts                 |   24 +++
 tests/tips.test.ts                   |   63 +++++++
 tests/water.test.ts                  |   39 ++++
 53 files changed, 2877 insertions(+), 537 deletions(-)
````

### #10 `git diff --stat claude/launch-c-plan...claude/accounts-d`

````text
 README.md                                   |   2 +-
 app/account/inventory/page.tsx              |  13 +++++++++
 app/account/places/page.tsx                 |  22 ++++++++++++++++
 app/account/plans/page.tsx                  |  37 ++++++++++++++++++++++++++
 app/account/reminders/page.tsx              |  25 ++++++++++++++++++
 app/api/account/export/route.ts             |   7 +++--
 app/api/account/places/route.ts             |  24 +++++++++++++++++
 app/api/account/reminders/route.ts          |  24 +++++++++++++++++
 app/api/cron/emails/route.ts                |  19 ++++++++++++--
 app/api/plans/[id]/inventory/route.ts       |  30 +++++++++++++++++++++
 app/plan/[id]/inventory/page.tsx            |  31 ++++++++++++++++++++++
 app/plan/[id]/page.tsx                      |  28 +++++++++++++++++++-
 components/InventoryEditor.tsx              |  67 ++++++++++++++++++++++++++++++++++++++++++++++
 components/PlacesEditor.tsx                 |  54 ++++++++++++++++++++++++++++++++++++++
 components/PlanView.tsx                     |  30 ++++++++++++++++++---
 components/ReminderSettings.tsx             |  44 +++++++++++++++++++++++++++++++
 demo/dist/demo.html                         |  28 ++++++++++----------
 docs/BACKLOG.md                             |   4 +--
 docs/BUILD_LOG.md                           |  81 ++++++++++++++++++++++++++++++++++++++++++++++++++++++--
 e2e/accounts.spec.ts                        |  64 ++++++++++++++++++++++++++++++++++++++++++++
 lib/accountData.ts                          |  56 +++++++++++++++++++++++++++++++++++++++
 lib/email/render.ts                         |   7 +++++
 lib/reminders.ts                            |  28 ++++++++++++++++++++
 lib/server/accountPage.ts                   |  14 ++++++++++
 lib/server/store/file.ts                    |  53 +++++++++++++++++++++++++++++++------
 lib/server/store/supabase.ts                |  36 +++++++++++++++++++------
 lib/server/store/types.ts                   |  12 ++++++++-
 lib/tips/library.ts                         |   3 +++
 lib/tips/match.ts                           |  18 +++++++++++++
 playwright.config.ts                        |  40 +++++++++++++++++-----------
 samples/sample-fridge-checklist.pdf         | Bin 6742 -> 6742 bytes
 samples/sample-plan.pdf                     | Bin 107195 -> 107195 bytes
 scripts/screens.ts                          |  14 ++++++++++
 supabase/migrations/0006_plan_inventory.sql |   4 +++
 supabase/migrations/0007_user_places.sql    |   4 +++
 supabase/migrations/0008_reminder_prefs.sql |   4 +++
 tests/accounts.test.ts                      |  63 ++++++++++++++++++++++++++++++++++++++++++++
 tests/authz.test.ts                         | 156 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 tests/menu.test.ts                          |   6 +++++
 tests/stubs/server-only.ts                  |   2 ++
 vitest.config.ts                            |   8 +++++-
 41 files changed, 1101 insertions(+), 61 deletions(-)
````

## Tests marked skip / only / todo / fixme

Search: `(it|test|describe).(skip|only|todo|fixme)`, `xit(`, `xdescribe(` in `tests/` and `e2e/`.

**None found.**

## Test files where an assertion line was deleted or changed

For each PR, every removed line (`-`) in `tests/` or `e2e/` that contains `expect`, `assert` or `toBe`/`toEqual`/`toContain`/`toHave`, with the full hunk so the replacement line is visible.

### #6 (claude/headline-copy)

#### `e2e/flow.spec.ts`

````diff
@@ -44,3 +44,3 @@ test("phone: no sign-up → plan → optional email → confirm → email + PDFs
   await page.goto("/");
-  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your emergency plan");
+  await expect(page.getByRole("heading", { level: 1 })).toContainText("Get what you need. Know what to do.");
   await expect(page.getByLabel("Your email")).toHaveCount(0); // no email up front
````

### #7 (claude/launch-a-shell)

No assertion line removed or changed.

### #8 (claude/launch-b-questionnaire)

#### `tests/levels.test.ts`

````diff
@@ -49,6 +49,6 @@ describe("à la carte levels: 10 households × every slot × every level", () =>
     if (base.backupPower === "solar_battery") expect(slots.some((x) => x.group === "battery-house")).toBe(false);
-    if (base.hasFiltration) expect(slots.some((x) => x.group === "filter")).toBe(false);
+    if (hasHouseholdFilter(base)) expect(slots.some((x) => x.group === "filter")).toBe(false);
     // bug-out slots only for households with a fallback location; shelter only for raw land
-    expect(slots.some((x) => x.group === "go-bag")).toBe(base.evacuation.mode === "fallback");
-    expect(slots.some((x) => x.group === "shelter")).toBe(base.evacuation.locationType === "raw_land");
+    expect(slots.some((x) => x.group === "go-bag")).toBe(isDrive(base.evacuation.destination) && !!base.evacuation.distanceMiles);
+    expect(slots.some((x) => x.group === "shelter")).toBe(base.evacuation.destination === "raw_land");
   }, 120_000);
````

#### `tests/pathways.test.ts`

````diff
@@ -149,3 +154,3 @@ describe("pairwise: what people have (or don't) steers products, skills and cons
       if (a.backupPower === "solar_battery") expect(offered(r, "solar-panel") || r.computed.budget.slots.some((x) => x.group === "battery-house"), why).toBe(false);
-      if (a.hasFiltration) expect(r.computed.budget.slots.some((x) => x.group === "filter"), why).toBe(false);
+      if (hasHouseholdFilter(a)) expect(r.computed.budget.slots.some((x) => x.group === "filter"), why).toBe(false);
       if (a.backupPower === "standby_generator") expect(offered(r, "well-switch"), why).toBe(false);
@@ -154,3 +159,4 @@ describe("pairwise: what people have (or don't) steers products, skills and cons
       if (a.waterSource === "well" && a.backupPower !== "standby_generator") expect(offered(r, "well-switch"), why).toBe(true);
-      if (!a.hasFiltration && a.scenarioDays > 14) expect(r.computed.budget.slots.some((x) => x.group === "filter" && x.chosen), why).toBe(true);
+      // a personal (straw or bottle) filter never stands in for the household filter (D6)
+      if (!hasHouseholdFilter(a) && a.scenarioDays > 14) expect(r.computed.budget.slots.some((x) => x.group === "filter" && x.chosen), why).toBe(true);
       // essentials: CO alarms and some water container always bought; power bank, radio, first aid always at least offered
@@ -165,3 +171,4 @@ describe("pairwise: what people have (or don't) steers products, skills and cons
       expect(section(r, "kids"), why).toBe(a.childrenAges.length > 0);
-      expect(section(r, "evacuation"), why).toBe(a.evacuation.mode === "fallback");
+      const drive = isDrive(a.evacuation.destination) && !!a.evacuation.distanceMiles;
+      expect(section(r, "evacuation"), why).toBe(drive);
       if (!a.pets.length) expect(offered(r, "pet-kit"), why).toBe(false);
@@ -169,7 +176,7 @@ describe("pairwise: what people have (or don't) steers products, skills and cons
       const slot = (g: string) => r.computed.budget.slots.some((x) => x.group === g);
-      if (a.evacuation.mode !== "fallback") expect(slot("go-bag") || slot("shelter"), why).toBe(false);
-      if (a.evacuation.locationType !== "raw_land") expect(slot("shelter") || offered(r, "raw-land-cabin"), why).toBe(false);
+      if (!drive) expect(slot("go-bag") || slot("shelter"), why).toBe(false);
+      if (a.evacuation.destination !== "raw_land") expect(slot("shelter") || offered(r, "raw-land-cabin"), why).toBe(false);
       // vehicles
-      if (a.evacuation.mode === "fallback") expect(/Fuel per vehicle/.test(t), why).toBe(a.vehicleFuels.length > 0);
-      if (a.evacuation.mode === "fallback" && !a.vehicleFuels.length) expect(t, why).toMatch(/No car: plan your ride now/);
+      if (drive) expect(/Fuel per vehicle/.test(t), why).toBe(a.vehicleFuels.length > 0);
+      if (drive && !a.vehicleFuels.length) expect(t, why).toMatch(/No car: plan your ride now/);
       if (!a.vehicleFuels.length) expect(slot("vehicle-kit"), why).toBe(false);
````

### #9 (claude/launch-c-plan)

#### `e2e/flow.spec.ts`

````diff
@@ -137,6 +137,16 @@ test("phone: no sign-up → plan → optional email → confirm → email + PDFs
 
-  // The plan below is a short index: every section collapsed to title + summary until opened
+  // D10: the plan below is a card grid per chapter (2 across on a phone), each card with its key number
   await expect(page.locator("details[data-section][open]")).toHaveCount(0);
-  await expect(page.getByText(/Store 54 gallons \(14 days\)/)).toBeVisible();
+  await expect(page.locator("details#water").getByTestId("card-key")).toContainText("54 gal");
+  await expect(page.locator("details#water").getByTestId("card-key")).toContainText("water to store");
   await expect(page.getByRole("heading", { name: /Your area's hazards/ })).toBeVisible();
+  const cols = await page.getByTestId("section-cards").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
+  expect(cols).toBe(2);
+  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
+  // D8: content kinds are labelled
+  await page.locator("details#water > summary").click();
+  await expect(page.locator("details#water [data-kind]").first()).toBeVisible();
+  const waterBox = await page.locator("details#water").boundingBox();
+  expect(waterBox!.width).toBeGreaterThan(300); // an opened card spans the full row
+  await page.locator("details#water > summary").click();
   await page.getByTestId("dashboard").getByRole("link", { name: /See every step/ }).click();
@@ -310,3 +323,3 @@ test("sample plan is public", async ({ page }) => {
   await expect(page).toHaveURL(/\/sample/);
-  await expect(page.getByText(/Store 54 gallons \(14 days\)/)).toBeVisible();
+  await expect(page.locator("details#water").getByTestId("card-key")).toContainText("54 gal");
 });
````

#### `tests/levels.test.ts`

````diff
@@ -37,3 +38,3 @@ describe("à la carte levels: 10 households × every slot × every level", () =>
         const all = [...r.computed.budget.picks, ...r.computed.budget.deferred];
-        if (opt.itemId !== "food-diy") expect(r.computed.budget.picks.some((p) => p.item.id === opt.itemId), why).toBe(true);
+        if (!["food-diy", "food-ready", "food-mix"].includes(opt.itemId)) expect(r.computed.budget.picks.some((p) => p.item.id === opt.itemId), why).toBe(true);
         // a standby generator replaces fuel cans, cords, the inlet and propane cylinders
````

#### `tests/pathways.test.ts`

````diff
@@ -172,3 +172,6 @@ describe("pairwise: what people have (or don't) steers products, skills and cons
       const drive = isDrive(a.evacuation.destination) && !!a.evacuation.distanceMiles;
-      expect(section(r, "evacuation"), why).toBe(drive);
+      // D4: every plan has "When you must leave", with the override line and the backup-destination step
+      expect(section(r, "evacuation"), why).toBe(true);
+      expect(t, why).toContain("Official evacuation orders override this plan.");
+      expect(t, why).toContain("Add your backup destination");
       if (!a.pets.length) expect(offered(r, "pet-kit"), why).toBe(false);
````

### #10 (claude/accounts-d)

No assertion line removed or changed.

## grep: TODO, FIXME, HACK, "estimate", "assum" in lib/ and app/

`git grep -niE "TODO|FIXME|HACK|estimate|assum" -- lib app` (case-insensitive; 22 lines). Lines over 300 characters are cut.

````text
app/terms/page.tsx:17:      <p>{BRAND.name} gives general emergency-preparedness information. It is not professional, medical, legal, electrical or safety-engineering advice, and it doesn&apos;t replace instructions from emergency officials, your doctor, pharmacist, vet, utility or a licensed electr …
app/terms/page.tsx:21:      <p>Product examples and price ranges are general estimates and change often. Some Buy links are affiliate links: we may earn a commission at no extra cost to you. We don&apos;t sell products ourselves; purchases are between you and the store, under the store&apos;s terms. …
lib/accountData.ts:43:  /** The person's own estimate; it can update the evacuation distance (no geocoding, no map service). */
lib/catalog/seed.ts:236:    qty: "food_buckets", tags: [], notes: "Priced per bucket (estimate); the plan sizes the count to the bulk staples (D7)",
lib/catalog/seed.ts:349:    spec: "Lithium jump starter, 12 V compressor, traction boards, recovery strap and shackles, rooftop cargo box for gear",
lib/plan/build.ts:260:    title: "Household snapshot & planning assumptions",
lib/plan/build.ts:263:        ? "This plan covers you, on your own, in the {{region}} area for a {{scenario.adj}} disruption. Every quantity below comes from the planning assumptions in this section."
lib/plan/build.ts:264:        : "This plan covers {{household.people}} people in the {{region}} area for a {{scenario.adj}} disruption. Every quantity below comes from the planning assumptions in this section.",
lib/plan/build.ts:1060:  const destinationTodo: Step = { id: "evac-destination", text: "Add your backup destination: name, address and how to get there, printed for each go-bag.", link: HOWTO.evacuation };
lib/plan/build.ts:1065:      ["Fuel per vehicle (one way)", `${n(ev.oneWayGalPerVehicle, 1)} gal at ${n(c.evacuation.assumedMpg)} mpg`],
lib/plan/build.ts:1095:        check("evac", [destinationTodo]),
lib/plan/build.ts:1102:            ...(winter ? [{ if: `No heat, house below ${n(c.heat.evacuateAtF)}°F, and no restoration estimate`, then: "Relocate while roads are passable." }] : []),
lib/plan/build.ts:1140:        check("evac", [destinationTodo]),
lib/plan/build.ts:1167:  budgetRows.push(["Total (midpoint estimate)", "", `~${usd(b.totalMid)}`, `Planning budget ${usd(b.planningAmount)}`]);
lib/plan/document.ts:165:  "Follow official instructions from local emergency management. Quantities are planning estimates. " +
lib/rules/constants.ts:39:   * kcalPerUnit / unitLbs describe the purchase unit. costPerUnit is a rough USD estimate.
lib/rules/constants.ts:54:    /** Children at or under this age are assumed to be in diapers when the user selects "diapers". */
lib/rules/constants.ts:98:    assumedMpg: 25,
lib/rules/constants.ts:107:    /** D7: planning cost of ready-to-eat food (canned meals, soups, pouches), USD per 1,000 kcal. A price estimate, not a safety amount. */
lib/rules/constants.ts:150:  /** Rough USD costs for consumables (used only for budget estimates). */
lib/rules/constants.ts:224:  evacuation: z.object({ assumedMpg: z.number().positive(), fuelReserveFactor: num, evRangeBufferPct: num }),
lib/rules/engine.ts:426:  const oneWay = round(d / c.evacuation.assumedMpg, 1);
````
