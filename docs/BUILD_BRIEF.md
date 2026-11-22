# BUILD BRIEF (owner decisions, Nov 22 2026). Read all of it before planning.

Owner corrections after the first plan (also decided):
- D2: plans have no shareable link (loadPlanFor: same browser or signed-in owner), and none is added.
  No-account saving = stored server-side on the plan, available in this browser for 30 days. Copy says so:
  "Saved on this device for 30 days. Confirm your email to keep it and use it on any device."
- The five "Questions for owner" defaults in the plan were accepted (see docs/BUILD_LOG.md).
- A unit test checks that no user-facing string promises a shareable link or saving across devices without an account.

=============== HOW TO RUN THIS ===============
You are in PLAN MODE. Do not change files yet. Read CLAUDE.md, docs/BACKLOG.md, docs/PATHWAYS.md, README.md and the code each decision touches. Produce ONE complete implementation plan for everything in this brief. I'll approve it and you'll run it to completion in auto mode, unattended.

THE PLAN MUST CONTAIN
1. Questions for owner, FIRST: only what you can't decide from this brief, each with the default you'll use if I don't answer. Keep it short.
2. A numbered task list covering D1–D13, grouped into Batches A, B, C (launch track) and D (accounts track). Each task gives:
   - ID (A1… D-n) and the decision(s) it implements
   - files to create or change
   - schema changes (migration name + file-store equivalent)
   - feature flag
   - tests to add or update
   - acceptance criteria (specific and checkable)
   - risks and dependencies
3. Feature flags with defaults: ACCOUNTS_ENABLED (off), DIY_TIPS_ENABLED (off until my fact-check), plus any others needed.
4. Branch/PR map: one branch + draft PR per batch, stacked. A starts from claude/headline-copy (PR #6); D starts from C.
5. A verification plan per batch: /release-check, phone screenshots in light + dark, plus manual checks.
6. The progress-log format (see the rules at the end).

First task of the run: record every decision below in docs/BACKLOG.md (mark items "Decided" with the decision number; close the matching open decisions) and copy this file into the repo as docs/BUILD_BRIEF.md if it isn't already there.

=============== DECISIONS ===============
D1  LAUNCH LEAN. Two tracks:
    - Launch track: items marked [LAUNCH].
    - Accounts track: items marked [ACCOUNTS], on their own branch behind ACCOUNTS_ENABLED (default off), so it can never block launch.

D2  ACCOUNTS
    - No account: ticks + inventory save to the plan's private link for 30 days (same as ticks today).
      (Corrected above: saved on this device for 30 days; no shareable link.)
    - Confirmed email (existing magic link, no password) = full features: permanent save, any device, several plans per account, dashboard, reminders, export + delete.
    - Plan, PDF, fridge checklist and print never need email.
    - Shared household editing: later.

D3  BUDGET is a flexible target, not a cap (GEAR-01).
    - One main pick per slot, plus "Compare options" (Lower-cost / Upgrade / Other choices) showing the price difference and new total.
    - Show "$X over your budget"; never change the stated budget.
    - Safety items (CO alarms, water, first aid) always come first. Commission never affects ranking.
    - No hard-cap setting.

D3b "NO TIME TO BUY? USE WHAT YOU HAVE"
    - Short boxes in water, heat, sanitation, light and power, plus a compact one in Day 0.
    - Tips stored as structured data in one library: situation, materials, steps, official source URL (Ready.gov/CDC/EPA/Red Cross), "don't do this" warning, last_reviewed.
    - Each box has a "Don't do this" list: candle/terracotta heaters; grills or camp stoves indoors; gas oven for heat; running a car in an attached garage; plugging a generator into a wall outlet. Extend the safety linter to block these anywhere in the plan.
    - No amounts from memory: link to official instructions (e.g. EPA bleach disinfection).
    - Behind DIY_TIPS_ENABLED until I approve a fact-check.

D4  EVACUATION (EV-01/02)
    - Q1: "During an emergency, what's your preferred approach?" Stay home when it's safe / Family or friends / Another property / Hotel or public shelter / Not sure yet.
    - Q2, always asked: "If your home becomes unsafe or officials order an evacuation, where could you go?"
    - Every plan has a "When you must leave" section with the line "Official evacuation orders override this plan."
    - Map = a To do task: "Add your backup destination".
      [ACCOUNTS] Address saved encrypted under "My places" (next to Inventory), with a printable page: name, address, link to directions in a maps app. It feeds evacuation distance and fuel.
      [LAUNCH] Without an account: type the address and print, nothing saved, note "Confirm your email to save your places."
    - The address is never used in emails, analytics or AI. No embedded map service.

D5  HOME & STORAGE (HOU-01/02)
    - "Your home has…" = property features only.
    - Storage: "Which spaces can you realistically use for emergency supplies?" Show only spaces they said they have, plus Closets / Other indoor space.
    - Separate answers: "Very limited space" and "No suitable storage" (compact kits vs a buy-when-warned plan).
    - Store presence and usability as separate fields.
    - No attic (backlog: later, only for heat/cold-tolerant gear; never water, food, batteries, medicine or fuel).

D6  WATER (WT-01/02/03)
    - Filter question asks the type, with plain descriptions: Household filter (gravity or pump, fills containers) / Personal filter (straw or bottle, like LifeStraw) / Both / None. A personal filter counts for the go-bag, not household supply.
    - Treatment, layered: stored water first; household filter is the main way to make more; tablets as a light backup; boiling as the fallback; straw filter for the go-bag. Each method states what it does NOT remove.
    - Never write dosages: point to the product label and CDC/EPA.
    - Full water kit (containers, dispensing, rotation labels, spare filter elements, backup method) if ready.
    - All water text goes to FACTCHECK.

D7  FOOD (FD-01/02/03)
    - Approaches: Bulk staples / Ready-to-eat (canned, pouches) / Ration & freeze-dried kits.
    - Default mix derived from existing answers (stove/fuel, storage, budget). "Compare food options" to switch or mix anytime; the calorie total is unchanged.
    - Ration bars = go-bag/short-term only. Freeze-dried notes that it needs hot water.
    - Comparison: cost, preparation, water/fuel needed, space, shelf life.
    - Containers only for bulk staples, sized to the quantity.
    - Diet/allergy question deferred: add "Adjust for any allergies or diets in your household."
    - All food text goes to FACTCHECK.

D8  CONTENT KINDS (PL-02). Every plan line is one of:
    - Good to know: plain text, no checkbox.
    - To do: checkbox; only these count toward progress.
    - To have: an item with have/need status and a Buy link if missing.
    Label every line in lib/plan/build.ts; add a test that every block has a kind.
    [LAUNCH] labels + display. [ACCOUNTS] "To have" links to inventory.

D9  MENUS (LP-01, PL-03, PL-04)
    - Top-right menu.
      Visitor: Sign in, Help, About, Sources & safety, Terms, Privacy.
      [ACCOUNTS] Signed in adds: My plans, Household & inventory, My places, Reminders, Privacy & data, Sign out.
      Only show features that exist.
    - Share / Download / Print menu in the plan header: Email me my plan, Download PDF, Fridge checklist, Print, Copy for your AI assistant.
    - Replace the big email box with one slim visitor bar: "Save your plan and inventory: confirm your email."
    - Full sources and general disclaimers move to Sources & safety.
    - These STAY on the page: "General guidance, not professional advice" under the title, the affiliate disclosure directly above Buy links, and safety warnings where they apply.

D10 FRONT PAGE & PLAN LAYOUT (LP-05/06)
    - The front page is about building your own plan.
    - "What's in your plan" = four chapter cards (Do now, Supplies, Power & heat, People & plans): icon, one-line outcome, 2–3 example values.
    - Sample plan = a small secondary button beside "Build my free plan".
    - Plan view (everyone's, including the sample): chapter tabs pinned to the top while in the plan; per chapter, a card grid (2 across on phones), one card per section with its key number; tap to expand. No sideways scrolling.

D11 LOADING SCREEN (LP-07)
    - A calm card with three real stages that tick off as they actually finish: "Reading your area's hazards", "Calculating water, food and fuel for your household", "Organizing your first steps".
    - No padding, no percentage. Static ticks under reduced motion. Screen-reader status announcements.
    - Only for the build after the last question; rebuilds keep an inline spinner.

D12 REMINDERS (MT-01)
    [LAUNCH] "Add to my calendar" (.ics: Apple/Google/Outlook) + printable maintenance list, no account.
    [ACCOUNTS] Opt-in email reminders when items are due, per-type on/off and frequency, a separate switch from marketing.
    Later: inventory expiry-date reminders, phone notifications.

D12b COPY FOR YOUR AI ASSISTANT [LAUNCH]
    - Button in the Share menu and next to "Add to my calendar". Explainer under it: "Copies a summary of your plan to paste into ChatGPT, Claude or Gemini, so it can set reminders and answer questions. Health details and addresses aren't included."
    - After copying: "Copied. Paste it into your AI assistant to get started."
    - Includes: household summary (counts, region, scenario length), key amounts, maintenance schedule.
    - Excludes: health answers, consent records, addresses.
    - Ground rules in the text: "Use these amounts exactly; don't recalculate them." "Follow the product label and CDC/EPA guidance for water treatment; never give dosages." "Never suggest grills, generators or heaters indoors or in a garage." "Official evacuation orders override this plan." "This plan's numbers come from [BRAND]; your assistant's advice is its own."
    - Ends with suggested asks: set reminders for these dates; help me with my first 3 steps.
    - Test: health answers and addresses never appear in it. The text goes to FACTCHECK.

D13 IN-APP AI ASSISTANT (AI-01): not now. Count "Copy for your AI assistant" clicks on the admin dashboard as the signal. Backlog stays "Later".

=============== ORDER OF WORK ===============
LAUNCH TRACK
Batch A, shell & front page: D9 menus + slim save bar; D10 front page + sample button; D11 loading screen; D12b copy-for-AI (+ admin click count).
Batch B, questionnaire: D4 evacuation questions; D5 home/storage; D6 filter-type question. Update docs/PATHWAYS.md; the pathway test must pass.
Batch C, plan content & layout: D8 content kinds; D10 card-grid plan view; D3 compare options + safety-first order; D7 food approaches + containers; D6 water treatment + kit; D3b tip library + linter (behind the flag); D4 "When you must leave" + backup-destination task + print page; D12 calendar + printable list.

ACCOUNTS TRACK (behind ACCOUNTS_ENABLED; branch off Batch C)
Batch D:
- D2 tiers (30-day link saving; account = permanent, any device, several plans)
- inventory (have/need/bought/low, quantity, optional expiry) feeding the shopping list
- D8 "To have" link to inventory
- D4 My places (encrypted)
- dashboard tabs Overview / Inventory / Report
- D7 food mixing on the dashboard
- D3b tip-to-inventory material matching
- D12 opt-in email reminders
- export and delete-my-data include everything
- authorization tests: no one can read or change another user's data

LATER (leave in the backlog): AI-01, diet/allergy question, attic for gear, phone notifications, shared household editing, hard budget cap, Tasks tab, Days Ready score.

=============== RULES FOR THE AUTO-MODE RUN ===============
- Do NOT stop between batches. Finish a batch, verify it, commit, push its branch, open or update its draft PR, then continue.
- Progress log: create docs/BUILD_LOG.md at the start. After every task, record its ID, status (done / blocked / skipped), commit hash and a one-line note. If the session restarts or context runs out, re-read BUILD_LOG.md and continue from the first unfinished task. Never redo finished tasks.
- Commit after every task. Push at the end of each batch.
- Tests must be green before the next batch. If a failure can't be fixed after 3 serious attempts:
  * mark the task "blocked" with the error and what you tried;
  * revert that task's changes so the batch stays green;
  * continue with tasks that don't depend on it.
  Never disable, skip or weaken an existing test.
- Anything you'd normally ask me: choose the most conservative option consistent with this brief, log it under "Assumptions for owner review" in BUILD_LOG.md, and continue.
- Safety text: never invent quantities, dosages or safety claims. Every new safety-relevant sentence (water, food, heat, power, fuel, kids, evacuation, DIY tips, the Copy-for-AI ground rules) goes into docs/FACTCHECK.md with its file, the exact text and its official source URL. No source found = leave it out and log that.
- Every batch:
  * quantities come only from the rules engine; the brand name only via lib/brand.ts; copy never assumes a family
  * new questions/answers update docs/PATHWAYS.md, and the pathway test passes
  * new data = migration + file-store equivalent, encrypted where personal, included in export and delete
  * run /release-check; take phone screenshots (light + dark) of changed screens; update statuses in BACKLOG.md
- Works on Windows PowerShell and in the cloud (use the repo's cross-platform test scripts).
- NEVER, even in auto mode:
  * merge PRs or push to claude/readyplan-emergency-app-kge8mc or main
  * apply migrations to Supabase, or touch real .env files, secrets, keys or hosting/DNS/email accounts
  * pick or hard-code a product name
  * turn ACCOUNTS_ENABLED or DIY_TIPS_ENABLED on by default
  * delete data or tests not owned by your tasks
  * force-push, reset --hard on shared branches, or delete branches
- At the end, write a final report at the top of docs/BUILD_LOG.md: what shipped per batch, PR links, test results, the blocked list, the assumptions list and the fact-check count.
