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

## Update: email-first restored

At the owner's request, the email is asked for **first** again, on the front page. To keep the drop-off low, the form is the first thing on the screen on phones, and it carries one promise and one button ("Build my free plan"). It also works without JavaScript. The preview of the household's numbers moved to the last question screen.

Polish added after the review:
- A one-page **fridge checklist** PDF (this week's steps, the storm/outage checklist, if/then decisions, blank contact lines, CO rule). It's on the plan page and attached to the plan email.
- The plan email now opens with "Start here: your first 3 steps".
- A **Day 1** "3 things to do today" email (opt-in, like the other follow-ups).
- "About N min left" on each question screen.

---

# Round 2: email-first review

**Method.** The same 10 simulated personas and the conversion specialist reviewed only the entry experience. That covered the front page with the email box first, the confirmation email, what returning visitors see, and what happens when someone never confirms.

## What the panel said

| Persona | Reaction to "email first" | Changed? |
|---|---|---|
| Hank (Montana veteran) and Walt (Vermont homesteader) | Privacy-minded: "Why do you need my email before I see anything?" Would leave without proof of value | ✅ "See a sample plan first" link under the button, going to a public sample plan; "Only used for ReadyPlan, never sold" right under the email field |
| Dana (Long Island mom) | Fine with it; typed `gmial.com` on her phone | ✅ "Did you mean …gmail.com?" with one-tap fix |
| Priya (NYC renter) | Wants the plan but not the updates; the required box bundles both | ⚠️ Not changed: it's your spec wording. See the compliance note below |
| Ray & June (Florida retirees) | Never saw the confirmation email (it went to spam) and didn't know what to do | ✅ "Didn't get it? Resend" plus the address it went to on the plan page; one reminder email after a day |
| The Olsons | Came back with the same email months later and wondered where the old plan went | ✅ "Welcome back. We've emailed you a sign-in link to see your earlier plans" |
| Sam & Lee, Tasha, Marco, Gil & Rosa | Email-first acceptable because the promise is concrete (plan + PDF + checklist) and it's fast | No change |

**Conversion specialist:**
1. Email-first costs signups unless the page earns trust before the ask. The two strongest levers are proof (a real sample plan) and reassurance next to the field, not below the button. Both were added.
2. Typo correction cuts bounced and undeliverable plans. Mistyped domains are usually 1–3% of mobile signups.
3. A single confirm reminder typically recovers a meaningful share of unconfirmed signups. More than one starts to hurt sender reputation.
4. Mobile keyboard details matter: no auto-capitalize, no spellcheck, a "Go" key and a placeholder. All added.

## Changes made
- **Public sample plan** at `/sample` (the Long Island family), linked as "See a sample plan first" under the button. The demo has the same link.
- **Typo check** for common email domains (`lib/email/typos.ts`, tested). It suggests once; pressing the button again keeps what was typed.
- **Trust line moved** to sit right under the email field.
- **Mobile keyboard:** no auto-capitalize, no spellcheck, "Go" key, placeholder.
- **Returning emails:** a "welcome back" note, plus the sign-in link email.
- **Plan page, unconfirmed:** shows the address the email went to and a "Didn't get it? Resend" button (max 3 per hour).
- **One "Your plan is waiting" reminder** 1–6 days after signup, for unconfirmed people who built a plan. It never repeats and is skipped for anyone who unsubscribed.

## Compliance note (decision for you)
The required checkbox, "Send me my plan **and occasional preparedness updates**", bundles marketing consent with getting the plan. That's fine for US-only CAN-SPAM, but under **GDPR (EU/UK) it isn't valid consent** for the updates, because it isn't freely given. If you'll have EU or UK users, split it into:
- a required "Send me my plan" (or make submitting the form imply it), and
- an optional, unticked "Also send me occasional preparedness updates".

It's a 15-minute change. I left your wording as is until you decide.

---

# Round 3: optional email + affiliate links (owner's decision)

An associate pointed out that email-first adds a step before any value, and that clicks on affiliate links may be worth more than emails. The owner chose:

- **Email optional, offered after the plan.** "Build my free plan" needs no sign-up. "Email me my plan" sits right after the first 3 steps and again at the end of the plan. The value exchange is the PDF and fridge checklist in your inbox plus a link to come back and update the plan.
- **Consent fixed for GDPR.** Getting the plan by email is the main action. Seasonal reminders and updates are a separate, **unticked** checkbox. This settles the round-2 compliance note.
- **Affiliate Buy buttons** in a "Phase 1 shopping list" right under "This week" (where people decide what to buy) and in Recommended gear, with click tracking and dashboard stats (email capture rate, Buy clicks per plan, most-clicked gear).

What to watch on the dashboard: **email capture rate** (plans with an email ÷ plans) and **Buy clicks per plan**. Seasonal and Phase 2 emails bring people back to the Buy buttons, so both numbers matter.
