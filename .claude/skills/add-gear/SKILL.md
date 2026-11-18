---
name: add-gear
description: Add or update items in ReadyPlan's gear catalog (spec, example models, price range, tier, phase, tags, affiliate link) so the rules engine recommends them to the right households. Use when the owner gives product names, links or prices.
---

# Add or update gear

Two places hold the catalog:
- **Production:** the owner edits it at `/admin/catalog` (no deploy). For a few items, give them the exact field values to paste.
- **Seed / bulk:** `lib/catalog/seed.ts` (then `npm run seed` against Supabase). Use this for many items at once.

For each item decide, from the owner's info:
- `category`, `name`, `spec` (what to look for — spec first, brand second), 1–3 `models`
- `priceLow`/`priceHigh` (typical retail range, USD), `reviewedAt` = today
- `tier` 1–4 (smallest budget that should see it: 1 = under $500 … 4 = $5,000+)
- `phase` 1 (life safety) / 2 (power & food) / 3 (comfort, solar, comms) and `priority` within the phase
- `qty`: a number or one of `co_alarms`, `water_jugs`, `water_drums`, `people`, `adults`, `floors`, `gas_cans`
- `tags` (all must be active for the household; `!tag` = must not): see `CATALOG_TAGS` in `lib/catalog/types.ts`
- `group` for alternatives (engine picks the best that fits the budget), `requiresGroup`/`bundle` for accessories
- `affiliateUrl`: a direct product link if the owner has one (Amazon links are kept out of emails automatically)

Never add weapons, tactical gear, or anything that implies running fuel-burning equipment indoors.
After editing the seed: `npm test` (the safety fuzz lints every product name/spec), then regenerate `npm run sample` and check the item shows up for a household it should apply to.
