# ReadyPlan

A mobile-first web app that builds a personalized emergency plan and supply list for a household. The visitor taps "Build my free plan" (no sign-up), answers about 11 tap-to-select screens and gets the plan on screen. Emailing the plan is optional, offered next to it. Recommended gear can carry tracked affiliate "Buy" buttons. The same plan is available as a PDF and is emailed to them once they confirm their address.

**Shareable demo:** `npm run demo` builds `demo/dist/readyplan-demo.html`, a single page that runs the real questionnaire, rules engine and plan view in the browser with no server. **Focus-group review:** [`docs/focus-group.md`](docs/focus-group.md).

- **Every quantity comes from a deterministic rules engine.** An optional LLM layer rewrites only the section summaries, and it can refer to numbers only through `{{tokens}}` that the engine fills in.
- **Safety guardrails are enforced in code.** The required safety text is inserted by code, a linter checks every string in the plan, and tests cover adversarial and randomized households.
- **Demo mode runs with no external services.** It uses a file-backed store, writes emails to disk and uses template wording.

See [`samples/`](samples/) for a generated plan (PDF, email, JSON) for the spec's test household.

---

## Quick start (demo mode, no accounts needed)

```bash
npm install
npm run dev            # http://localhost:3000
```

With no Supabase or Resend keys set, the app:

- stores data in `.data/db.json` (still AES-256-GCM encrypted),
- writes emails and PDF attachments to `.data/outbox/`, logs magic links to the console and shows them on screen,
- uses the template writer for plan wording.

To reach `/admin`, start with `ADMIN_EMAILS=you@example.com npm run dev`, sign up with that email and open the confirmation link.

```bash
npm test               # unit + safety tests (Vitest)
npm run test:e2e       # full phone flow in Chromium (Playwright; builds first: npx next build)
npm run sample         # regenerate samples/ for the test household
npm run lint           # TypeScript type-check
```

---

## Architecture

```
answers (Zod, enums only) ──► lib/rules/engine.ts ──► ComputedPlan (every number)
                                   ▲ constants (defaults + admin overrides, versioned)
                                   ▲ gear catalog (admin-editable)
                                         │
                         lib/plan/build.ts ──► PlanDraft: blocks (tables/checklists/if-then) + summary templates with {{tokens}}
                                         │
                         lib/llm/writer.ts (optional) ──► rewrites summaries only; checked for tokens, digits and safety
                                         │
                         lib/safety/linter.ts ──► whole document linted; falls back to templates; throws if templates fail
                                         │
                PlanDocument ──► web (components/PlanView) · PDF (lib/pdf) · email (lib/email/render)
```

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind 4 |
| Data | Supabase Postgres via the service-role key, used server-side only. Row-level security is on with no policies, so the public API can read nothing |
| Auth | Custom magic links (single-use random token, only its SHA-256 is stored) + HMAC-signed session cookie |
| Email | Resend, with HTML + plain text + PDF attachment, `List-Unsubscribe` one-click headers and a webhook for opens |
| PDF | `@react-pdf/renderer`, rendered server-side (serverless-friendly, no Chromium) |
| LLM | Anthropic SDK, `claude-opus-5-5`, structured output (`betaZodOutputFormat` + Zod), server-side refusal fallback, low effort, up to 3 attempts |
| Bot protection | Cloudflare Turnstile + honeypot field + Postgres rate limits |
| Jobs | Vercel Cron → `/api/cron/emails`, daily |

### Auth: magic links instead of Supabase Auth

Supabase Auth was the original suggestion. ReadyPlan uses its own magic links instead because the flow needs two session scopes:

- An **anon** session starts at "Build my free plan". It can only see what this browser created. Plans never linked to an email are purged after 30 days.
- A **draft** session starts when someone gives their email on the plan page. It lets someone fill in the questionnaire and see their plan right away. It can only see the questionnaires and plans it created, so typing someone else's email exposes nothing.
- A **full** session starts when the user clicks a confirm or login link. It can see all of that user's data, edit answers, export and delete.

The **confirm link is the double opt-in**. Plan emails (which carry an attachment) only go to confirmed addresses, so the form can't be used to send PDFs to strangers.

### Flow

1. `/`: one button, a plain form POST to `POST /api/start` (works without JavaScript). This creates an anonymous session and a questionnaire. A public sample plan at `/sample` shows what you get.
2. `/q/[id]`: 11 screens (the toddler screen only appears when a child is 3 or under), with a progress bar, a time-left hint and a Back button. Answers autosave to localStorage and to `PUT /api/questionnaire/[id]` after 700 ms. Answers travel only in request bodies, never in URLs.
3. On the last screen, a preview of their real numbers (gallons of water, pounds of food).
4. `POST /api/questionnaire/[id]/generate` validates the answers, applies rate limits, runs the engine and optional LLM, and saves the plan encrypted.
5. `/plan/[id]`: "Start here: your first 3 steps", the optional **"Email me my plan"** box (shown again at the end of the plan), then the full plan with a Phase 1 shopping list, a PDF download, a one-page fridge checklist and print.
   - Submitting an email (`POST /api/plans/[id]/claim`) links the plan to it. It has a typo check, Turnstile and a honeypot.
   - The optional, **unticked** "Also send me seasonal reminders…" box is the only marketing consent.
   - An address that's already confirmed gets the plan right away. Otherwise the double opt-in link is sent, with one "Your plan is waiting" reminder after a day.
6. Clicking the confirm link (`/api/auth/verify`) sets `double_opt_in_at`, upgrades to a full session and emails the latest plan (HTML + PDF).
7. `/account`: request a magic link, edit answers and regenerate, set follow-up preferences, export data (JSON), delete data.

---

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `APP_URL` | prod | Public base URL, used in email links |
| `APP_ENCRYPTION_KEY` | prod | Secret for AES-256-GCM encryption of answers and plans. **Losing or changing it makes stored data unreadable.** Generate with `openssl rand -base64 32` |
| `SESSION_SECRET` | prod | HMAC key for session cookies and unsubscribe links |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | prod | Database and storage. Leave both empty for demo mode |
| `RESEND_API_KEY` | prod | Sending email. Leave empty to write emails to `.data/outbox` |
| `RESEND_WEBHOOK_SECRET` | optional | `whsec_…` from Resend, for open, bounce and complaint tracking |
| `EMAIL_FROM` | prod | e.g. `ReadyPlan <plans@yourdomain.com>` on a verified domain |
| `MAILING_ADDRESS` | prod | **CAN-SPAM physical address**, shown in every email footer |
| `ANTHROPIC_API_KEY` | optional | Turns on the LLM wording layer |
| `ANTHROPIC_MODEL` | optional | Defaults to `claude-opus-5-5` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | prod | Bot protection on the email form |
| `ADMIN_EMAILS` | prod | Comma-separated emails allowed into `/admin` |
| `CRON_SECRET` | prod | Vercel Cron sends `Authorization: Bearer $CRON_SECRET` |

---

## Deployment (Vercel + Supabase + Resend)

1. **Supabase.** Create a project, then run the three files in [`supabase/migrations/`](supabase/migrations/) in order in the SQL editor (or `supabase db push`). The migration creates the tables, the `rate_limit_hit` function, RLS with no policies, and a private `plans` storage bucket.
2. **Seed the catalog.** Run `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed`.
3. **Resend.** Verify your sending domain (SPF/DKIM/DMARC), create an API key, and add a webhook to `https://YOUR_APP/api/webhooks/resend` for `email.opened`, `email.bounced` and `email.complained`.
4. **Turnstile.** Create a widget for your domain.
5. **Vercel.** Import the repo, set the env vars above and deploy. `vercel.json` schedules the daily follow-up cron.
6. **Check the deploy.** Sign up with an `ADMIN_EMAILS` address, confirm it and open `/admin`.

Before launch:

- Have counsel review `/privacy` (it's a template).
- Set `MAILING_ADDRESS`.
- Send test emails through a rendering service (Litmus or Email on Acid) to check real iOS Mail and Gmail. See **Testing status** below.

---

## Editing rules and the gear catalog

### Rule constants: no redeploy needed

All quantities come from [`lib/rules/constants.ts`](lib/rules/constants.ts):

- water per person and pet, the stored-days cap, bleach drops
- calories per adult and child age band, and the staple mix with calories and price per unit
- diapers, formula, toilet paper
- generator hours per day by heat type, fuel burn ranges, recommended stored fuel
- cash per adult
- budget planning amounts, phase shares and tier mapping
- the staleness window for catalog items

**To change them in production:** go to `/admin/rules` and paste only the keys you want to change, e.g. `{ "water": { "adultGalPerDay": 1.25 } }`. The overrides are deep-merged over the defaults, validated with Zod (shares must sum to 1, no negative numbers, …), and saved as a new version in `rule_constants`. New plans use them immediately, and each plan records the constants version it was built with. Saving `{}` reverts to the defaults.

**To change the defaults:** edit `constants.ts` and run `npm test`. The unit tests assert hand-computed values, so update them to match.

### Gear catalog

Edit the catalog at `/admin/catalog` (add, edit, delete, or "Mark reviewed" for one item). Each item has these fields:

| Field | What it does |
|---|---|
| `spec` | What to look for (shown first) |
| `models` | 1–3 example models |
| price range | Low and high price |
| `tier` | 1 = fits budgets under $500 … 4 = $5,000+ only |
| `phase` | 1 = life safety, 2 = power and food, 3 = comfort |
| `priority` | Order within a phase (lower is bought first) |
| `qty` | A number, or a rule name: `co_alarms`, `water_jugs`, `water_drums`, `people`, `adults`, `floors`, `gas_cans` |
| `tags` | When the item applies. All tags must be active; `!tag` means the tag must not be active. Tags are listed in `lib/catalog/types.ts` |
| `essential` | Always included, even over budget |
| `group` | Items in the same group are alternatives; the engine picks the best one that fits the budget |
| `requiresGroup` + `bundle` | e.g. gas cans are bought only together with a generator |
| `affiliateUrl` | Optional |
| `reviewedAt` | Date of the last review |

Items not reviewed within `catalog.staleAfterDays` (default 183 days) are **hidden from new plans** and flagged in red in the admin. If any recommended item has an `affiliateUrl`, an **affiliate disclosure** is added automatically to the plan page, the PDF and the email.

---

## Affiliate links

To turn them on, go to `/admin` and paste your **Amazon Associates tag** (e.g. `yourtag-20`). It's saved as a rule-constants version, so no redeploy is needed. Then:

- **Buy buttons:** every recommended item in new plans gets one, in the Phase 1 shopping list (under "This week") and in Recommended gear. Plan emails carry them too.
- **Destination:** an Amazon search for the item's first example model, carrying your tag. To link elsewhere, set an `affiliateUrl` on a catalog item; it always wins.
- **Tracking:** every Buy link goes through `/go/<itemId>`. That route counts the click (`email_events` type `affiliate_click`) and redirects only to catalog destinations, so it can't be used as an open redirect.
- **Dashboard:** shows Buy clicks, clicks per plan and the most-clicked gear.
- **Email rules:** Amazon's Associates agreement doesn't allow its links in email or PDFs. In plan emails, Amazon-bound items show a "Shop" link back to the plan's shopping list instead, and `/go` redirects any email click on an Amazon item to the plan page. Non-Amazon affiliate URLs (Impact, CJ, AvantLink, etc.) appear in emails normally.
- **Disclosure:** appears automatically on the page, in the PDF and in the email whenever any Buy button is shown. Links use `rel="sponsored nofollow"`.

Clear the tag to switch Buy buttons off for new plans.

## Safety guardrails

| Guardrail | Where it's enforced |
|---|---|
| No generators, grills, camp stoves or charcoal indoors or in garages; CO alarm guidance always present | `CO_RULE` (in `lib/safety/required.ts`) is inserted by code into Heat and Power. Apartments get `APARTMENT_GENERATOR_RULE`, and the engine never recommends generators, gas cans, propane heaters or camp stoves for apartments |
| No back-feeding through a dryer outlet; house circuits only through a licensed electrician's inlet/interlock or transfer switch | `TRANSFER_RULE`. The heat strategy for fuel furnaces is "generator → electrician-installed inlet + interlock" |
| No medication dosing | `MED_RULE` in First aid and Pets; the linter rejects mg/ml/tablet patterns and "take/give N" |
| No weapons or tactical content | The linter's word list; the Security section covers only low profile and a neighbor pod |
| LLM can't invent quantities | Summaries may contain only `{{tokens}}` (no digits, no spelled-out numbers); tables and checklists are never written by the LLM |
| Sources and disclaimer | Every plan has Ready.gov, FEMA, CDC, Red Cross, EPA and FoodSafety.gov, plus a visible disclaimer on screen, in the PDF and in the email |

The LLM system prompt (`lib/llm/writer.ts`) repeats these rules. Code does the enforcing:

1. The structured output is validated with Zod.
2. Each summary goes through the token/digit check and the safety linter.
3. Failed sections are retried (up to 3 attempts).
4. If a section still fails, its template text is used instead.
5. The whole document is linted again at the end. If the template version fails too, `generatePlan` throws, so an unsafe plan is never shown.

`tests/safety.test.ts` covers:

- adversarial households, e.g. "apartment, no outdoor space, owns a generator", "garage but no yard", pets on medication, an oxygen concentrator on a $500 budget, a well, injected free text
- 300 randomized households, which must lint clean and include the required safety text
- the linter against 13 unsafe and 7 safe phrasings
- a **malicious model stub** that returns unsafe advice and invented numbers, which must be fully contained

---

## Privacy and compliance

- **Data minimization.** ZIP code only (no street address), no diagnoses (just yes/no for prescriptions and device types), no ID numbers. The answer schema has **no free-text fields**, and unknown keys are stripped.
- **Encryption.** Answers and plans are AES-256-GCM encrypted at the application level, on top of Supabase's encryption at rest. PDFs live in a private bucket. Magic-link tokens are stored only as hashes.
- **No answers in URLs.** Plans are addressed by random UUIDs, and the e2e test asserts this.
- **CAN-SPAM.** Every email has the physical address and an unsubscribe link. One-click unsubscribe is supported (RFC 8058 `List-Unsubscribe-Post`) and is HMAC-signed. Follow-ups go only to confirmed, opted-in, subscribed users.
- **GDPR/CCPA.** Export (JSON of everything, decrypted) and delete-my-data (cascading delete, including stored PDFs) on `/account`.
- **Abuse protection.**
  - Rate limits: starting a plan 30 per IP per hour; email submissions 8 per IP per hour; mail 5 per user per hour; plan generation 8 per user per day and 20 per IP per hour; autosave 120 per IP per minute.
  - Turnstile and a honeypot field on the "Email me my plan" form.
  - An Origin check on every cookie-authenticated mutation.
  - No account enumeration on login.

## Follow-up emails (opt-in)

The daily cron sends at most one email per user per day:

- **Confirm reminder** (transactional, once): "Your plan is waiting", 1–6 days after signup, if the address was never confirmed but a plan was built. The plan page also has a "Didn't get it? Resend" button.
- **Day 1:** "3 things to do today".
- **Day 3:** "Did you finish your 'This week' list?"
- **Day 30:** Phase 2 reminder.
- **Winter check** in November, when the ZIP's winter rating is moderate or higher.
- **Hurricane season** in June, when the ZIP's hurricane rating is moderate or higher.

Seasonal emails are de-duplicated per year through `email_events`.

---

## Testing status (acceptance criteria)

| Criterion | Status |
|---|---|
| Plan quantities match the rules layer exactly | ✅ `tests/rules.test.ts`: water, calories and staples, diapers, toilet paper, fuel math, evacuation, budget, overrides. Expected values are worked out by hand |
| Safety guardrails pass adversarial answers | ✅ `tests/safety.test.ts` (see above) |
| Questionnaire to plan in under 5 minutes on a phone | ✅ The e2e test drives the whole flow on an iPhone 13 viewport and asserts < 5 min (the automated run takes seconds; generation with the LLM adds roughly 10–40 s) |
| Lighthouse 90+ for mobile performance and accessibility | ✅ Measured on a production build: `/`, `/start`, `/q/[id]`, `/plan/[id]` scored performance 96–100, accessibility 100, best practices 100 |
| PDF and email render correctly on iOS Mail and Gmail | ⚠️ Partly verified. The email uses table layout, inline styles plus one small `<style>` block for table cells, forces a light color scheme, and is 66 KB for the sample (a test keeps it under 100 KB so Gmail doesn't clip it). Checked in Chromium at iPhone width. **Not tested in real iOS Mail or the Gmail apps.** Run it through Litmus or Email on Acid before launch. The PDF uses built-in Helvetica (Unicode symbols are mapped to Latin-1 equivalents) and was checked page by page |

## Known limitations

- **The ZIP hazard table is approximate.** `lib/zip/data.ts` maps 3-digit ZIP prefixes to region-level ratings, hand-derived from FEMA's National Risk Index, NOAA and USGS data and IECC climate zones. For county-level accuracy, replace it with a table generated from the NRI county CSV plus a HUD ZIP→county crosswalk (same row format). Unknown prefixes fall back to national defaults, and the plan says so.
- **The PDF has no page numbers.** `@react-pdf/renderer` 4.9 crashed when rendering dynamic page numbers in a long document, so the footer is static text.
- **Prices and models in the seed catalog are approximate** as of 2026-11-01. They are meant to be reviewed in the admin.
- **The demo file store is single-process.** It is for local use only; production uses Supabase.

## File map

```
app/                     pages + API routes (api/start, questionnaire, plans/[id]/pdf, auth, account, admin, cron, webhooks)
components/              Questionnaire, PlanView, Checklist, SignupForm, AccountActions, Turnstile
lib/answers/schema.ts    questionnaire schema (Zod) + labels
lib/zip/                 ZIP3 → hazard profile
lib/rules/               constants.ts (all numbers) + engine.ts (pure, deterministic)
lib/catalog/             catalog schema, seed data, DB mapping
lib/plan/                document schema, builder (rules → blocks), generate pipeline
lib/llm/writer.ts        LLM summaries with token/safety validation
lib/safety/              required safety text + linter
lib/email/render.ts      email HTML/text templates
lib/pdf/PlanPdf.tsx      PDF renderer
lib/server/              env, crypto, sessions, store (file | supabase), mailer, auth, plans, rate limits
supabase/migrations/     SQL schema
tests/ e2e/ samples/ scripts/
```
