# Product, UX & feature backlog

Living document and open backlog. Source: the owner's "Product, UX & Feature Improvement Log" v0.1
(November 21, 2026), plus items added since. This is the to-do list to return to when resuming a session.

**Working rules (from the owner's log).** A suggestion is not an approved requirement. Preserve explicit owner
decisions. Keep future-phase ideas separate from current scope. Mark entries Updated or Superseded rather than
overwriting them. Nothing here authorizes merging PRs, applying migrations, creating hosting accounts, choosing
the final name, or other owner-reserved decisions.

Entry types: **Owner request** (Ryan asked for it), **Assistant recommendation**, **Product direction**, **Open question**.

---

## 0. Status at a glance (updated November 22, 2026)

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| **DB-03** | **Dashboard with tabs, account / settings menu and an inventory page to come back to** | **High** | **Open (new)**; **Decided (D2, D9, D10 (tabs Overview / Inventory / Report in Batch D))** |
| LP-01 | Top-right profile / product menu | High | Open (folded into DB-03); **Decided (D9)** **Built (Batch A, claude/launch-a-shell).** |
| LP-02 | Remove the eyebrow line above the headline | Medium | **Done** (branch `claude/headline-copy`) |
| LP-03 | New headline: "Get what you need. Know what to do." | High | **Done as working copy** (branch `claude/headline-copy`) |
| LP-04 | Short supporting line | High | **Done as working copy** (branch `claude/headline-copy`) |
| LP-05 | Sticky sample-plan tabs; visual discovery-style cards | High | Partly done: tabs are one sticky row (PR #5). Card grid open; **Decided (D10)** **Front page built (Batch A); plan card grid in Batch C.** **Plan card grid built (Batch C).** |
| LP-06 | Redesign "What's in your plan" | High | Open; **Decided (D10)** **Built (Batch A).** |
| LP-07 | Loading screen and animation | Medium | Open; **Decided (D11)** **Built (Batch A).** |
| DB-01 | Three-stage readiness journey | Product direction | Partly started: dashboard home (PR #5). Scope decision needed; **Decided (D1, D2 (Later: Days Ready score, Tasks tab))** |
| DB-02 | Inventory and shopping status tied to the plan | Medium | Partly done: "I have this" ticks remove Buy buttons and cut the total (PR #5). Purchased / low / expiry open; **Decided (D2 (Batch D inventory))** |
| AI-01 | Admin-managed readiness assistant | Later phase | Explore; **Decided (D13: not now; count Copy-for-AI clicks. Stays Later)** |
| HOU-01 | Attic option? | Open question | Open; **Decided (D5: no attic now (Later, heat/cold-tolerant gear only))** **No attic (D5).** |
| HOU-02 | Home features vs storage question overlap | Medium | Open; **Decided (D5)** **Built (Batch B).** |
| EV-01 | Shelter-at-home preference vs backup destination | Medium | Open; **Decided (D4)** **Built (Batch B: approach + destination questions).** |
| EV-02 | Printable map to saved destinations | Medium | Open; **Decided (D4)** **Questions built (Batch B); print page in Batch C.** **Printable places page built (Batch C).** |
| PL-01 | Supplies tagged to their plan sections | High | **Done**: "What you need" strip in each section (merged with PR #2) |
| PL-02 | Separate guidance, actions and pack items | High | Open (storage tips became actions on `claude/headline-copy`); **Decided (D8)** **Built (Batch C: content kinds).** |
| PL-03 | Smaller Sources & disclaimers card | Medium | Partly done: moved to the bottom earlier. Menu placement open (DB-03); **Decided (D9)** **Built (Batch A: /sources).** |
| PL-04 | Share / Download / Print menu | Medium | Open (PR #5 groups them under the dashboard; a menu is still open); **Decided (D9)** **Built (Batch A: Share menu).** |
| GEAR-01 | Full catalog regardless of starting budget | Medium | Partly done: every slot can switch Essential / Standard / Premium. "See all options" and "Revisit budget" open; **Decided (D3)** **Built (Batch C: Compare options).** |
| MT-01 | Exportable maintenance calendar and reminders | Medium | Open; **Decided (D12)** **Calendar + printable list built (Batch C); email reminders in Batch D.** |
| FD-01 | Food review and ration-kit choices | High | Open; **Decided (D7)** **Built (Batch C).** |
| FD-02 | Containers and storage when a food approach needs them | High | Open; **Decided (D7)** **Built (Batch C: buckets sized to bulk staples).** |
| FD-03 | Food constraints that change recommendations | Medium | Open; **Decided (D7 (diet/allergy question Later))** **Allergy line added (Batch C); question Later.** |
| WT-01 | More water-treatment choices | High | Open; **Decided (D6)** **Filter-type question built (Batch B); treatment layers in Batch C.** **Treatment layers built (Batch C).** |
| WT-02 | Complete water-readiness kit | Medium | Open; **Decided (D6)** **Built (Batch C: water kit).** |
| WT-03 | What counts as an existing emergency filter (LifeStraw?) | Open question | Open; **Decided (D6 (personal filter counts for the go-bag only))** **Built (Batch B: filter type).** |
| WIZ-01 | Every question and answer traces to a product or resource | High | **Done** (branch `claude/headline-copy`); follow-ups below |
| FG-01 | Front-page focus group (20 simulated participants) | Medium | **Done**; findings below |
| GRID-01 | Say plainly that the plan assumes no grid power for the whole period | Medium | Open (proposed November 18, not yet approved) |
| BUY-01 | Buy links without an Associates tag; no links for "use what you own" items | High | **Done** (PR #4, PR #5) |

### PR merge queue (each needs the owner's OK)
#3 Windows test fixes → #4 Buy links without a tag → #5 dashboard redesign → `claude/headline-copy` (no PR yet).
Each is stacked on the one before it.

---

## 1. New items

### DB-03 Dashboard with tabs, an account / settings menu, and an inventory page to come back to
**Type:** Owner request (November 22). **Priority:** High. **Status:** Open.

**Requested:** A real dashboard with appropriate tabs, a settings / account menu, and an inventory page people
come back to.

**Suggested (assistant):**
- **Tabs** (one sticky row on phones, the same pattern as the plan's chapter tabs):
  1. **Overview**: today's dashboard (this week's progress, Next up, key numbers, Day 0 link).
  2. **Plan**: the four chapters (Do now, Supplies, Power & heat, People & plans).
  3. **Inventory**: everything the plan recommends, one row per item, with status *Have / Need / Bought / Low or
     due*, quantity on hand vs recommended, and an expiry or service date where it matters (water rotation,
     batteries, fuel stabilizer, food, filters, first-aid kit). Shows what's left to buy and its cost. "Have"
     feeds back into the plan so it never sells what someone owns (today's "I have this" ticks are the start).
  4. **Tasks**: priority steps, maintenance calendar and reminders (links to MT-01).
  5. **Report**: share, email, PDF, fridge checklist, print (links to PL-04).
- **Top-right account menu (LP-01):** signed out: "Save my plan" (email magic link), Sources & safety, Help, Terms,
  Privacy. Signed in: My plans, Household profile (change an answer), Inventory, Reminders, Privacy & data
  (export / delete), Sign out. Only show what works in the current release.
- **Coming back:** plans already persist on the server per browser session, and to the account once an email is
  confirmed (magic link at /account). Inventory status should save the same way, so a returning visitor lands
  on Overview or Inventory.

**Done when:** a person can return to their plan on any device after confirming their email, open Inventory, and
see and update what they have; the dashboard tabs and the account menu work on phone and desktop with the keyboard.

**Decisions needed:** Should inventory work without an account (this browser only) or require a saved plan /
magic-link account? Which tabs ship first? Does the signed-out menu appear for visitors who haven't built a plan?

**Depends on:** DB-01 scope, DB-02, PL-04, MT-01. Probably a database change (inventory status per item) and a
new migration, which is the owner's to apply.

### WIZ-01 Every question and answer traces to a product or resource
**Type:** Owner request (November 21). **Status:** Done on `claude/headline-copy`.

Measured all 58 answer changes against a base household: each one now changes a product or quantity, or adds a
step that carries a Buy option or an official link. `tests/pathways.test.ts` now enforces it.

- **Fixed (8 answers only changed wording):**
  - **Storage (garage, basement, shed, closets, very limited):** each is now a step with containers to buy and a
    how-to link.
  - **Heat (oil, propane, electric):** each is now a step with the Ready.gov winter link; electric heat also
    points to cold-rated sleeping bags.
  - **Townhouse:** a new step on HOA rules and agreeing generator placement with neighbors, with CDC CO safety and
    CO alarms.
- **Same resources as the base answer (3, exempt in the test):** diesel and hybrid vehicles, and a fallback 500
  miles away. They use the same vehicle kit, fuel and evacuation guidance; distance changes the fuel amounts.

**Follow-ups (open):**
- **Diesel:** add a winter anti-gel additive to the catalog for cold areas.
- **Mobility:** "Mobility & access kit" has no store link because its examples are "match current equipment".
  Consider real products (whistle, hearing-aid batteries, transfer aid).
- **Related questions:** HOU-02 (storage overlap), EV-01 (shelter preference) and WT-03 (what counts as a filter)
  are wording problems in the same questions.

### FG-01 Front-page focus group: 20 simulated participants
**Type:** Assistant research (November 21). **Status:** Done. Simulated personas, not real customers: use it to
catch confusing wording, then confirm with real people.

Participants spanned a Long Island parent, a retiree couple, an NYC renter, a serious prepper, a skeptic, a new
homeowner, a caregiver for a parent on oxygen, a rural well owner, a Florida hurricane veteran, a budget-tight
20-something, a gear enthusiast, a plain-English reader, a nurse, an email-capture marketer, an SEO / affiliate
specialist, a parents' Facebook-group member, a small landlord, a Californian (wildfire / quake), a Texas 2021
winter-storm survivor and an accessibility advocate.

- **Headline:** "Know exactly what to do when the power goes out" led (13 of 20). Power outages are the
  experience nearly everyone shares. **Superseded by owner decision LP-03** ("Get what you need. Know what to
  do."), which keeps both halves: supplies and actions.
- **"Emergency plan" / "supply list":** read as homework or a store to several people; the owner's headline
  avoids both.
- **"5 minutes":** was repeated in the eyebrow and the headline. Removed with LP-02.
- **"Every number shows its math":** unclear to non-technical readers ("what math?"). Changed to "Every amount is
  worked out for your household, with the math shown."
- **How it works, step 3:** "Buy in the right order" sounded like a store to the skeptic. "Buy only what you're
  missing" names the real difference: the plan skips what you own.
- **Trust:** the skeptic and the accessibility advocate wanted to know how a free tool makes money. The footer now
  says plainly that we may earn a commission, and that recommendations follow the specs, not commissions.
- **Coverage people looked for:** medical-device backup power and plans for kids and pets. Added to "What's in
  your plan".
- **Name feedback (for the owner's naming decision):** "ReadyReport" read to some as a document or a credit
  report, and to others as reassuringly concrete.
- **Eyebrow reassurance:** "No sign-up" did build trust for several people. If testing shows hesitation, bring it
  back somewhere other than above the headline (LP-02 note).

### GRID-01 Say plainly that the plan assumes no grid power
**Type:** Assistant recommendation (November 18). **Status:** Open; awaiting the owner's OK.
The numbers already assume no grid power for the whole period (fuel, food without a fridge, no electric stove),
but the question says "outage or disruption". Proposed wording: "Plan for the power being out (and stores closed
or empty) for…", plus one line in Your household: "This plan assumes no grid power for the whole period."

---

## 2. Product direction (owner's log, section 1)

The reference image suggests moving from a one-time plan generator to a continuing readiness dashboard in three stages:

1. **Personalize:** your plan and dashboard. Understand the household, tailor the plan, make the dashboard
   reflect what matters to them.
2. **Build readiness:** interact with your dashboard / inventory and stock up. Track what's owned, missing,
   purchased and due for replacement.
3. **Stay ready:** set up alerts, tasks and triggers; print your report.

Design cue: three numbered cards, each with an icon and a short outcome-led description. Approachable and
action-oriented, not a dense feature list.

**Scope flag:** current MVP is questionnaire → immediate plan → optional email, with sign-up optional.
Persistent inventory, personalized dashboards and automated reminders need saved-plan / account capabilities.
Treat the three stages as future direction; don't expand the MVP or require accounts without explicit approval.

---

## 3. Landing page and first impression (owner's log, section 2)

### LP-01 Top-right profile / product menu
**High · Open · Owner request.** Add a standard profile menu top right with relevant product information and
settings. Candidate menu: Profile / Sign in, Plan settings, Household & inventory, Notifications / reminders,
Privacy & data, Help, About, Sources & safety, Terms and Privacy. Show only what the current release supports;
a clear signed-out state.
**Done when:** visible and usable on desktop and mobile, keyboard accessible, doesn't compete with "build plan".
**Note:** a signed-out visitor must not be led to believe their plan is saved unless it is. Now part of **DB-03**.

### LP-02 Remove the eyebrow line above the headline
**Medium · Done (`claude/headline-copy`) · Owner request.** Removed "Free · No sign-up · About 5 minutes".
Bring the reassurance back elsewhere only if testing shows it's needed.

### LP-03 Replace the main headline
**High · Done as working copy · Owner request.** Direction: "Get what you need, know what you have to do."
Working copy now live on the branch: **"Get what you need. Know what to do."** Plain language, confidence-building,
not prepper-oriented.

### LP-04 Simplify the hero supporting copy
**High · Done as working copy · Owner request.** Now: "Take the guesswork out of getting prepared. Know what to
keep on hand, what to do first and how to stay ready." Draft, not final approved wording.

### LP-05 Stationary sample-plan navigation, more visual
**High · Partly done · Owner request.** Keep sample-plan tabs stationary at the top; replace the list-heavy look
with boxed, discovery-style cards (layout cue from Spotify Discover; no copying its branding or UI).
**Done so far:** the plan's four chapter tabs are a single sticky row (PR #5).
**Open:** the card grid. Decide whether tabs stick to the viewport or only within the sample-plan area.
**Done when:** tabs stay available while browsing; cards are scannable, responsive and distinct, with no
hidden detail or horizontal-scroll traps.

### LP-06 Revamp "What's in your plan"
**High · Open · Owner request.** Needs a complete overview and redesign. Suggested: four outcome-led cards
matching the chapters (Do now, Supplies, Power & heat, People & plans), each saying what you get, showing a few
representative contents and linking to the sample. One strong overview statement plus "see an example" rather
than a list of section names.
**Done when:** a first-time visitor understands the breadth and value in seconds; it feels like a curated
dashboard, not a table of contents.

### LP-07 Loading screen and animation
**Medium · Open · Owner request.** Change both the look and the motion. Calm and polished, consistent with the
visual language. Status messages only for real work; no fake percentage. Accessible status announcement;
respects reduced motion.
**Done when:** intentional design, restrained animation, accurate text, works on mobile and desktop, doesn't make
the app feel slower. Confirm which loading states are in scope (questionnaire submit, plan generation, or both).

---

## 4. Dashboard and ongoing readiness (owner's log, section 3)

### DB-01 Organize around the three-stage readiness journey
**High · Product direction · Partly started.** Potential areas: readiness overview, household profile, owned
inventory, shopping / replenishment, tasks and maintenance, alerts / triggers, downloadable report. Make the
next best action obvious at each stage.
**Done so far (PR #5):** the dashboard is the plan's home: current-stage progress, Next up (tick, undo, advances),
key numbers, shopping list with "I have this", Day 0 shortcut.
**Done when:** the user can see where they are in the journey and what moves them forward.
**Note:** likely a later-phase experience; define MVP vs later release before building more (see DB-03).

### DB-02 Connect inventory and shopping status to the plan
**Medium · Partly done · Assistant recommendation.** Mark each item owned, needed, purchased or low / due;
feed owned items back into generation so the app doesn't recommend buying them; quantity on hand and expiry /
service dates where relevant.
**Done so far:** "I have this" ticks on the shopping list cut the total and hide that item's Buy buttons
everywhere, and they're saved with the plan.
**Open:** purchased / low / due states, quantities, expiry dates, and feeding owned items into generation
(today it hides Buy buttons; it doesn't change the computed quantities).

### AI-01 Admin-managed readiness assistant
**Later phase · Explore · Product concept.** The full concept is in the owner's log (November 21). Key points to
preserve:
- **What it is:** a plan-aware "Ask about my plan" helper in the dashboard, optional and unobtrusive, never
  blocking ordinary controls. Starter prompts: finish my inventory, I already own these, what first, explain my
  water, prepare for winter, turn maintenance into reminders.
- **Numbers:** it explains the plan's calculated numbers; it never recalculates or invents them.
- **Knowledge:** admin-maintained, not model training. A curated, versioned knowledge library with source,
  reviewer, review dates and publication status; draft → preview → approve → publish; rollback and audit trail.
- **Changes:** it proposes a structured change, shows before / after, and the user approves. The server then
  validates, saves and recalculates. No direct database writes, no arbitrary SQL, permissions checked on every
  call, row-level security, an allowlist of fields. It never deletes accounts, changes consent or edits
  medical / safety answers.
- **Safety and privacy:** no diagnosis or dosing, never contradicts official evacuation orders, guards against
  prompt injection, health data not sent by default, clear AI disclosure, deletable history, no marketing use,
  the app fully usable without AI.
- **Rollout:** Phase 1 read-only companion → Phase 2 user-approved organizer (needs accounts) → Phase 3 opt-in
  check-ins and reminders.
- **Open decisions:** minimum read-only scope; which actions in Phase 2; chat history default; consent wording
  for health data; who approves safety knowledge.

---

## 5. Questionnaire / home profile (owner's log)

### HOU-01 Attic option?
**Open question (owner).** If added, decide what it captures: whether an attic exists, has usable storage, or is
safely accessible. Add it only if the answer changes a recommendation, storage plan or safety instruction; don't
assume an attic suits emergency storage.

### HOU-02 Home features vs supply-storage overlap
**Medium · Open · Owner request.** "Your home has…" and "Where can you store supplies?" overlap (basement,
garage). Give them distinct jobs: property features once (has basement / garage / yard); then "Which spaces can
you realistically use to store emergency supplies?", showing spaces from the earlier answers plus Closets and
"Other indoor space". Treat "Very limited space" as a capacity constraint, not a place; consider "No suitable
storage". Store feature and usability separately so they can't contradict each other. Coordinate with HOU-01.
**Open decisions:** show only spaces from the home profile, or all with unavailable ones marked? Separate
"Very limited" from "No suitable storage"?

### EV-01 Rework "If you had to leave home, where would you go?"
**Medium · Open · Owner request.** The question assumes leaving. First ask the preferred approach: shelter at home
when safe (with a backup plan) / family or friends / another property / hotel or public shelter / not sure. If
they prefer staying home, keep shelter-in-place prominent but ask: "If your home becomes unsafe or officials order
an evacuation, where could your household go?" Make clear a preference never overrides an official order.
**Done when:** a shelter-at-home preference feels like a valid answer, and every plan still has a realistic
fallback; the plan separates shelter-in-place from evacuation actions.

### EV-02 Printable destination map
**Medium · Open · Owner request.** In the dashboard / report to-do list, print a map and route to each specific
saved destination (support several). If the user chose shelter-only, a category without a place, or is unsure:
don't invent a destination; prompt to add one or say no map is ready. Official instructions and closures take
precedence over a printed route.

---

## 6. Plan content, supplies and presentation (owner's log, section 4)

### PL-01 Attach supplies and resources to their sections
**High · Done · Owner request.** Each section ends with a "What you need" strip (that section's gear with Buy
buttons, official links, and a note for grocery staples). One item record shared across the plan.

### PL-02 Separate guidance from actionable tasks
**High · Open · Owner request.** Some content (e.g. Kids & morale: keep routines, give each child a job) is
guidance, not a to-do; other items are actions (baby gates, extra outfits and sleep sacks, ID card in each go-bag).
Introduce types *Guidance*, *Action* and *Pack / supply*: guidance reads as advice, actions can be ticked or
scheduled, pack items link to inventory and shopping. Apply across chapters. Only true actions count toward
progress. (This also fixes progress counts like "82 steps", which today include pack lists.)

### PL-03 Smaller Sources & disclaimers card
**Medium · Partly done · Owner request.** Move the fuller sources and legal text into the menu (About / Sources &
safety); keep concise safety notes inline where decisions happen (generators, CO, fuel, water treatment, medical).
Never hide urgent safety warnings or required disclosures to save space.

### PL-04 Share / Download / Print menu
**Medium · Open · Owner request.** Put Email me my plan, Download plan PDF, Print and Fridge checklist in one
clearly labeled menu in the plan header, separate from the account menu. Keep email optional; downloads never
require an email; don't imply a plan is emailed or saved until it is.

### GEAR-01 Full suitable catalog regardless of starting budget
**Medium · Partly done · Owner request.** The budget sets the default level and purchase order, not a permanent
filter. Show the best fit for the budget plus "See all options", "Compare levels" and "Revisit my budget"; label
options "Recommended for your budget", "Lower-cost alternative", "Upgrade option", "Other compatible choices",
with the price difference, the trade-off and the effect on the total; save upgrades as future purchases without
changing the stated budget. Budget never hides a suitable item; fit and safety rules still apply.
**Done so far:** every slot can be switched between Essential, Standard and Premium in place.
**Open decision:** flexible target by default, with an optional hard cap?

---

## 7. Maintenance, reminders and exports (owner's log, section 5)

### MT-01 Exportable maintenance calendar with reminders
**Medium · Open · Owner request.** Calendar export (.ics), printable calendar, opt-in email reminders. Each entry
has item, interval, last done, next due and a "done" action. Reminder preferences stay separate from marketing
consent. Automatic alerts need saved plans / accounts and a delivery mechanism.

---

## 8. Food (owner's log, section 6)

### FD-01 Revisit food planning; add ration-kit choices
**High · Open · Owner request.** Compare ready-to-eat shelf-stable meals, ration / emergency meal kits and bulk
staples on cost, preparation, water and fuel needs, storage footprint, variety and shelf life. Keep the calorie
math transparent and the age-based quantities.

### FD-02 Containers and storage with a food approach
**High · Open · Owner request.** Bulk food brings an appropriately sized storage plan (food-safe containers,
sealed storage, labels, rotation, pest and moisture protection); ready-packed kits don't get bulk-storage upsells.

### FD-03 Food constraints that change recommendations
**Medium · Open · Assistant recommendation.** Optional dietary pattern or restrictions, allergies, infant and
toddler food, no-cook capability. Ask only what changes the plan; no unnecessary health details.

---

## 9. Water (owner's log, section 7)

### WT-01 More water-treatment choices
**High · Open · Owner request.** Use-case comparison: gravity / pump / squeeze filters, personal straw filters
(LifeStraw-style), chemical treatment (chlorine dioxide, iodine where appropriate), boiling as a fallback, safe
storage, pre-treating cloudy water. State each method's limits.
**Note:** don't imply every filter removes viruses or chemicals; never generate dosages from memory; iodine has
health restrictions; follow current public-health guidance and labels.

### WT-02 Complete water-readiness kit
**Medium · Open · Assistant recommendation.** Storage containers, safe dispensing, rotation labels, measuring and
transfer, spare filter elements, treatment expiry tracking, a backup method. Distinguish stored water from water
that still needs treatment: collect → pre-treat → treat → store → dispense → rotate.

### WT-03 What counts as an existing emergency filter?
**Open question (owner).** Does a LifeStraw personal filter count as "Yes" for "Do you already have a water filter
for emergencies?" The hint ("gravity or hollow-fiber, not a fridge or pitcher filter") is unclear to a novice.
Explain in plain language with recognizable examples; consider asking which type they own (personal straw vs
household gravity), since a personal filter doesn't supply a household.

---

## 10. Scope notes to preserve (owner's log, section 9)

- Baseline: questionnaire → immediate plan → optional email. Sign-up stays optional.
- Profile / inventory / alerts may need accounts, data structures, notification preferences, scheduled jobs and
  new privacy / consent treatment.
- All household calculations stay deterministic and transparent; AI wording never invents amounts or changes
  safety instructions.
- Water, food, children, power and fuel content needs a dedicated factual review before launch.
- The final name stays a setting (`NEXT_PUBLIC_BRAND_NAME`); never hard-code a name. "ReadyReport" is the current
  working choice (November 18) and can change.
- AI-01 is later phase and separate from the constrained summary-rewriting feature.
- GEAR-01: the starting budget sets defaults and order; it never locks people out of the suitable catalog.

## 11. Open decisions (owner's log, section 10, plus new)

1. ~~Budget: flexible target by default, with an optional hard cap? How to browse / save above-budget gear?~~ **Closed: D3: flexible target, no hard cap; Compare options.**
2. ~~Profile menu for signed-out visitors: shown? What does it contain?~~ **Closed: D9.**
3. ~~Are the three dashboard stages the long-term structure, or introduced gradually after the no-sign-up flow?~~ **Closed: D1/D2: launch lean; dashboard tabs in the accounts track.**
4. ~~Inventory without an account (this browser only), or only with a saved plan / magic-link account? (DB-03)~~ **Closed: D2: saved on this device for 30 days without an account; account = any device.**
5. ~~Sample-plan tabs: stick to the viewport, or only within the sample area?~~ **Closed: D10: pinned while in the plan.**
6. ~~Maintenance reminder channels first: calendar file, email, push, or a mix?~~ **Closed: D12: calendar file + printable list at launch; opt-in email with accounts.**
7. ~~Which food approaches and water-treatment methods are supported in the first release?~~ **Closed: D6, D7.**
8. ~~Does the existing-filter question include personal straw filters?~~ **Closed: D6: yes, counts for the go-bag only.**
9. ~~How should the questionnaire separate a shelter-at-home preference from a required evacuation?~~ **Closed: D4.**
10. ~~Map for every saved destination? What detail is needed before a map can be made?~~ **Closed: D4: printable page with a directions link, no embedded map.**
11. ~~Which loading states get the redesigned loading screen, and which real milestones can be shown?~~ **Closed: D11.**
12. ~~Share / Download / Print menu contents: email, PDF and print only, or the fridge checklist and more?~~ **Closed: D9.**
13. ~~Attic option: what should it capture?~~ **Closed: D5: no attic now.**
14. ~~First AI assistant release: read-only? From which sections and sources?~~ **Closed: D13: not now.**
15. ~~Which profile, inventory, task, maintenance and destination changes may the assistant propose later?~~ **Closed: D13: not now.**
16. ~~Chat history storage and consent / retention before any household or health data reaches the AI provider?~~ **Closed: D13: not now.**
17. ~~Which admin roles edit, review, publish and roll back AI knowledge?~~ **Closed: D13: not now.**
18. ~~How do "Your home has…" answers feed "Where can you store supplies?" without repeating questions?~~ **Closed: D5.**
19. ~~**New:** Which dashboard tabs ship first (DB-03)?~~ **Closed: D9/D10 + Batch D: Overview / Inventory / Report.**
20. **New:** Say "no grid power for the whole period" in the question and plan (GRID-01)?

## 12. Owner decisions, November 22, 2026 (docs/BUILD_BRIEF.md)

D1–D13 are recorded in docs/BUILD_BRIEF.md. The build log is docs/BUILD_LOG.md, and the fact-check list is docs/FACTCHECK.md.
- **Launch track** (Batches A, B, C): menus and save bar, front page, loading screen, Copy for AI, evacuation / storage / filter questions, content kinds, card-grid plan view, Compare options, food approaches, water treatment, DIY tips (flag off), When you must leave, calendar.
- **Accounts track** (Batch D, `ACCOUNTS_ENABLED` off): account tiers, inventory, My places, dashboard tabs, food mixing, tip matching, email reminders, full export and delete.

### Later (decided to wait)
AI-01 in-app assistant · diet/allergy question · attic for gear · phone notifications · inventory expiry reminders · shared household editing · hard budget cap · Tasks tab · Days Ready score.

## 13. New notes

Append new observations under the right area with a new ID: the screen or page, what happens, the desired result,
and any screenshot reference. Mark entries Updated or Superseded when direction changes; don't overwrite.
