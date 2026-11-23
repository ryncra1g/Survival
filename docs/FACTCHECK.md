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

## Left out (no official source found)
- [B3] "It doesn't make enough water for the household" (about personal straw or bottle filters) was left out: no official source found that states it.
