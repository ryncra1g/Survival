# Security review

**Method:** /security-review, run on branch `claude/review-fixes` (off `claude/accounts-d`, PR #10). One reviewer read the code (read-only) and traced every user input to the sensitive operations. I then checked each finding against the code myself before fixing it.

**Scope:** every route in [02_SECURITY.md](02_SECURITY.md), plus everything they rely on for authentication and validation:
- `lib/server/access.ts`, `http.ts`, `session.ts`, `auth.ts`, `ratelimit.ts` and `crypto.ts`;
- the account-data zod schemas;
- the `.ics` and email renderers;
- both store implementations;
- migrations 0004–0008.

`app/api/plans/[id]/claim` ("Email me my plan") is not in 02_SECURITY.md, because #7–#10 didn't change it. The review covered it anyway, because every plan route depends on what it does to `plan.user_id`.

## Summary

| Severity | Count | Status |
| --- | --- | --- |
| High | 0 | none found |
| Medium | 2 | **fixed in this PR** |
| Low | 6 | logged in `docs/BUILD_LOG.md` Assumptions ([R9]), not fixed |

The review found no injection (SQL, header/CRLF in `.ics` or Content-Disposition), no way to forge or escalate a session, no CSRF gap on any state-changing route, no XSS in the emails, and no direct cross-user read. Both medium findings come from the same gap: "Email me my plan" never proved that the person asking owns the email address they typed.

## How access works (verified)

- **Session cookie:** base64url JSON signed with HMAC-SHA256 and compared in constant time. It is httpOnly, SameSite=Lax, and Secure in production.
- **Full sessions:** only `/api/auth/verify` creates one, after a single-use magic-link token. The server stores only the token's SHA-256.
- **Plan access (`loadPlanFor`, `canAccessQuestionnaire`):** a full session for the plan's owner, or the session nonce of the browser that built it. Anonymous sessions can't match a plan that has no owner.
- **`sameOrigin`:** required on every state-changing route in scope. A missing Origin header is accepted only for GET, and `Origin: null` is rejected.

## Medium 1: anyone could attach a plan to someone else's account, forge their marketing consent and reverse their unsubscribe (fixed)

- **File:** `app/api/plans/[id]/claim/route.ts`
- **Category:** authorization, consent integrity
- **Confidence:** 8/10

**What was wrong.** With no proof of ownership, POST `{email: "victim@…", updates: true}` did all of the following when the address already had an account:
- It set `followups_opt_in: true` and cleared `unsubscribed_at` for that account, so the daily cron would send marketing to someone who had unsubscribed.
- It moved the attacker's plan into the victim's account. If the victim was confirmed, it also emailed them the plan straight away.
- It switched the attacker's browser to a draft session holding the victim's uid. From there the attacker could start new questionnaires under the victim's account, and each plan built from one was emailed to the victim.
- It made the planted plan the victim's "latest" plan, which drives `/account`, reminders and the verify redirect. The attacker's browser could still read and write that plan (see Medium 2).

**Fix.**
- When the address already has an account and this browser isn't signed in as that account, the route now changes nothing: no plan move, no consent change, no session change.
- Instead it emails the address a link whose `next` carries a claim signed for that user, that plan and the "send me updates" tick: `lib/server/claim.ts`, an HMAC over `claim:<userId>:<planId>:<updates>`. A confirmed account gets the 1-hour sign-in email; an unconfirmed one gets the 7-day confirm email.
- `/api/auth/verify` attaches the plan, and applies the updates tick, only after the owner of the address uses that link. It won't take a plan that already belongs to another confirmed account; in that case it sends the user to `/account`.
- The reply is "check your inbox" (`status: "confirm"`) for new and existing addresses alike, so it no longer reveals which addresses are confirmed.
- A browser already signed in as the account keeps the instant "sent" path.

**Tests** (`tests/authz.test.ts`, "security review M1/M2"):
- An anonymous browser claiming for B's address gets "confirm".
- The plan is not attached, B's `followups_opt_in` and `unsubscribed_at` are unchanged, and the session cookie is unchanged.
- A link signed for a different user is ignored.
- B's real link attaches the plan.

## Medium 2: the browser that built a plan kept reading and writing it after it moved into someone else's account (fixed)

- **File:** `lib/server/access.ts` (`loadPlanFor`, `canAccessQuestionnaire`)
- **Category:** IDOR, cross-user data exposure
- **Confidence:** 7/10, raised to confirmed in combination with Medium 1

**What was wrong.** The nonce rule matched the questionnaire's creator no matter who `plan.user_id` was. Two ways this went wrong:
- **Planted plan (via Medium 1):** the attacker could read the victim's inventory, which shows what the household has and when it expires, and could change it.
- **Shared computer:** the next person at the computer kept access to the plan for 30 days after the owner confirmed on another device.

**Fix.** Nonce (same-browser) access now applies only while the plan or questionnaire has no owner, or its owner hasn't confirmed their email. Once the owner has confirmed, only that account's full sessions can open it.

**Test:** in the same test, after B confirms, the browser that built the plan gets 404 on checks and Copy for AI, and B gets 200.

**UX cost (logged as an assumption):**
- Someone who builds a plan on a laptop and then confirms on their phone has to use a sign-in link to reopen it on the laptop.
- The copy "Saved on this device for 30 days. Confirm your email to keep it and use it on any device." is still true before confirming.

## Low: logged in BUILD_LOG Assumptions [R9]

**Update (follow-up branch `claude/review-lows`):** 1, 3, 5 and 6 are fixed and tested. 2 and 4 are accepted for launch; BUILD_LOG [R9] gives the reason for each.

1. **Cron secret comparison** (`app/api/cron/emails/route.ts:20`): the cron secret is compared with `!==` rather than a constant-time compare. Use `hmacEqual`/`timingSafeEqual`.
2. **Leftover stored PDFs** (`lib/server/store/supabase.ts` `deleteUserCascade`): it removes the stored PDFs of the plans the user owns now. A PDF saved under `<userId>/` for a plan that was later moved to another account would stay. Delete by the storage prefix `<userId>/` instead.
3. **Email escaping** (`lib/email/render.ts` `esc`): it doesn't escape `'`. This is safe today, because every attribute is double-quoted and every value is built by code. Add `&#39;`.
4. **Forwarded host** (`lib/server/http.ts` `sameOrigin`): it trusts `x-forwarded-host`. That's fine behind Vercel. On a self-hosted proxy, compare only against `APP_URL`.
5. **Session shape** (`lib/server/session.ts` `decodeSession`): it doesn't check the shape of the signed JSON. The HMAC keeps it safe, but a zod check would reject old cookie formats cleanly.
6. **Plan-id check** (`lib/server/access.ts`): the plan-id check is a loose UUID regex. It's harmless, because the stores use parameterised lookups.

## Routes checked and found clean

| Route | Why |
| --- | --- |
| `GET /api/account/export` | Full session required; returns only the requester's data; `no-store`; the filename comes from `BRAND.slug`. |
| `GET/PUT /api/account/places` | Flag, full session, `sameOrigin` on PUT, bounded `PlacesSchema`; stored encrypted and keyed by the server-side user id. |
| `GET/PUT /api/account/reminders` | Same pattern; `ReminderPrefsSchema` keys `[a-z0-9-]{1,40}`, at most 30. |
| `GET /api/auth/me` | Returns two booleans only. |
| `GET /api/cron/emails` | Bearer secret (see Low 1); reminders go to confirmed, opted-in, not-unsubscribed users only; text is escaped. |
| `POST /api/plans/[id]/ai-copy` | `sameOrigin`, `loadPlanFor`, rate-limited (review item 3); records only the plan id. |
| `GET /api/plans/[id]/calendar` | `loadPlanFor`; `icsEscape` turns newlines into `\n`, so there's no CRLF injection; the UID and filename come from the server. |
| `PUT /api/plans/[id]/checks` | `sameOrigin`, `loadPlanFor`; zod keys `[a-z0-9-]{1,40}`, at most 300, booleans only. |
| `POST /api/plans/[id]/choose` | `sameOrigin`; group allow-listed against `GEAR_SLOTS`; level validated by zod; `back` stripped to `[a-z0-9-]`; rebuilds only under consent that is still valid. |
| `POST /api/plans/[id]/edit` | `sameOrigin`; screen allow-listed; consent ticks cleared; the new questionnaire is tied to the caller's nonce. |
| `GET/PUT /api/plans/[id]/inventory` | Flag, `sameOrigin` on PUT, `loadPlanFor`, bounded `InventorySchema`, encrypted. |
| `GET /api/plans/[id]/pdf` | `loadPlanFor`; `private, no-store`. |
| `POST /api/questionnaire/[id]/generate` | `sameOrigin`, strict UUID check, `canAccessQuestionnaire`, `AnswersSchema`, `checkConsent` enforced on the server. |
| Stores and migrations | Only query-builder `.eq/.is/.lt/.gt` and a parameterised `rpc`, so no SQL injection. Migrations 0004–0008 add columns only, and RLS stays on from 0001. |
| `lib/server/crypto.ts` | AES-256-GCM with a random 12-byte IV and the auth tag checked; HMACs are keyed by the session secret. |

## Follow-up from /code-review

The code review of this branch flagged three gaps in the first version of the fix, all now fixed:
- the marketing tick was dropped for existing accounts;
- confirmed accounts got a 7-day confirm-style link;
- a refused claim redirected to a plan the user couldn't open.

It also tightened the linter:
- an after-negation now has to be about placement;
- hedged words like "less dangerous" no longer excuse a clause.
