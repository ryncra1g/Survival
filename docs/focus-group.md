# Focus group review: 10 prepper personas + a conversion specialist

**Method.** This was a simulated review, not research with real people. I defined 10 household personas covering different regions, home types and experience levels (they're in `tests/fixtures/personas.ts`) and put each one through the real plan engine. Then I read each plan from that persona's point of view and wrote down what was missing or wrong. A separate pass looked at the funnel (front page → questions → email → plan → follow-up emails) the way a specialist in email capture and conversion would. Every engine fix has a regression test in `tests/personas.test.ts`.

## The panel

| Persona | Profile | Main feedback |
|---|---|---|
| Dana | Long Island suburban mom, first-timer, 2 weeks, $500–1,500 | "Tell me what to do *today*." The priority list was buried in section 2 |
| Walt | Vermont homesteader: well, wood stove, owns a generator, 90 days | Was told to use a propane heater even though he has a wood stove. Wasn't offered the safe furnace hookup for the generator he already owns |
| Priya | NYC apartment, single, 72 hours, under $500 | No phone power bank in the list, and her phone is her lifeline |
| Ray & June | Retired, SW Florida, oxygen concentrator, mobility limits | Nothing about special-needs shelter registration or leaving early |
| Marco | Austin, EV + solar battery, kids | Plan was fine. Wanted local hazard steps (Texas freeze, tornado, wildfire smoke) |
| Hank | Montana veteran prepper, standby generator, raw land | Was sold a well transfer switch his standby generator already covers. Asked for weapons and security content, which is deliberately declined (guardrail) |
| Sam & Lee | Seattle, newborn + toddler, high earthquake risk | **No earthquake guidance at all** (water-heater straps, gas shutoff, drop-cover-hold) |
| Tasha | New Orleans, flood + hurricane, diesel truck | No flood guidance (turn around at water on roads, flood insurance has a 30-day wait) |
| The Olsons | Northern Minnesota farm, propane heat, elderly parent, owns a generator | Same generator-owner gap as Walt; nothing about elderly needs |
| Gil & Rosa | Phoenix, extreme heat, 2 cats | Didn't know a portable generator can't run central AC; no wildfire smoke steps |

**Conversion specialist:**
1. Asking for an email *before* any value is the biggest drop-off point. Ask at the end, next to a preview of their own numbers ("Your plan is ready. Where should we send it?").
2. The front page has too many choices. Use one CTA and one promise.
3. The plan should open with 3 doable steps.
4. Email subjects should be specific, and the confirmation email should promise the reward ("Send me my plan"), not a chore ("Confirm your email").

## Changes made

**Plan engine** (all quantities still come from the rules layer):
- New section, **"Your area's hazards"**: for each hazard rated moderate or higher (hurricane, flood, earthquake, wildfire and smoke, tornado, extreme heat), a short prep checklist plus if/then steps.
- **Older adults and mobility:** a "This week" task to register with the county's special-needs (access & functional needs) program, an earlier evacuation trigger, and a mobility and access kit.
- **Generator owners** now get the electrician-installed inlet/interlock, fuel cans and cord without being sold a second generator.
- **Standby-generator homes** are no longer sold a well transfer switch. **Wood-stove homes** no longer get the propane-heater strategy.
- **New catalog items:**
  - USB power bank (everyone)
  - Earthquake strap kit + gas shutoff wrench
  - Bedside kit (shoes, flashlight, gloves)
  - N95 masks + HEPA purifier (wildfire areas)
  - Flood kit
  - Mobility & access kit
- **Extreme heat:** notes that water needs can double, and that a portable generator can't run central AC.

**Funnel and email capture:**
- **New front page:** one headline, one button ("Build my free plan"), "Free · No account · Takes about 5 minutes", and 3 benefits.
- **No email to start.** The email is asked for at the end, on a screen that previews their numbers (gallons of water, pounds of food). Consent wording, the privacy link, Turnstile and the honeypot are unchanged. The plan only appears after the email is given, and the plan email is still only sent after double opt-in.
- **"Start here: your first 3 steps"** card at the top of every plan.
- **Specific subject lines:** "Your 90-day emergency plan for Long Island is ready". The confirmation email now leads with "Send me my plan".
- **Privacy:** questionnaires never linked to an email are deleted after 30 days by the daily job.

## Recommended next (not built yet)

- **Referral loop:** a "Send this to a family member" button on the plan page (one of the strongest list-growth levers for a family product).
- **Day 1 email:** "Your 3 steps for today" between the plan email and the Day 3 check-in.
- **Experiment:** A/B test the front-page headline and button wording ("Build my free plan" vs "Get my emergency checklist"). The admin dashboard would need a variant column.
- **Printable fridge checklist:** a one-page PDF of the "This week" list, as a reason to come back to the email.
- **Declined on purpose:** weapons and tactical content (Hank's request). This is a hard guardrail from the original spec.
