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

## Left out (no official source found)
_(none yet)_
