# Pathways: what each answer changes

Every answer changes the plan. Three kinds of change: **products** (what's recommended or held back),
**skills to practice**, and **considerations** (guidance, decisions, warnings). Enforced by
`tests/pathways.test.ts`:

- **Every answer matters:** 69 single-answer changes, each must change the plan and trace to a product,
  a quantity, or a step with a Buy option or official link.
- **Pairwise:** 80 generated households covering all 2,419 pairs of answers. Each must pass
  the rules below and the safety linter.

Answers are version 2 (owner brief D4, D5, D6). Saved version 1 answers are migrated on every parse
(`migrateAnswers` in lib/answers/schema.ts; tests/migrate.test.ts).

## Rules the tests enforce
**Don't sell what they already have**

| They have | They are NOT offered |
|---|---|
| Portable or standby generator, or solar + battery | Another generator |
| Solar + battery | Solar panels, a second power station |
| A household filter (or both) | Water filters (they're told to test theirs and keep spare cartridges) |
| Only a personal (straw or bottle) filter | Nothing held back: it counts for the go-bag, not the household supply, so the household filter is still offered |
| Standby generator | A well transfer switch |
| Apartment | Any fuel-burning gear or fuel storage (generators, gas cans, propane heater, camp stove, cords, interlock) |
| No pets / no children / no vehicle / no drive destination (public shelter, not sure yet) / not raw land | Pet kit / kids kit / vehicle kit / go-bags / tent |

**Cover what they lack**

| They lack or have | They get |
|---|---|
| Powered medical device | Battery backup, always bought, even on the smallest budget |
| Well, no standby generator | Well transfer switch, offered (shown as "plan for it" if above budget) |
| No filter + scenario over 14 days | Water filter offered |
| Anyone | CO alarms and a water container always; power bank, radio, first aid always at least offered |
| Tight budget | Low-cost gallon jugs or refilled bottles instead of 7-gal jugs (upgrade later) |
| Generous budget | Sturdy 7-gal jugs |
| Fallback location but no vehicle | "No car: plan your ride now" and a backup ride; no fuel math |

**Skills to practice (in the Priority list)**

| Answer | If yes | If no |
|---|---|---|
| First aid | Refresh CPR every 2 years | Take a Red Cross First Aid/CPR class |
| Tools / DIY | Do the DIY jobs; electrician for the generator hookup | Have someone show you the gas, water and electric shutoffs |
| Camping (raw land or 30+ days) | Check the gear you own against the list | One practice night "camping" at home |
| Generator, wood stove, well, medical device, filter, pets, kids | A matching practice item (start/refuel safely, ash disposal, switch the pump, time the battery, filter a gallon, carrier drill, meeting-place walk) | — |

**Considerations by equipment and space**

| Answer | Consideration |
|---|---|
| Oil heat | Keep the tank above ¼ from Nov–Mar |
| Propane heat | Keep the tank above ½ in winter; supplier's emergency number |
| Wood heat | Chimney inspection, firewood; no propane-heater strategy |
| Storage: garage / basement / shed / closets / other indoor / limited | Where to keep water, food, fuel; basements in flood areas keep things off the floor; limited space starts with 2 weeks |
| No suitable storage | Keep the first 3 days of water and a go-bag; buy the rest as soon as a storm is forecast |
| Has a shed but can't use it for supplies | It's still the place for gas cans and propane, away from the house |
| Preferred approach (stay home, family or friends, another property, hotel or shelter, not sure) | A step for that approach with Ready.gov evacuation guidance (Red Cross shelter finder for hotel or shelter) |
| Approach is a place (UX-5): family or friends → their home; another place I own → second home or cabin, or land with no buildings; hotel or shelter → hotel or motel, or a public shelter. Only "which one" and the distance are asked. Stay home / not sure → the full "where could you go?" question | The destination row below for whichever place it fills in (`destinationForApproach` in lib/answers/schema.ts) |
| Destination: hotel / public shelter / not sure yet | List hotels in different directions / find your nearest shelter / choose a backup destination |
| Destination: family or friends, second property, raw land, hotel (with a distance) | The Evacuation section with fuel math, the route drive and go-bags |
| Personal filter | Pack it in the go-bag (links to EPA water guidance) |
| Each hazard rated moderate+ for the ZIP | Its own prep checklist and if/then steps |

## Adding a new question or answer
1. Add it to the schema and questionnaire. If it changes saved answers, bump `ANSWERS_VERSION` and migrate.
2. Make it change the plan (product tag, skill, or consideration).
3. Add a line to `VARIANTS` and, if it has several values, a field to `FIELDS` in `tests/pathways.test.ts`.
4. Add any "don't sell what they have" or "cover what they lack" rule to the pairwise test.

## Levels (à la carte)
Each gear "slot" has up to three levels. The budget sets the default, and people can switch any slot on the plan page. Each switch rebuilds the plan; quantities still come from the rules, and checklist ticks carry over.

| Slot | Essential | Standard | Premium |
|---|---|---|---|
| Water storage | Gallon jugs / refilled bottles | 7-gal jugs | Stackable water bricks |
| Generator (house) | Small inverter + cans + cord | Dual-fuel inverter + cans + cord | Whole-home standby, installed (replaces cans, cord, inlet) |
| Battery (apartment) | 300–700 Wh station | 1–2 kWh station | 3–4 kWh expandable station |
| Battery (house) | — | 1–2 kWh station | 3–4 kWh expandable station |
| Water filter | Squeeze filter | Gravity bag | Countertop gravity system |
| Two-way comms | FRS walkie-talkies | GMRS radios | Satellite messenger |
| Go-bag (fallback households) | Backpack you own + missing pieces | 30–40 L pack | Pre-packed premium 72-hour kit |
| Shelter (raw land) | Tarp kit | Family tent | Canvas bell/cabin tent |
| Vehicle kit (fallback + car) | Basic kit | Jump starter, inflator, strap | Recovery + rooftop cargo kit |
| Food | Bulk staples you store yourself | — | Freeze-dried 25-year food |

**Default level by budget:** under $500 → Essential; $500–5,000 → Standard; $5,000+ → Premium. When a level doesn't fit the remaining budget, the next level down is used. A person's own choice always wins, even over budget.

**Luxury track:** households with $5,000+ and raw land also see a small cabin or insulated shed (no Buy link).

**Tested by:** `tests/levels.test.ts` (each of the 10 households × every slot × every level, 138 rebuilds) and `npm run smoke`, which switches water to Premium on a live server for each household.
