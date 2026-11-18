# ReadyPlan — notes for Claude

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
