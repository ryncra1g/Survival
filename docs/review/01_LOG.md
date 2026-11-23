# Build log and fact-check (verbatim)

Copied unchanged from `docs/BUILD_LOG.md` and `docs/FACTCHECK.md` on branch `claude/accounts-d`.

---

# From docs/BUILD_LOG.md

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

## Blocked
_(none yet)_

---

# docs/FACTCHECK.md

# Fact-check list

Every new safety-relevant sentence added in this run (water, food, heat, power, fuel, kids, evacuation, DIY tips, the Copy-for-AI ground rules) is listed below with its file, exact text and official source.

- **Status:** every row starts as `needs owner review`. The owner marks a row `approved` after checking it.
- **DIY tips** (`DIY_TIPS_ENABLED`) stay off until every DIY row is approved.
- **No official source found:** the sentence was left out and is listed under "Left out" instead.

| ID | File | Exact text | Official source | Status |
|---|---|---|---|---|
| AI-1 | `lib/plan/aiSummary.ts` | Use these amounts exactly; don't recalculate them. | (product rule: amounts come from lib/rules/engine.ts; no external source needed) | needs owner review |
| AI-2 | `lib/plan/aiSummary.ts` | Follow the product label and CDC/EPA guidance for water treatment; never give dosages. | https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water · https://www.cdc.gov/natural-disasters/safety/power-outage-safety.html | needs owner review |
| AI-3 | `lib/plan/aiSummary.ts` | Never suggest grills, generators or heaters indoors or in a garage. | https://www.cdc.gov/carbon-monoxide/prevention/ | needs owner review |
| AI-4 | `lib/plan/aiSummary.ts` | Official evacuation orders override this plan. | https://www.ready.gov/evacuation | needs owner review |
| AI-5 | `lib/plan/aiSummary.ts` | This plan's numbers come from [BRAND]; your assistant's advice is its own. | (product statement; brand from lib/brand.ts) | needs owner review |
| AI-6 | `lib/plan/aiSummary.ts` | Copies a summary of your plan to paste into ChatGPT, Claude or Gemini, so it can set reminders and answer questions. Health details and addresses aren't included. | (product statement; enforced by tests/aiSummary.test.ts) | needs owner review |
| SRC-1 | `app/sources/page.tsx` | Never run a generator, grill, camp stove or fuel-burning heater indoors, in a garage or near open windows. | https://www.cdc.gov/carbon-monoxide/prevention/ | needs owner review |
| SRC-2 | `app/sources/page.tsx` | Never plug a generator into a wall outlet or dryer outlet. | https://www.ready.gov/power-outages | needs owner review |
| SRC-3 | `app/sources/page.tsx` | For water treatment, follow the product label and CDC/EPA guidance. | https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water | needs owner review |
| SRC-4 | `app/sources/page.tsx` | In an emergency, follow official instructions from local emergency management. Official evacuation orders override any plan. | https://www.ready.gov/evacuation | needs owner review |
| EV-1 | `lib/plan/build.ts (month-approach)` | Plan to stay home when it's safe, and still know where you'd go if officials order an evacuation. | https://www.ready.gov/evacuation ("Always follow the instructions of local officials.") | needs owner review |
| EV-2 | `lib/plan/build.ts (month-approach)` | Agree with the family or friends you'd stay with: when you'd come, what to bring, and who else could host you if they can't. | https://www.ready.gov/evacuation ("a friend's home in another town"; "Choose destinations in different directions") | needs owner review |
| EV-3 | `lib/plan/build.ts (month-approach)` | Get your other property ready to use: keys, how to turn on utilities, and supplies kept there. | https://www.ready.gov/evacuation | needs owner review |
| EV-4 | `lib/plan/build.ts (month-approach)` | Know your options for a hotel or a public shelter: hotels outside your area, and your nearest shelter, and whether it accepts pets. | https://www.ready.gov/evacuation ("Most public shelters allow only service animals.") · https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html | needs owner review |
| EV-5 | `lib/plan/build.ts (month-approach)` | Decide where you'd go if you had to leave home: family or friends, a hotel, or a public shelter. | https://www.ready.gov/evacuation | needs owner review |
| EV-6 | `lib/plan/build.ts (month-destination)` | List 2–3 hotels or motels in different directions from home, and call ahead before you leave. | https://www.ready.gov/evacuation ("Choose destinations in different directions"; "a motel") | needs owner review |
| EV-7 | `lib/plan/build.ts (month-destination)` | Find your nearest public shelter and how you'd get there; shelters open when officials announce them. | https://www.ready.gov/evacuation ("Check with local officials about what shelter spaces are available") · Red Cross shelter finder | needs owner review |
| EV-8 | `lib/plan/build.ts (month-destination)` | Choose a backup destination outside your area, and write down its address and how to get there. | https://www.ready.gov/evacuation | needs owner review |
| ST-1 | `lib/plan/build.ts (store-none)` | No suitable storage: keep the first 3 days of water and a go-bag, and buy the rest as soon as a storm or shortage is forecast, before stores sell out. | https://www.ready.gov/kit (3 days = the plan's existing first-3-days water step from the rules engine) | needs owner review |
| ST-2 | `lib/plan/build.ts (store-shed-fuel)` | Shed: even if it isn't right for supplies, it's the place for gas cans and propane cylinders, away from the house. | https://www.ready.gov/power-outages · https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Portable-Generators (store fuel outside living areas) — same claim as the existing store-shed step | needs owner review |
| ST-3 | `lib/plan/build.ts (store-other-indoor)` | Other indoor space (a spare room, under the stairs or beds): water bricks and labelled bins, away from heaters and direct sun. | https://www.ready.gov/kit (store water and food in a cool, dry place) | needs owner review |
| WT-1 | `lib/plan/build.ts (water)` | Your straw or bottle filter is for one person on the move: keep it in your go-bag. | https://www.ready.gov/kit · https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water | needs owner review |
| WT-2 | `lib/plan/build.ts (water)` | You already have a household filter: test it now, and keep spare cartridges or a backflush kit with it. | (existing guidance, reworded for the filter type) https://www.cdc.gov/natural-disasters/safety/power-outage-safety.html | needs owner review |
| FD-1 | `lib/rules/engine.ts (defaultFoodMix)` | Recommended mix: ready-to-eat for the first 14 days, bulk staples after that; all ready-to-eat with no suitable storage or no way to cook without grid power; $5,000+ moves a quarter of the bulk share to ration & freeze-dried kits. | Follows the plan's existing eating order (Day 3–14 pantry/canned, Day 15+ bulk staples). https://www.ready.gov/food · planning rule, owner review | needs owner review |
| FD-2 | `lib/rules/constants.ts (foodMix)` | Ready-to-eat planning cost $3 per 1,000 kcal; 30 lb of dry staples per food-grade 5-gallon bucket. | Estimates (prices and bucket capacity vary by product); owner review | needs owner review |
| FD-3 | `lib/plan/build.ts (food)` | Ration bars are for go-bags and the first days, not your whole supply. | https://www.ready.gov/food (owner decision D7) | needs owner review |
| FD-4 | `lib/plan/build.ts (food)` | Freeze-dried meals need hot water: count it in your water and cooking fuel. | Product preparation instructions (owner decision D7) | needs owner review |
| FD-5 | `lib/plan/build.ts (food)` | Adjust for any allergies or diets in your household. | https://www.ready.gov/food | needs owner review |
| FD-6 | `lib/plan/build.ts (food, Compare food options)` | Preparation / water and fuel / space / shelf life rows: "Cook: simmer rice, beans and oats"; "Open and eat; heat if you can"; "Add hot water to freeze-dried meals; ration bars are ready"; "Long when sealed; rotate into meals"; "Check the dates; rotate into meals"; "Longest; check the label". | https://www.ready.gov/food (no shelf-life numbers given; labels rule) | needs owner review |
| FD-7 | `lib/plan/build.ts (food)` | Store bulk staples in sealed food-grade buckets or mylar, cool and dry: about N 5-gallon buckets for N lb. | https://www.ready.gov/food · bucket count from the rules engine | needs owner review |
| WT-3 | `lib/safety/required.ts (BLEACH_RULE, replaces the old drop amounts)` | If water is cloudy, let it settle or filter it first. Then disinfect it with regular unscented bleach, using the amount and wait time on the bleach label and in EPA's emergency disinfection steps, or bring it to a rolling boil for 1 minute (3 minutes above 6,500 ft), as CDC advises. Never guess an amount. | https://www.cdc.gov/water-emergency/about/index.html · https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water | needs owner review |
| WT-4 | `lib/plan/build.ts (water layers)` | Household filter: does not remove viruses and chemicals: disinfect after filtering. | https://www.cdc.gov/water-emergency/about/index.html ("Portable filters will not remove viruses"; disinfect after filtering) | needs owner review |
| WT-5 | `lib/plan/build.ts (water layers)` | Treatment tablets: chemicals and fuel. Iodine and chlorine tablets don't reliably kill Cryptosporidium; chlorine dioxide can, when you follow the label. | https://www.cdc.gov/water-emergency/about/index.html | needs owner review |
| WT-6 | `lib/plan/build.ts (water layers)` | Boiling: does not remove chemicals, fuel and toxins. | https://www.cdc.gov/water-emergency/about/index.html (water with fuel or toxic chemicals can't be made safe by boiling or disinfecting) | needs owner review |
| WT-7 | `lib/plan/build.ts (water layers)` | Straw or bottle filter, in your go-bag, for one person: does not remove viruses and chemicals. | https://www.cdc.gov/water-emergency/about/index.html | needs owner review |
| WT-8 | `lib/plan/build.ts (water callout)` | Water with fuel or toxic chemicals in it can't be made safe by boiling or disinfecting. Use stored or bottled water, and contact your health department. | https://www.cdc.gov/water-emergency/about/index.html | needs owner review |
| WT-9 | `lib/plan/build.ts (water kit)` | Containers filled and sealed; a way to get water out; rotation labels with the fill date; spare filter elements; a backup method (treatment tablets plus unscented bleach, used as the labels direct). | https://www.ready.gov/kit · https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water | needs owner review |
| WT-10 | `lib/catalog/seed.ts` | New catalog items: chlorine dioxide water treatment tablets ($10–20, estimate) and spare filter elements ($20–60, estimate). | Prices are estimates for owner review | needs owner review |
| TIP-water-fill-now | `lib/tips/library.ts (DIY_TIPS_ENABLED, off)` | A storm is coming and you have no stored water. Fill clean pots, pitchers and bottles with tap water for drinking while it's still safe. Fill the bathtub for flushing and washing, not for drinking. Also: Don't store drinking water in containers that held chemicals. | https://www.ready.gov/water | needs owner review |
| TIP-water-boil | `lib/tips/library.ts (DIY_TIPS_ENABLED, off)` | You have no filter and no treatment tablets. Let cloudy water settle, or strain it through a clean cloth. Boil it as CDC directs, let it cool, and store it in clean covered containers. Also: Don't drink water that may have fuel or chemicals in it; boiling won't fix that. | https://www.cdc.gov/water-emergency/about/index.html | needs owner review |
| TIP-heat-one-room | `lib/tips/library.ts (DIY_TIPS_ENABLED, off)` | The power is out in cold weather and you have no backup heat. Pick one room to keep warm and close the doors to the rest. Cover windows and drafts with blankets or towels. Wear layers, and sleep under extra blankets together in that room. | https://www.ready.gov/winter-weather | needs owner review |
| TIP-sanitation-bag-toilet | `lib/tips/library.ts (DIY_TIPS_ENABLED, off)` | The toilet won't flush and you have no sanitation kit. Line the bucket or bowl with a heavy trash bag. Cover waste with litter or sawdust if you have it, tie the bag closed, and keep it outside, away from water. Also: Don't dump waste where it can reach drinking water. | https://www.ready.gov/kit | needs owner review |
| TIP-light-flashlights | `lib/tips/library.ts (DIY_TIPS_ENABLED, off)` | The power is out and you have no lanterns or power bank. Use flashlights for light, and keep phones for calls and alerts. Dim screens and turn on battery saver. Also: Use flashlights, not candles: candles can start fires. | https://www.ready.gov/power-outages | needs owner review |
| TIP-day0-now | `lib/tips/library.ts (DIY_TIPS_ENABLED, off)` | It's happening and you haven't bought anything yet. Fill containers and the tub with water, and charge every phone. Keep the fridge and freezer closed. | https://www.ready.gov/power-outages | needs owner review |
| DONT-1 | `lib/tips/library.ts (every tips box)` | Don't use candle or terracotta-pot heaters. | https://www.cdc.gov/carbon-monoxide/prevention/ · https://www.ready.gov/winter-weather | needs owner review |
| DONT-2 | `lib/tips/library.ts (every tips box)` | Never use a grill or camp stove indoors or in a garage. | https://www.cdc.gov/carbon-monoxide/prevention/ | needs owner review |
| DONT-3 | `lib/tips/library.ts (every tips box)` | Don't use a gas oven or stovetop to heat your home. | https://www.cdc.gov/carbon-monoxide/prevention/ · https://www.ready.gov/winter-weather | needs owner review |
| DONT-4 | `lib/tips/library.ts (every tips box)` | Never run a car in an attached garage, even with the door open. | https://www.cdc.gov/carbon-monoxide/prevention/ | needs owner review |
| DONT-5 | `lib/tips/library.ts (every tips box)` | Never plug a generator into a wall outlet. | https://www.ready.gov/power-outages | needs owner review |
| EV-9 | `lib/plan/build.ts (When you must leave)` | Official evacuation orders override this plan. If officials tell you to leave, go, using the routes they give. | https://www.ready.gov/evacuation ("Always follow the instructions of local officials." "Follow recommended evacuation routes.") | needs owner review |
| EV-10 | `lib/plan/build.ts (evac-destination)` | Add your backup destination: name, address and how to get there, printed for each go-bag. | https://www.ready.gov/evacuation | needs owner review |
| EV-11 | `lib/plan/build.ts (public shelter)` | Shelters open when officials announce them: check your county's alerts and local news. Most public shelters allow only service animals, so plan where your pets would go. | https://www.ready.gov/evacuation ("Most public shelters allow only service animals.") | needs owner review |
| EV-12 | `components/PlacesForm.tsx (printout)` | If we have to leave, we go to: … Official evacuation orders override this plan. | https://www.ready.gov/evacuation | needs owner review |
| MT-1 | `lib/plan/maintenance.ts (calendar + reminders)` | The calendar file repeats the plan's existing maintenance intervals: monthly alarm test (and generator run), every 6 months water/food/go-bag rotation, every 12 months fuel, bleach, first aid, documents and plan review, and seasonal checks (fall chimney, November winter, June hurricane, spring wildfire), starting the day it's added. | https://www.ready.gov/kit (replace stored water every 6 months; maintain your kit) · https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/ (test alarms monthly) | needs owner review |

## Left out (no official source found)
- [B3] "It doesn't make enough water for the household" (about personal straw or bottle filters) was left out: no official source found that states it.
