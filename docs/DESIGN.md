# Design standard

Every UI or copy change must meet this standard. `/ux-pass` scores every screen against it, and `tests/design.test.ts`
enforces the rules a machine can check. A rule here that the code breaks is a bug.

## Who it's for

A tired, slightly anxious person on a phone, often right after an outage or storm warning. They may live alone or
with a family; never assume either.

**The journey we want:** arrives worried → feels oriented within seconds → feels capable → leaves with a short,
doable list.

Each screen should move them one step along that line. If a screen makes them feel more worried, more lost or more
behind than when they arrived, it fails, however correct it is.

## Calm

| ID | Rule | How it's checked |
|---|---|---|
| C1 | No fear or urgency language: no "Don't wait!", "disaster could strike", "act now", countdowns, "before it's too late". Safety instructions may be direct ("Leave by the route officials give"), but they state what to do, not how scared to be. | `tests/design.test.ts` banned list |
| C2 | No exclamation marks in product copy. | `tests/design.test.ts` |
| C3 | Red (`--danger`) only for real safety warnings: carbon monoxide, generators, fire, evacuation orders, "Don't do this". Errors, budget notes and heavy-item notes use `--warn`, never red. | `tests/design.test.ts` (red only in safety components) |
| C4 | Generous spacing: at least 12px between stacked controls, 16px page gutters, one idea per card. | `/ux-pass` screenshots |
| C5 | At most one primary (amber `.btn`) action in view on any screen. Everything else is `.btn-ghost` or a link. | `tests/design.test.ts` (source), `/ux-pass` metrics (rendered) |
| C6 | No auto-playing or looping motion. Transitions under 250ms, and none under `prefers-reduced-motion`. | `tests/design.test.ts` (no `animate-spin`/`animate-pulse` without `motion-safe:`), `globals.css` |
| C7 | No stock disaster imagery (flames, flood photos, wrecked houses). Icons are simple line drawings. | review |
| C8 | No pop-ups or modals that interrupt a task. Menus open only when tapped. | review |

## Trust

| ID | Rule | How it's checked |
|---|---|---|
| T1 | Every number can show its math: key numbers show the formula; amounts in the plan link to the section that explains them. | `tests/` engine and overview tests |
| T2 | Sources are visible where advice is given: official links next to steps, `/sources` linked under the plan title. | `tests/pathways.test.ts` (every answer traces to a source or product) |
| T3 | Say plainly what's saved and where (`lib/copy.ts`). Never promise syncing, devices or accuracy the app doesn't deliver. | `tests/copy.test.ts` |
| T4 | The affiliate disclosure is clear and next to Buy buttons, wherever Buy buttons appear. | `tests/design.test.ts` |
| T5 | Prices are labeled as estimates wherever a list of them appears. | `tests/design.test.ts` |
| T6 | No dark patterns: no pre-ticked boxes, no confirm-shaming ("No thanks, I don't care about safety"), no fake scarcity or timers, no hidden costs. | `tests/design.test.ts` (no `defaultChecked`, no `useState(true)` for consent) |
| T7 | Consistent names: one name per thing (plan, shopping list, Day 0 checklist, fridge checklist, Save my plan). | `/ux-pass` term variants |
| T8 | Errors say what happened and what to do next, in plain words, and never blame the person ("invalid", "you failed", "wrong"). | `tests/design.test.ts` |
| T9 | Never claim precision we don't have: no "exact", "perfect" or "guaranteed". Amounts are planning amounts. | `tests/design.test.ts` |

## Ease

| ID | Rule | How it's checked |
|---|---|---|
| E1 | One clear next step on every screen, including empty, error and "done" states. | `/ux-pass` |
| E2 | Sensible defaults: the most common answer is preselected where it's safe to do so. | review |
| E3 | Back always works, and answers are kept. | e2e |
| E4 | Nothing required that isn't needed. Email is optional. | e2e |
| E5 | Reading level at or below grade 8; no sentence over 25 words in screen copy. | `/ux-pass` copy script |
| E6 | Tap targets at least 44×44px. | `/ux-pass` metrics, e2e |
| E7 | The main action is reachable by thumb (in the lower part of the first screen, or sticky). | `/ux-pass` metrics `firstPrimaryInView` |
| E8 | Empty, loading and error states are designed: a sentence that says what's going on and a way forward. | `/ux-pass` |

## Voice

A calm, knowledgeable neighbor.

- Short sentences. Say "you". Start steps with a verb ("Fill", "Test", "Write down").
- Reassuring, but never falsely. "You don't need to do this all at once" is true; "You'll be safe" is not ours to
  promise.
- Name the next small thing, not the whole mountain. "Start with these 3" beats "0 of 31 done".
- Explain why once, briefly, then get out of the way.
- Never assume a family, a car, a house or money. "You and your household."

| Instead of | Write |
|---|---|
| Don't wait until disaster strikes! | When you have 20 minutes, start with these. |
| Invalid ZIP | Enter your 5-digit ZIP code, like 43215. |
| Most important: … | Start here: … |
| Upgrade | Costs more |
| exact amounts | amounts worked out for your household |

## Color and components

| Token | Use for | Never for |
|---|---|---|
| `--accent` (amber) | the one primary action (`.btn`); progress fill | decoration, warnings |
| `--danger` (red) | safety callouts (`tone: "danger"`) and "Don't do this" lists | errors, budget, prices |
| `--warn` | form errors, over-budget and heavy-item notes | safety warnings |
| `--ok` | "done" and "sent" confirmations | |
| `--brand` | links, selected options, secondary emphasis | |

## Visual

| ID | Rule | How it's checked |
|---|---|---|
| V1 | One idea at a time. The plan's first screen (375×812) shows only the reassurance, "Start with these 3" and 3 compact step cards; details sit behind "How to do it", and numbers, the shopping list and saving start below the fold. | `e2e/design.spec.ts` |
| V2 | One count on screen: "0 of 3 done", then "This week: N of 10". A gear count appears only after something is ticked or owned. | `tests/nextSteps.test.ts`, e2e |
| V3 | "Prices are estimates." sits beside Buy boxes and Compare options, never under a reassurance line. | `tests/design.test.ts` |
| V4 | Errors and notices use `components/Notice.tsx`: a soft tint, a small icon, body-size text, and "Try again" where retrying helps. | `tests/design.test.ts` (no hand-made `role="alert"`) |
| V5 | Icons come from `components/Icon.tsx` only: simple line icons, brand blue, always next to a text label. | `tests/design.test.ts` (every chapter and section has one) |
| V6 | Illustrations are inline SVG, home-themed or abstract, no disaster imagery and no faces, under 15 KB. No image file over 30 KB. Lighthouse performance stays at 95+. | `tests/design.test.ts`, `/ux-pass` Lighthouse |
| V7 | Spacing does the separating: cards on the page background without borders, at least 12px between cards and 32px between chapters. Step text at body size (17px); lines capped at about 65 characters. | `/ux-pass` screenshots |

## Off the website (PDFs and emails)

| ID | Rule | How it's checked |
|---|---|---|
| O1 | The plan PDF's page 1 mirrors the web's first screen: the reassurance, "Start with these 3" (short titles with how-to), then the rest of This week. Chapters and icons as on the web. Body text 11–12pt; page numbers on every page. | `tests/offsite.test.ts` (page 1 text) |
| O2 | Everything printed works in black and white: dark ink, light tints only, safety callouts marked by a thick rule and a "SAFETY" label, never by color alone. No hyphenation. | review of `docs/review/design-3/` |
| O3 | The fridge checklist is exactly one page, readable from arm's length (12pt and up, 15pt for the first 3): the first 3 steps, the key amounts, contacts with blanks, Day 0 essentials, the CO rule. | `tests/offsite.test.ts` (every persona) |
| O4 | Emails: calm subjects (no urgency words, no "now" or "today", no exclamation marks), exactly one amber button, the first 3 steps near the top of the plan email, a matching plain-text version, no Amazon links, the mailing address and unsubscribe in HTML and text. | `tests/offsite.test.ts` |
| O5 | Emails render at 375px and in dark mode: `color-scheme: light dark`, a dark palette for clients that support it, a 600px max width, and no sideways scroll. | `tests/offsite.test.ts`, `scripts/email-shot.ts` |

## Scoring (used by `/ux-pass`)

Each screen gets 1–5 on **Calm, Trust, Ease, Clarity**, with one line of evidence per score.

| Score | Meaning |
|---|---|
| 5 | Meets every rule; a worried person would feel better after this screen. |
| 4 | Meets every rule; small polish left. |
| 3 | One rule broken, or the screen is correct but heavy (too much at once, unclear next step). |
| 2 | Several rules broken, or it adds worry or confusion. |
| 1 | Misleads, blocks or alarms. |

Anything under 4 is a finding to fix before release.
