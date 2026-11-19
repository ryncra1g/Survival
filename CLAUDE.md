# ReadyPlan (working name) — notes for Claude

Mobile-first Next.js 16 app: a household answers ~10 screens, gets an emergency plan + supply list,
optionally emails it, and can buy gear through tracked affiliate links. See README.md for architecture.

## Non-negotiable rules
- **Every quantity comes from `lib/rules/engine.ts` + `lib/rules/constants.ts`.** The LLM layer
  (`lib/llm/writer.ts`) only rewords section summaries and may reference numbers only via `{{tokens}}`.
  Never let model output set or change a number.
- **Safety guardrails** (`lib/safety/`): no generators/grills/stoves indoors or in garages, no dryer-outlet
  back-feeding, no medication dosing, no weapons/tactical content. Required safety text is inserted by code.
  Any change to plan text must keep `npm test` (incl. the 300-household fuzz) passing.
- **Amazon affiliate links never go in emails or PDFs** (`lib/affiliate.ts` `isAmazon`). Buy links go through `/go/<itemId>`.
- **Privacy:** ZIP only, no diagnoses, no free-text answers; answers/plans are encrypted (`lib/server/crypto.ts`);
  answers never go in URLs. Email is optional; marketing consent is a separate unticked box.
- **Every answer must change the plan, and the plan must never sell what someone already has.**
  `tests/pathways.test.ts` enforces it (58 single-answer changes + 68 pairwise households covering all
  1,844 answer pairs); see docs/PATHWAYS.md. A new question or answer needs a line there.
- **Gear levels (à la carte):** items in a `group` are a slot with `level` essential/standard/premium; the budget sets the
  default (`budget.defaultLevel`), `answers.gearChoices` overrides it, and `excludes` removes items a choice replaces.
  `tests/levels.test.ts` loops every slot × level for the 10 personas. New slots go in `GEAR_SLOTS` (lib/answers/schema.ts).
- **Consent before a plan (clickwrap):** the Terms box must be ticked, and health-adjacent answers (prescriptions,
  powered devices, mobility) need the separate health box. Rules live in `lib/legal.ts` (`checkConsent`), are enforced
  by `/api/questionnaire/[id]/generate`, and the record (`TERMS_VERSION` + timestamps) is saved on the plan. Bump
  `TERMS_VERSION` when the Terms change in substance. Health answers are never used for marketing emails.
- **The product name is undecided.** "ReadyPlan" is a working name only (another emergency-planning app uses it).
  Never hard-code a name: use `BRAND.name` / `BRAND.file` / `BRAND.slug` from `lib/brand.ts`; the real name is set
  with `NEXT_PUBLIC_BRAND_NAME` at build time. `/release-check` blocks a deploy while the working name is in use.
- **Not only families:** households can be one person. Copy says "you/your household", never assumes a family.
- Don't commit secrets, `.env*`, or `.data/`.

## Commands
- `npm run dev` — demo mode (no keys needed: file store in `.data/`, emails to `.data/outbox/`)
- `npm test` — unit + safety + persona tests (Vitest)
- `npx next build && npm run test:e2e` — browser tests (Playwright, iPhone viewport)
- `npm run smoke` — 10 households end to end against a running server on :3300 (see script header)
- `npm run sample` — regenerate `samples/`; `npm run demo` — rebuild the shareable demo page
- `npm run lint` — type-check

## Where things live
- Questionnaire screens: `components/Questionnaire.tsx` (`SCREENS`); answer schema: `lib/answers/schema.ts`
- Plan text/structure: `lib/plan/build.ts` → `PlanDocument` rendered by `components/PlanView.tsx`, `lib/pdf/`, `lib/email/render.ts`
- Gear catalog seed: `lib/catalog/seed.ts` (admin-editable at `/admin/catalog`)
- Data: `lib/server/store/` (file store for demo, Supabase for prod; SQL in `supabase/migrations/`)
- Business/launch plan: docs/LAUNCH_PLAN.md (links to the owner's Claude Docs plan)

## Project skills
- `/release-check` — everything that must pass before deploying
- `/add-gear` — add or update gear catalog items correctly
- `/change-rules` — change a quantity rule safely (constants + hand-computed tests)
