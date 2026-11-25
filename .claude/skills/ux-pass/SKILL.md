---
name: ux-pass
description: Run a repeatable UX and design review of the app (screens at phone and tablet size in light and dark, 8 scripted household walkthroughs, heuristic and plain-language review, Lighthouse mobile and axe), write docs/ux/UX_PASS_<date>.md, add Suggested UX-n items to docs/BACKLOG.md and open a draft PR. Never changes app code, tests or copy. Use when asked for a UX pass, design review or usability check.
---

# UX pass

A review, not a fix. **Never edit app code, tests, copy, config or `package.json` during /ux-pass.** The only files
committed are `docs/ux/UX_PASS_<date>.md` and `docs/BACKLOG.md`. Everything else (screenshots, JSON, logs) goes to
`.data/ux/<date>/`, which is git-ignored. If a script here breaks because the app changed, fix the script under
`.claude/skills/ux-pass/scripts/` in a separate commit on a separate branch, never in the pass's branch.

`<date>` is today in `YYYY-MM-DD`. A second pass on the same day uses `<date>-2` (then `-3`) for `UX_DATE`, the
`.data/ux/` folder and the report name, so the earlier pass stays intact for "compare with last pass". All commands run from the repo root in Git Bash. Set
`NEXT_PUBLIC_BRAND_NAME=ReadyReport` in the shell only, as for `/release-check`. Never turn a flag on outside the
test-only server below, never touch `.env*` files, migrations or hosting.

## 0. Setup

```bash
DATE=$(date +%F); export UX_DATE=$DATE NEXT_PUBLIC_BRAND_NAME=ReadyReport
git switch claude/readyplan-emergency-app-kge8mc && git pull --ff-only
git switch -c ux-pass/$DATE
npx next build
rm -rf .data/ux/$DATE && mkdir -p .data/ux/$DATE
# Demo mode, flags off (the real defaults):
READYPLAN_DATA_DIR=.data/ux/$DATE/srv-off APP_URL=http://localhost:3300 ADMIN_EMAILS=admin@example.com CRON_SECRET=ux npx next start -p 3300 &
# Test-only server for the accounts track. The flags are on for this process only:
READYPLAN_DATA_DIR=.data/ux/$DATE/srv-on APP_URL=http://localhost:3301 ADMIN_EMAILS=admin@example.com CRON_SECRET=ux ACCOUNTS_ENABLED=true DIY_TIPS_ENABLED=true npx next start -p 3301 &
```
Wait until both answer on `/` before going on. Stop both servers when the pass is done (find them by port; don't
kill unrelated node processes).

## 1. Screens + axe: `npx tsx .claude/skills/ux-pass/scripts/capture.ts`
Every screen at 375×812 and 768×1024, light and dark: front page and menu, start, help, about, sources, terms,
privacy, sample, each questionnaire screen (a household that shows all 11), the ZIP error, loading, the plan top,
each of the 4 chapters, an expanded section card (water, evacuation), Compare options, the Share and site menus, the
save bar, places, maintenance, not-found, the flags-off account page, and with the flags-on server the plan tabs,
food card, tips, inventory and the four account pages. Output: `screens/*.png` (plus `-full.png` at 375 light),
`metrics.json` (sideways scroll, tap targets under 44px, primary buttons, axe violations per variant) and
`texts.json`. A `FAIL` line means a selector no longer matches the app: note it in the report and fix the script
afterwards, separately.

## 2. Personas: `npx tsx .claude/skills/ux-pass/scripts/personas.ts`
8 households tap through the real flow from the front page at 375×812: solo apartment renter, family with toddlers,
elderly with mobility needs, powered medical device, rural wildfire, Gulf hurricane, tight budget (under $500),
generous budget. The script records taps, keystrokes, screens, whether an answer sat below the first screenful,
whether the main button was visible, every error hit, the questions and helper text shown, the plan length (words,
sections, phone screens, PDF pages) and the first 3 steps. It saves each plan's full text to `personas/<id>-plan.txt`.

You then read each plan text and judge, per household:
- any choice that needs knowledge the helper text doesn't give (use the recorded `questions` and `helperText`);
- dead ends (an error with no way forward, a link to nothing, a step that can't be done) and contradictions between
  sections (amounts, advice or items that disagree);
- whether the first 3 steps fit that household (a renter told to buy a generator, an oxygen user whose first steps
  ignore power, and so on).

## 3. Lighthouse + copy evidence
```bash
npx tsx .claude/skills/ux-pass/scripts/lighthouse.ts   # Lighthouse mobile on every URL-addressable screen
npx tsx .claude/skills/ux-pass/scripts/copy.ts         # grade level, sentences > 25 words, term variants, promise/tone/family lines
npx tsx .claude/skills/ux-pass/scripts/summary.ts      # → .data/ux/<date>/summary.md
```
Lighthouse audits page loads, so menus and expanded cards (same URL as their page) are covered by axe only. Say so
in the report.

## 4. Heuristic review (you, screen by screen)
Look at the 375 light and dark screenshots of every screen (and 768 where layout changes), with `summary.md` open.
Check each screen against:
- **Nielsen's 10 heuristics:** visibility of status; match with the real world; user control and freedom;
  consistency and standards; error prevention; recognition over recall; flexibility and efficiency; aesthetic and
  minimalist design; help users recognize, diagnose and recover from errors; help and documentation.
- **Plain language:** grade 8 or lower; flag every sentence over 25 words (from `copy.json`).
- **One primary action per screen** (more than one `.btn` in view competes).
- **Tap targets 44px** (inline text links are listed separately; judge them).
- **Contrast** (axe `color-contrast`, both schemes) and **no sideways scroll**.
- **Consistent terms:** the same thing never has two names (`copy.json` term variants are leads, not verdicts).
- **Honest copy:** nothing promises saving, syncing, devices or accuracy the app doesn't deliver. Check each
  promise line against what the app does (e.g. no-account plans are saved on this device for 30 days only).
- **Tone:** calm, never alarmist, never assumes a family (households can be one person).

Every finding needs evidence you saw: a screenshot, a metric or a quoted line. Don't report guesses.

## 4b. Design score (against docs/DESIGN.md)
Read `docs/DESIGN.md` first. Score **every captured screen** 1–5 on **Calm, Trust, Ease and Clarity** with its rubric,
from the 375 light screenshot (check dark and 768 too), with one line of evidence per score. Write the scores as a
table with exactly this header, so the script can read it:
```
| # | Screen | Calm | Trust | Ease | Clarity |
```
Then run `npx tsx scripts/design-scores.ts docs/ux/UX_PASS_<date>.md`. It prints the average per quality and every
screen under 4, and exits 1 if any score is under 4. **Every score under 4 is a finding** (P1 if it misleads, alarms
or dead-ends; P2 otherwise), with the DESIGN.md rule it breaks. Compare the averages with the newest
`docs/ux/DESIGN_AUDIT_*.md` or earlier pass, and say which went down.

## 5. Report: `docs/ux/UX_PASS_<date>.md`
```
# UX pass <date>
Build <short sha> on <branch>; brand set in shell; flags off (accounts screens from a test-only flags-on server).
## Summary            P1 n · P2 n · P3 n; 3–5 lines on what matters most
## Findings
### P1: blocks or misleads
#### UX-<n> <short title>
- Screen: <name> (375 light; also …)   - Screenshot: .data/ux/<date>/screens/<file>.png
- What's wrong: …   - Why it matters: …   - Suggested fix: …
### P2: friction        ### P3: polish
## Persona walkthroughs   table: household · taps · screens · plan words / PDF pages · first 3 steps fit? · notes
## Design scores         the 4b table, the averages per quality, every score under 4 (DESIGN.md rule broken)
## Automated checks       axe totals by rule; Lighthouse table; sideways scroll; tap targets
## Compare with last pass  Fixed / New / Still open, by UX-n (first pass: say so)
## Questions only real users can answer   5–10 short items
## Method and limits      what was and wasn't covered (e.g. Lighthouse per URL, simulated personas, no screen reader)
```
Ranking: **P1** blocks a task or misleads (wrong promise, unsafe or contradictory advice, an a11y blocker, a dead
end). **P2** friction (extra taps, unclear choices, long text, small targets, inconsistent terms). **P3** polish.
Screenshot paths point into `.data/ux/<date>/` (local, not committed); name the file so the owner can regenerate it.

**Compare with last pass:** open the newest earlier `docs/ux/UX_PASS_*.md`. For each of its UX-n findings, check the
new evidence: **Fixed** (gone), **Still open** (keep the same UX-n; don't renumber) or **Changed**. New problems get the
next free UX-n (highest UX-n in `docs/BACKLOG.md` + 1).

## 6. Backlog
Add each **new** finding to `docs/BACKLOG.md`: a row in the status table at the top
(`| UX-<n> | <title> | P1/P2/P3 | **Suggested** (UX pass <date>) |`) and a short entry under the section
`## 14. UX pass findings (Suggested)` (create it once; add a `### UX pass <date>` heading per pass). Status is always
**Suggested**, never "Decided": only the owner decides. Mark a fixed item "Fixed per UX pass <date>" but don't delete it.

## 7. Commit and PR
```bash
git add docs/ux/UX_PASS_$DATE.md docs/BACKLOG.md   # nothing else
git commit -F <message file>
git push -u origin ux-pass/$DATE
gh pr create --draft --base claude/readyplan-emergency-app-kge8mc --title "UX pass $DATE" --body-file <body file>
```
Check `git status` first: if anything other than those two files changed, stop and find out why (a script must
never write into the app). Never merge the PR. Reply with the P1/P2/P3 counts and the PR link.
