# Design audit 2026-11-25

Scored against [docs/DESIGN.md](../DESIGN.md).

**What was captured:**
- Build `75ee7fd` on `claude/design-pass`, brand set in the shell only, flags off.
- Accounts screens come from a test-only server with the flags on.
- Raw capture: `.data/ux/2026-11-25-2/` (git-ignored). It has 194 screens with axe metrics, 8 household walkthroughs, Lighthouse mobile on 29 URLs, and copy metrics.

**How screens were scored:** 1–5 on Calm, Trust, Ease and Clarity, using the rubric in DESIGN.md. Scores come from the 375px light screenshot, checked against the dark and 768px versions. Each score has one line of evidence, listed under the scorecard. Anything under 4 is a finding.

**Before, average of 40 screens:** Calm **4.30** · Trust **4.13** · Ease **4.03** · Clarity **3.95**. Computed by `scripts/design-scores.ts`.
**After:** see [Re-score after the fixes](#re-score-after-the-fixes).

**Automated checks, before:**
- axe: 0 violations on all 194 captures.
- Lighthouse mobile: accessibility 100 on every URL, performance 90–100.
- No sideways scroll, and no tap targets under 44px.
- So most of the problems below are about tone, order and honesty, not markup.

## Scorecard (before)

| # | Screen | Calm | Trust | Ease | Clarity |
|---|---|---|---|---|---|
| 1 | Front page | 4 | 4 | 4 | 4 |
| 2 | Front page, menu open | 5 | 4 | 5 | 5 |
| 3 | Start | 5 | 4 | 5 | 4 |
| 4 | Help | 5 | 5 | 4 | 5 |
| 5 | About | 5 | 5 | 4 | 4 |
| 6 | Sources & safety | 5 | 5 | 4 | 4 |
| 7 | Terms / Privacy | 4 | 5 | 4 | 4 |
| 8 | Sample plan | 3 | 4 | 4 | 4 |
| 9 | Q1 Location (first question) | 4 | 5 | 3 | 4 |
| 10 | Q2 Household | 5 | 4 | 5 | 4 |
| 11 | Q3 Little ones | 5 | 4 | 5 | 5 |
| 12 | Q4 Pets | 5 | 4 | 4 | 4 |
| 13 | Q5 Medical | 5 | 5 | 4 | 4 |
| 14 | Q6 Home | 5 | 4 | 5 | 4 |
| 15 | Q7 Heat, cooking, water | 5 | 4 | 4 | 4 |
| 16 | Q8 Power and vehicles | 5 | 4 | 5 | 4 |
| 17 | Q9 Storage | 5 | 4 | 5 | 4 |
| 18 | Q10 If you have to leave | 4 | 4 | 5 | 4 |
| 19 | Q11 Budget, skills, consent | 4 | 4 | 4 | 4 |
| 20 | ZIP error | 4 | 3 | 3 | 3 |
| 21 | Loading | 5 | 5 | 4 | 5 |
| 22 | Plan build failed | 3 | 3 | 3 | 3 |
| 23 | Plan top | 2 | 4 | 3 | 4 |
| 24 | This week | 2 | 4 | 3 | 4 |
| 25 | Shopping list | 4 | 3 | 4 | 4 |
| 26 | Chapters (card grid) | 4 | 4 | 4 | 4 |
| 27 | Section open (water, evacuation) | 4 | 5 | 4 | 3 |
| 28 | Compare options | 3 | 3 | 4 | 4 |
| 29 | Share menu | 5 | 4 | 5 | 5 |
| 30 | Save bar and email form | 4 | 4 | 4 | 4 |
| 31 | Places (backup destination) | 5 | 5 | 4 | 4 |
| 32 | Maintenance list | 5 | 4 | 4 | 4 |
| 33 | Not found / expired plan | 3 | 3 | 2 | 3 |
| 34 | Account (flags off) | 4 | 4 | 4 | 3 |
| 35 | Flags on: plan tabs + food card | 4 | 4 | 4 | 3 |
| 36 | Flags on: DIY tips | 4 | 5 | 4 | 4 |
| 37 | Flags on: plan inventory | 4 | 4 | 3 | 4 |
| 38 | Flags on: My plans | 5 | 4 | 4 | 3 |
| 39 | Flags on: My places | 5 | 4 | 4 | 4 |
| 40 | Flags on: Reminders | 5 | 4 | 4 | 4 |

The averages come from this table. They're recomputed by `npx tsx scripts/design-scores.ts docs/ux/DESIGN_AUDIT_2026-11-25.md`.

## Evidence per score (before)

1. **Front page**
   - C4: calm headline, one amber button, line icons. The reassurance about time ("About 10 quick screens") only appears in the How it works cards, below the fold.
   - T4: "with the math shown" and "Free, no sign-up" are near the button. The affiliate note is at the very bottom.
   - E4: the main action is in the first screen and reachable by thumb.
   - Cl4: the way time is described doesn't match across the app: "About 10 quick screens" here, but "Step 1 of 11" and "About 5 min left" in the questionnaire.
2. **Front page, menu open**
   - C5: a quiet list, opened only on tap.
   - T4: Terms and Privacy are listed.
   - E5: 44px rows.
   - Cl5: plain labels.
3. **Start**
   - C5: "Let's build your plan" and one button.
   - T4: "Your answers save as you go" doesn't say where (on this device).
   - E5: one action.
   - Cl4: "About 10 quick screens" again, not a time.
4. **Help**
   - C5 and T5: honest saving answer ("saved on this device for 30 days").
   - E4: a long page of Q&A with no jump links.
   - Cl5: short answers.
5. **About**
   - C5 and T5: "it never sets or changes a number".
   - E4: one amber button, but it's at the bottom of a long block.
   - Cl4: the line "Wording may be smoothed by software" is vague.
6. **Sources & safety**
   - C5 and T5: sources are linked.
   - E4: long.
   - Cl4: "Quantities are planning estimates" is buried in the second paragraph.
7. **Terms / Privacy**
   - C4.
   - T5: complete.
   - E4: five short sections with headings. The page loads in 0.6 s.
   - Cl4: mostly plain. The liability sentence ("To the fullest extent the law allows…") is legal register, and that wording is the owner's (see "Chosen not to change").
8. **Sample plan**
   - C3: two amber buttons on one page ("Build your own" at the top, "Build my free plan" at the bottom). This breaks C5.
   - T4: it's clearly labelled as a sample.
   - E4.
   - Cl4.
9. **Q1 Location (first question)**
   - C4.
   - T5: "We never ask for your street address".
   - E3: Back is disabled on step 1 but styled as if it works, and there's no way back to the front page (E3).
   - Cl4: the ZIP error appears below the duration choices, far from the field.
10. **Q2 Household**
    - C5.
    - T4.
    - E5.
    - Cl4: "Is anyone elderly or has limited mobility?" isn't grammatical.
11. **Q3 Little ones**
    - C5, T4, E5, Cl5: simple multi-select.
12. **Q4 Pets**
    - C5 and T4.
    - E4: the screen is 1.5 screens tall, and "Takes medication?" sits under the sticky bar.
    - Cl4: "Pet group 1" is a term people don't use.
13. **Q5 Medical**
    - C5.
    - T5: "We don't ask about conditions or diagnoses".
    - E4: "None" is partly hidden by the sticky bar.
    - Cl4.
14. **Q6 Home**
    - C5, T4, E5.
    - Cl4: "Just the property. You'll pick where you can store supplies later." is clear.
15. **Q7 Heat, cooking, water**
    - C5, T4.
    - E4: 1.6 screens tall.
    - Cl4: three questions on one screen.
16. **Q8 Power and vehicles**
    - C5, T4, E5.
    - Cl4: "A portable power station counts as none" is a surprising rule, but it's explained.
17. **Q9 Storage**
    - C5, T4, E5.
    - Cl4.
18. **Q10 If you have to leave**
    - C4: "In an emergency, what would you rather do?" is fine.
    - T4, E5, Cl4.
19. **Q11 Budget, skills, consent**
    - C4: the "Almost done" teaser is a good touch.
    - T4: two boxes to tick, worded honestly.
    - E4.
    - Cl4.
20. **ZIP error**
    - C4: it uses `--warn`, not red.
    - T3: "Enter a 5-digit ZIP code." doesn't say what was wrong, and isn't tied to the field (no `aria-invalid`, not described by the error).
    - E3: the message sits below the choices, away from the field to fix.
    - Cl3: no example.
21. **Loading**
    - C5: three real stages, no spinner under reduced motion.
    - T5: the stages are true.
    - E4: nothing says how long it takes.
    - Cl5.
22. **Plan build failed**
    - C3: "Couldn't build the plan. Try again." is terse, and the person doesn't know if their answers are lost.
    - T3: it doesn't say what happened or that answers are kept (T8).
    - E3: the message doesn't move into view.
    - Cl3.
    - Server messages such as "Not found" (an expired questionnaire) or "Invalid answers" reach this same spot as they are.
23. **Plan top**
    - C2: the first things on the plan are "0 of 10 done", a progress bar at zero, and "You have 0 of 31 gear items". The first step starts with "Most important:". Nothing says "you can do this" before the work.
    - T4: math and sources are present.
    - E3: the progress counts appear before the first action.
    - Cl4.
24. **This week**
    - C2: 10 steps labelled "This week", with three shown. Nothing says the rest can wait.
    - T4.
    - E3: Buy boxes under the steps have no affiliate note nearby (see 25).
    - Cl4.
25. **Shopping list**
    - C4.
    - T3: Buy buttons with no affiliate disclosure next to them (T4), and the prices aren't labelled as estimates (T5).
    - E4.
    - Cl4.
26. **Chapters (card grid)**
    - C4, T4.
    - E4: "10 steps this week" repeats the pressure from the top of the plan.
    - Cl4.
27. **Section open (water, evacuation)**
    - C4.
    - T5: the math tables are shown.
    - E4.
    - Cl3: the water table shows "2 adult(s)" and "2 child(ren)".
28. **Compare options**
    - C3: the "UPGRADE" label reads as an upsell, and "$168 over your budget" sits under it in warning color.
    - T3: the prices aren't called estimates (T5).
    - E4.
    - Cl4.
29. **Share menu**
    - C5.
    - T4: the Copy for AI note is honest.
    - E5.
    - Cl5.
30. **Save bar and email form**
    - C4.
    - T4: an honest saving line.
    - E4.
    - Cl4: the invalid-email message is "Enter a valid email address."
31. **Places (backup destination)**
    - C5.
    - T5: "This isn't saved."
    - E4.
    - Cl4.
32. **Maintenance list**
    - C5, T4, E4, Cl4.
33. **Not found / expired plan**
    - C3: the heading is just "Not found".
    - T3: it doesn't explain the most likely reason: a plan built in another browser, or older than 30 days.
    - E2: the only action is an amber "Sign in", which is a dead end for a visitor without an account (E1).
    - Cl3.
34. **Account (flags off)**
    - C4, T4, E4.
    - Cl3: "Edit answers & regenerate" is jargon, and the dates show as "2026-11-25".
35. **Flags on: plan tabs + food card**
    - C4, T4, E4.
    - Cl3: the food card says "✓ Recommended mix" and then "Recommended mix: all ready-to-eat".
36. **Flags on: DIY tips**
    - C4: "Don't do this" is red, correctly, because it's a safety warning.
    - T5: sources are given.
    - E4.
    - Cl4.
37. **Flags on: plan inventory**
    - C4, T4.
    - E3: 31 rows, each with a status select, a quantity box and a date. Everything starts as "Need".
    - Cl4.
38. **Flags on: My plans**
    - C5, T4, E4.
    - Cl3: ISO dates ("2026-11-25").
39. **Flags on: My places**
    - C5.
    - T4: if a save fails, "Couldn't save. Check the address and try again." blames the address even when the connection failed (T8).
    - E4, Cl4.
40. **Flags on: Reminders**
    - C5, T4.
    - E4: the "Couldn't save" message is in muted grey and easy to miss.
    - Cl4.

## Emotional journey (before)

| Step | What the person likely feels | What on screen causes it |
|---|---|---|
| Front page | Worried, scanning: "Is this for me? How long will it take?" | Calm headline and one amber button, which orient them. The time it takes is only below the fold. |
| Start | Willing | "No sign-up. Your answers save as you go." |
| Q1 ZIP + duration | Slightly unsure: "how long *should* I plan for?" | "2 weeks · FEMA recommended" preselected, which reassures. A ZIP typo gives a vague error, far from the field. |
| Q2–Q10 | In a rhythm, a little tired by step 7 | "About N min left · Saved" and a steady progress bar. The screens are short. |
| Q11 consent | Careful | Two honest boxes. The "Almost done: 54 gal of water…" teaser gives momentum. |
| Loading | Expectant, a little anxious | Real stages, ticking. Good. |
| Plan top | **Overwhelmed: "I'm already behind."** | "0 of 10 done", "You have 0 of 31 gear items", "Most important: …", then three Buy boxes with prices. |
| This week | Pressure | 10 steps labelled "This week", and nothing says the rest can wait. |
| Shopping list / Compare | Suspicious: "Is this a store?" | Buy buttons without a nearby disclosure, "UPGRADE", "$168 over your budget". |
| Save bar | Reassured | "Saved on this device for 30 days" is plain and true. |
| Return visit (same browser) | Relieved | The plan opens with ticks kept. |
| Return visit (other browser, or after 30 days) | **Lost** | "Not found" plus an amber "Sign in" they can't use. |

**The target journey:** worried, then oriented, then capable, then leaving with a short list. Two places break it:
- **The plan top:** it says "behind" before it says "capable".
- **The expired / other-browser return:** it ends in a dead end.

## Violations, ranked by impact

| ID | Impact | Screen(s) | Rule | What's wrong | Fix |
|---|---|---|---|---|---|
| DA-1 | High | Plan top, This week | C1, E1, voice | No reassurance before the work. Zero-progress counts come first ("0 of 10", "0 of 31 gear items"), and 10 "This week" steps with no permission to pace. | Open with "Your plan is ready. You don't need to do this all at once." Head the list "Start with these 3. Everything else can wait.", shown only when it's true: these are the first 3 open steps in the plan's own priority order. Move the gear count into the shopping list. |
| DA-2 | High | Not found / expired plan | E1, E8, T8 | Dead end: "Not found" plus "Sign in" only. | Explain the likely reason (a plan opens only in the browser that built it, for 30 days). Give a primary way forward ("Build a new plan", about 5 minutes) and "Sign in" as a secondary action. |
| DA-3 | High | Shopping list, This week Buy boxes | T4 | Buy buttons with no affiliate disclosure next to them. | One-line disclosure directly above the Buy buttons in the shopping list and above the first step Buy box. |
| DA-4 | High | Plan build failed; all server errors | T8, E8 | "Couldn't build the plan. Try again." and raw server strings ("Not found", "Invalid answers", "Bot check failed.", "Enter a valid email.") reach the screen. | One `friendlyError()` map: what happened, that answers are kept, what to do. Error scrolled into view. |
| DA-5 | Medium | Compare options, shopping list | T5, C1 | "UPGRADE" reads as an upsell, and prices aren't labelled as estimates. | "Costs less" / "Costs more", and "Prices are estimates" in both places. |
| DA-6 | Medium | Q1 / ZIP error | E3, T8 | Back is disabled on step 1. The ZIP error is far from the field, not linked to it, and has no example. | Back on step 1 goes to the front page (answers are kept). ZIP error under the field, linked with `aria-invalid` / `aria-describedby`, with an example. |
| DA-7 | Medium | Sample plan | C5 | Two amber buttons on one page. | Top "Build your own" becomes a secondary button. |
| DA-8 | Medium | Questionnaire | Clarity | A restored draft can show "Step 100 of 11": the restore doesn't clamp the step. | Clamp to the last visible screen. |
| DA-9 | Medium | Front page, Start | Clarity, T7 | Time is described three ways ("10 quick screens", "Step 1 of 11", "About 5 min left"). The reassurance is below the fold. | "About 5 minutes" everywhere. A line under the button: "About 5 minutes. Free, no sign-up. You'll get a short list of what to do first." |
| DA-10 | Medium | All | C6 | Progress-bar transitions have no reduced-motion opt-out. | Global `prefers-reduced-motion` rule. Transitions are capped at 200ms. |
| DA-11 | Low | Copy for AI | T9 | "Use these amounts exactly" (FACTCHECK AI-1). | "Use these amounts as given; don't recalculate them." Recorded as FACTCHECK row AI-1a. |
| DA-12 | Low | Account, My plans | Clarity | "Edit answers & regenerate", and ISO dates. | "Change my answers", and dates like "Nov 25, 2026". |
| DA-13 | Low | Section open (water) | Clarity | "2 adult(s)", "2 child(ren)". | Proper plurals. |
| DA-14 | Low | Q2 Household | Clarity | "Is anyone elderly or has limited mobility?" | "Is anyone older or less mobile?" Not changed; see below. |
| DA-15 | Low | Flags on: food card | Clarity | "✓ Recommended mix" is repeated as "Recommended mix: …". | Show the name once. |
| DA-16 | Low | Flags on: My places, Reminders | T8, E8 | Save errors blame the address, or appear in grey. | "Couldn't save just now. Check your connection and try again." in `--warn`. |
| DA-17 | Low | Flags on: plan inventory | E2 | 31 rows that all start at "Need", with three inputs each. | Intro line "Only mark what you have; everything else stays on your list." Not restructured; see below. |

## Chosen not to change (and why)

- **Safety instructions that sound urgent:**
  - The lines are "Leave immediately." (evacuation orders) and "Move to higher ground now. Don't wait for water to rise." (flash flood). They're in the Day 0 decision triggers in `lib/plan/build.ts`.
  - They're safety rules taken from official guidance, and DESIGN.md C1 allows direct safety instructions.
  - The design test skips safety blocks (`tone: "danger"`, decision triggers). It still scans everything else.
- **"Most important:"** on the medical-device and well-pump steps. This is plan text that also goes into the PDF and emails, and it names a real priority rather than raising fear. The new "Start with these 3" heading does the calming job instead.
- **Terms / Privacy reading level:** legal wording is the owner's to change.
- **Q2 wording (DA-14):** the answer label feeds `docs/PATHWAYS.md` and the e2e tests by name. It's a polish item for the owner, logged in the backlog.
- **The inventory page layout (DA-17):** accounts track, behind a flag. It gets the intro line only. The layout change goes to the backlog.
- **Plan length** (6,000–9,000 words, 17–22 PDF pages, from the persona runs): the plan opens collapsed (about 600 words visible), so length isn't what the person sees first.

## Re-score after the fixes

**What was re-scored:**
- The same 40 screens, captured again on the final build with the fixed capture script.
- Raw capture: `.data/ux/2026-11-25-3/` (200 captures, 0 failed).
- Same rubric. Evidence is given where a score changed. Every other score keeps the "before" evidence above, re-checked against the new screenshots.

**Before → after (averages, `scripts/design-scores.ts`):**

| Quality | Before | After |
|---|---|---|
| Calm | 4.30 | 4.58 |
| Trust | 4.13 | 4.45 |
| Ease | 4.03 | 4.38 |
| Clarity | 3.95 | 4.20 |

**No screen scores under 4.**

| # | Screen | Calm | Trust | Ease | Clarity |
|---|---|---|---|---|---|
| 1 | Front page | 5 | 4 | 5 | 5 |
| 2 | Front page, menu open | 5 | 4 | 5 | 5 |
| 3 | Start | 5 | 5 | 5 | 5 |
| 4 | Help | 5 | 5 | 4 | 5 |
| 5 | About | 5 | 5 | 4 | 4 |
| 6 | Sources & safety | 5 | 5 | 4 | 4 |
| 7 | Terms / Privacy | 4 | 5 | 4 | 4 |
| 8 | Sample plan | 4 | 4 | 4 | 4 |
| 9 | Q1 Location (first question) | 4 | 5 | 5 | 4 |
| 10 | Q2 Household | 5 | 4 | 5 | 4 |
| 11 | Q3 Little ones | 5 | 4 | 5 | 5 |
| 12 | Q4 Pets | 5 | 4 | 4 | 4 |
| 13 | Q5 Medical | 5 | 5 | 4 | 4 |
| 14 | Q6 Home | 5 | 4 | 5 | 4 |
| 15 | Q7 Heat, cooking, water | 5 | 4 | 4 | 4 |
| 16 | Q8 Power and vehicles | 5 | 4 | 5 | 4 |
| 17 | Q9 Storage | 5 | 4 | 5 | 4 |
| 18 | Q10 If you have to leave | 4 | 4 | 5 | 4 |
| 19 | Q11 Budget, skills, consent | 4 | 4 | 4 | 4 |
| 20 | ZIP error | 5 | 5 | 5 | 5 |
| 21 | Loading | 5 | 5 | 4 | 5 |
| 22 | Plan build failed | 4 | 5 | 5 | 4 |
| 23 | Plan top | 4 | 4 | 4 | 4 |
| 24 | This week | 4 | 5 | 4 | 4 |
| 25 | Shopping list | 4 | 5 | 4 | 4 |
| 26 | Chapters (card grid) | 4 | 4 | 4 | 4 |
| 27 | Section open (water, evacuation) | 4 | 5 | 4 | 4 |
| 28 | Compare options | 4 | 5 | 4 | 4 |
| 29 | Share menu | 5 | 4 | 5 | 5 |
| 30 | Save bar and email form | 4 | 4 | 4 | 4 |
| 31 | Places (backup destination) | 5 | 5 | 4 | 4 |
| 32 | Maintenance list | 5 | 4 | 4 | 4 |
| 33 | Not found / expired plan | 5 | 5 | 5 | 4 |
| 34 | Account (flags off) | 4 | 4 | 4 | 4 |
| 35 | Flags on: plan tabs + food card | 4 | 4 | 4 | 4 |
| 36 | Flags on: DIY tips | 4 | 5 | 4 | 4 |
| 37 | Flags on: plan inventory | 4 | 4 | 4 | 4 |
| 38 | Flags on: My plans | 5 | 4 | 4 | 4 |
| 39 | Flags on: My places | 5 | 5 | 4 | 4 |
| 40 | Flags on: Reminders | 5 | 4 | 5 | 4 |

### Evidence for the scores that changed

- **1 Front page:**
  - C5 and E5: "About 5 minutes. Free, no sign-up. You'll get a short list of what to do first…" now sits right under the button, in the first screen.
  - Cl5: one way to say how long it takes, used everywhere.
- **3 Start:**
  - T5: "Your answers are saved in this browser as you go" says where.
  - Cl5: "About 5 minutes".
- **8 Sample plan:**
  - C4: one amber button. "Build your own" is now a plain button.
- **9 Q1 Location:**
  - E5: Back goes to the front page (`e2e/design.spec.ts`), and the ZIP error sits under the field.
- **20 ZIP error:**
  - "Enter your 5-digit ZIP code, like 43215." (or "That's 3 digits. A ZIP code has 5, like 43215."), under the field.
  - The field is focused, with `aria-invalid` set and linked to the message (5/5/5/5).
- **22 Plan build failed:**
  - "We couldn't build your plan just now. Your answers are saved. Try again in a minute.", scrolled into view right above "Build my plan".
  - C4: it's still a failure, shown in warning color.
- **23 Plan top:**
  - C4: it now opens with "Your plan is ready. You don't need to do this all at once." The gear count moved into the shopping list.
  - "0 of 10 done" and the "Most important:" step text remain (see "Chosen not to change"), so it's a 4, not a 5.
- **24 This week:**
  - C4: "Start with these 3 / Everything else can wait.", which is true by test (`tests/nextSteps.test.ts`).
  - T5: "Prices are estimates." next to the Buy boxes, with the commission line when Buy links can earn one.
- **25 Shopping list:**
  - T5: the note sits above the Buy buttons.
- **27 Section open:**
  - Cl4: the table reads "2 adults", "2 children".
- **28 Compare options:**
  - C4: "Costs less" / "Costs more", and "The same job at different prices… switch only if another suits you better."
  - T5: "Prices are estimates."
- **33 Not found:**
  - C5 and T5: "We can't find that page", followed by the likely reason in plain words.
  - E5: "Build a new plan" (primary) and "I confirmed my email: sign in".
  - Cl4: the explanation is two sentences long.
- **34 Account:**
  - Cl4: "Change my answers", and dates like "Nov 25, 2026".
- **35 Food card:**
  - Cl4: "✓ Your pick", then "Recommended mix: all ready-to-eat".
- **37 Plan inventory:**
  - E4: "You only need to change what you already have. Everything else stays on your list as Need." The layout is unchanged (backlog).
- **38 My plans:**
  - Cl4: dates like "Nov 25, 2026".
- **39 My places:**
  - T5: a failed save says "We couldn't save that just now. Check your connection and try again.", in warning color, and no longer blames the address.
- **40 Reminders:**
  - E5: a failed save now shows in warning color, not grey.

### Emotional journey (after)

The two breaks are closed.
- **The plan top:** it says "capable" before it shows any work: "Your plan is ready. You don't need to do this all at once." Then "Start with these 3. Everything else can wait."
- **The other-browser / expired return:** it explains what happened and offers a 5-minute way forward.
- **Shopping list and Compare:** they read as advice rather than a store: "Costs more" instead of "UPGRADE", and prices are called estimates next to every Buy button.

### Automated checks (after)

- axe: 0 violations on all 200 captures.
- No sideways scroll and no tap targets under 44px.
- Lighthouse: see the PR description. Accessibility stays at 100 on every URL.
- Guardrails added in this pass: `tests/design.test.ts` (45 tests) and `e2e/design.spec.ts` (2 tests, one amber button and red only for safety, on rendered screens).
