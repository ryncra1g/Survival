---
name: change-rules
description: Change a ReadyPlan quantity rule (water, calories, diapers, fuel, budget split, etc.) safely — constants, hand-computed tests, safety suite, sample regeneration. Use when the owner wants different amounts or assumptions.
---

# Change a quantity rule

1. Find the constant in `lib/rules/constants.ts` (and its Zod schema below it). Prefer changing a constant over changing engine code.
2. Decide whether the change is a **default** (edit the file) or a **production tweak** (the owner can paste an override at `/admin/rules`, e.g. `{ "water": { "adultGalPerDay": 1.25 } }` — no deploy). Tell the owner which.
3. If editing defaults: recompute the affected expectations in `tests/rules.test.ts` **by hand** from the new constant (write the arithmetic in a comment), never by copying the engine's new output.
4. `npm test` — rules, safety fuzz and persona tests must pass.
5. `npm run sample` and summarise how the sample family's numbers changed (water, food, fuel, budget).
6. If the new rule needs new plan wording, add it in `lib/plan/build.ts`, keep numbers in tokens/blocks (not LLM text), and keep the required safety text intact.
