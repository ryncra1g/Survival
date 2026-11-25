# Store audit: TypeScript types and file store vs Supabase (November 25, 2026)

Scope:
- every table in `supabase/migrations/0001`–`0008`;
- every mapping in `lib/server/store/supabase.ts` and `lib/catalog/db.ts`;
- compared against `lib/server/store/types.ts`, `lib/catalog/types.ts`, `lib/accountData.ts`, `lib/legal.ts` and the file
  store (`lib/server/store/file.ts`).

A problem is a field the app has that Supabase drops, renames without mapping, or returns in a different type or
shape than the file store. Problems that change behaviour also count: a different order, boundary or default.

## Summary

- **3 fields dropped**, in 2 tables:
  - `gear_catalog.level` and `gear_catalog.excludes` (CAT-01, launch blocker);
  - a plan's `inventory` given at creation (`plans`).
- **18 mistyped or drifting**, in 7 tables:
  - 12 timestamps returned in Postgres format instead of ISO;
  - catalog row shape;
  - catalog order;
  - plan `checks` default;
  - email event order;
  - the stale-questionnaire boundary;
  - consumed-token aliasing.
- **0 renamed without a mapping.** The renames that exist are all mapped: `group` ↔ `item_group`,
  `requiresGroup` ↔ `requires_group`, `affiliateUrl` ↔ `affiliate_url`, camelCase ↔ snake_case prices and dates, and
  the sealed `*_json` columns.
- **Schema fixes:** all in `0009_catalog_fields.sql`. No `0010` was needed: every other fix is in the mapping code.
- **Coverage:** every row below is covered by the shared store contract (`tests/helpers/storeContract.ts`). It runs
  against the file store in `npm test` and against Postgres in the `store-postgres` CI job.

## Problems found and fixed

| # | Table | Field (app / file store) | Supabase before | Problem | Fix |
|---|---|---|---|---|---|
| 1 | gear_catalog | `level` | no column | **Dropped.** Every gear slot loaded without Essential / Standard / Premium, so budget defaults, à la carte switching and Compare broke in production | 0009 adds `level` (checked values) and backfills the seed's levels; `catIn` / `catOut` map it |
| 2 | gear_catalog | `excludes` | no column | **Dropped.** A standby generator no longer removed gas cans, the cord, propane and the inlet | 0009 adds `excludes text[] default '{}'` plus backfill; mapped |
| 3 | gear_catalog | optional keys (`group`, `requiresGroup`, `bundle`, `level`, `excludes`) | `catOut` set them to `undefined` (and `bundle: false` → `undefined`) | Mistyped shape: items didn't deep-equal the seed | `catOut` leaves out empty optional keys; `catOut(catIn(x))` is exactly `x` |
| 4 | gear_catalog | list order | `order by phase, priority`; ties in no set order | **Drift that changes plans.** The engine keeps catalog order for ties (many seed items tie), so production plans could differ from demo and tests | Both stores return one canonical order: seed order, then admin-added items by id (`lib/catalog/order.ts`) |
| 5 | plans | `inventory` passed to `createPlan` | spread into the insert as `inventory` | **Dropped / error.** Supabase rejected the insert (no such column); the file store kept it unencrypted, then reported `null` | Both stores seal it into `inventory_json` on create |
| 6 | plans | `checks` default | column default `{}` | Drift: the file store returned `undefined` for a plan never ticked | Both return `{}` |
| 7 | plans | `created_at`, `emailed_at` | `timestamptz` as `…+00:00` with microseconds | Mistyped: not the app's ISO format (`…Z`) | Supabase store returns ISO for every timestamp |
| 8 | questionnaires | `created_at`, `updated_at` | as 7 | Mistyped | ISO |
| 9 | questionnaires | stale-anonymous purge boundary | `updated_at < cutoff` | Drift: the file store used `<=` | File store uses `<` |
| 10 | users | `consent_at`, `double_opt_in_at`, `unsubscribed_at`, `created_at` | as 7 | Mistyped | ISO |
| 11 | auth_tokens | `expires_at`, `used_at` | as 7 | Mistyped | ISO |
| 12 | auth_tokens | `consumeToken` result | a new row | Drift: the file store returned its live stored object | File store returns a copy |
| 13 | email_events | `sent_at` | as 7 | Mistyped | ISO |
| 14 | email_events | `listEmailEvents` order | unspecified | Drift: the file store used insertion order | Both order by `sent_at` |
| 15 | rule_constants | `created_at` | as 7 | Mistyped | ISO |

Rows 7, 8, 10, 11, 13 and 15 add up to the 12 timestamp fields.

## Checked and fine

| Table | Fields |
|---|---|
| users | `id`, `email` (lower-cased in both), `followups_opt_in`; `places_json` (sealed, 0007), `reminder_prefs` (0008) through `getPlaces` / `getReminderPrefs` |
| questionnaires | `id`, `user_id`, `session_nonce`, `answers` (sealed `answers_json`), `complete`, `version` |
| plans | `id`, `questionnaire_id`, `user_id`, `computed_quantities` / `plan` (sealed), `pdf_url`, `writer`, `checks` (0004), `consent` (sealed `consent_json`, 0005: `termsVersion`, `termsAcceptedAt`, `healthDataConsentAt`), `inventory` updates (sealed `inventory_json`, 0006) |
| auth_tokens | `token_hash`, `user_id`, `purpose` (checked), single use and expiry in `consumeToken` |
| gear_catalog | `id`, `category`, `name`, `spec`, `models`, `priceLow` / `priceHigh` (numeric → number), `tier`, `phase`, `priority`, `qty` (text; whole numbers come back as numbers), `tags`, `essential`, `group`, `requiresGroup`, `bundle`, `affiliateUrl`, `notes`, `active`, `reviewedAt` (date ↔ `YYYY-MM-DD`) |
| rule_constants | `version` (serial), `overrides` (jsonb), `created_by` |
| email_events | `id`, `user_id`, `type`, `provider_id` |
| rate_limits | `rate_limit_hit()` has the same fixed-window rule as the file store |
| (derived) | `stats()` counts the same rows in both stores |

## Not changed

- **Re-seeding:** `npm run seed` upserts the seed; it doesn't delete catalog items an admin added. An empty table seeded
  this way holds exactly the seed catalog (tested). Rows added in the admin are kept on re-seed, on purpose.
- **Not applied anywhere:** 0009 is a file. The owner applies migrations in order: README, "Deploy checklist".
