# Security

Scope: every API route added or changed in PRs #7–#10 (`git diff claude/headline-copy...claude/accounts-d -- app/api`).

## Helpers referenced in the table

- **loadPlanFor(session, id)** (`lib/server/access.ts`): the plan opens only for the browser that built it (session nonce on the questionnaire) or for its signed-in owner with a full session. Returns null otherwise, and the route answers 404.
- **requireSession("full")** (`lib/server/http.ts`): a confirmed, signed-in user (magic link), else null and the route answers 401.
- **sameOrigin(req)** (`lib/server/http.ts`): Origin/Referer must match the app URL (CSRF guard on every write).
- **flags().accounts** (`lib/flags.ts`): `ACCOUNTS_ENABLED === "true"`; off by default. A gated route answers 404 when it is off.
- **Cron**: `Authorization: Bearer $CRON_SECRET`.

`lib/server/http.ts:1-43`

````ts
import "server-only";
import { NextResponse } from "next/server";
import { env } from "./env";
import { getSession, isAdmin, type Session } from "./session";
import { store, type UserRow } from "./store";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const err = (message: string, status = 400) => json({ error: message }, status);

/** CSRF defence for cookie-authenticated mutations: Origin must match the app. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET";
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return o.host === host || o.origin === new URL(env.appUrl).origin;
  } catch {
    return false;
  }
}

export async function requireSession(scope?: "full"): Promise<{ session: Session; user: UserRow } | null> {
  const session = await getSession();
  if (!session || (scope === "full" && session.scope !== "full")) return null;
  const user = await store.getUser(session.uid);
  return user ? { session, user } : null;
}

export async function requireAdmin(): Promise<UserRow | null> {
  const s = await requireSession("full");
  return s && isAdmin(s.user.email) ? s.user : null;
}

export async function readJson<T = unknown>(req: Request, maxBytes = 50_000): Promise<T | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
````

## Route table

| Status | Path | Methods | Auth check | Origin check | Input validation | Data returned | Flag gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| changed | `/api/account/export` | GET | requireSession("full") | n/a (GET, no change) | none (no input) | JSON download: user row, questionnaires, plans (incl. decrypted inventory), email events, places, reminderPrefs | none (places/prefs are empty with the flag off) |
| added | `/api/account/places` | GET, PUT | requireSession("full") | PUT: sameOrigin | PUT: `PlacesSchema` (lib/accountData.ts), body ≤ 20 KB | GET: `{places}` for the signed-in user; PUT: `{ok}` | ACCOUNTS_ENABLED (404 when off) |
| added | `/api/account/reminders` | GET, PUT | requireSession("full") | PUT: sameOrigin | PUT: `ReminderPrefsSchema` (lib/accountData.ts), body ≤ 20 KB | GET: `{prefs}`; PUT: `{ok}` | ACCOUNTS_ENABLED (404 when off) |
| added | `/api/auth/me` | GET | getSession() (no requirement) | n/a (GET) | none | `{signedIn: boolean, accounts: boolean}` only, no personal data | none (reports the flag) |
| changed | `/api/cron/emails` | GET | Bearer CRON_SECRET | n/a (server to server) | none | `{ok, sent: counts, purgedAnonymous}` | reminder part only with ACCOUNTS_ENABLED |
| added | `/api/plans/[id]/ai-copy` | POST | loadPlanFor | sameOrigin | none (no body read) | `{ok}`; records event type `ai_copy` with the plan id | none |
| added | `/api/plans/[id]/calendar` | GET | loadPlanFor | n/a (GET, no change) | none | text/calendar: maintenance events only, no links, no personal data | none |
| changed | `/api/plans/[id]/checks` | PUT | loadPlanFor | sameOrigin | inline zod `Body` (ids `^[a-z0-9-]{1,40}$`, ≤ 300 keys), body ≤ 20 KB | `{ok}` | none |
| changed | `/api/plans/[id]/choose` | POST (form) | loadPlanFor + session | sameOrigin | `GEAR_SLOTS` membership, `GearLevel` (or "mix" for food), `AnswersSchema` on the stored answers; rate limits per nonce and IP | 303 redirect to the rebuilt plan | none |
| changed | `/api/plans/[id]/edit` | POST (form) | loadPlanFor + session | sameOrigin | screen name from a fixed list; answers re-validated on generate | 303 redirect to the questionnaire screen | none |
| added | `/api/plans/[id]/inventory` | GET, PUT | loadPlanFor | PUT: sameOrigin | PUT: `InventorySchema` (lib/accountData.ts), body ≤ 60 KB | GET: `{inventory}` for that plan; PUT: `{ok}` | ACCOUNTS_ENABLED (404 when off) |
| changed | `/api/plans/[id]/pdf` | GET | loadPlanFor | n/a (GET) | none | application/pdf (tips page only with DIY_TIPS_ENABLED) | DIY_TIPS_ENABLED affects content only |
| changed | `/api/questionnaire/[id]/generate` | POST | canAccessQuestionnaire(session, q) | sameOrigin | `AnswersSchema` after `migrateAnswers`, `checkConsent`, Turnstile, honeypot, rate limits | `{planId}` JSON, or NDJSON `{stage}` lines then `{planId}`/`{error}` with `Accept: application/x-ndjson` | none |

The table was written by hand from the sources below, which are the authority.

## Full sources

### `lib/flags.ts`

````ts
/**
 * Feature flags (owner brief D1, D3b). Read on the server from env; a flag is on only for the exact
 * value "true". Defaults are OFF and must stay off: the owner turns them on.
 *
 * - ACCOUNTS_ENABLED: the accounts track (My plans, inventory, My places, reminders, dashboard tabs).
 * - DIY_TIPS_ENABLED: "No time to buy? Use what you have" boxes, off until the owner approves docs/FACTCHECK.md.
 *
 * Client components never read env themselves: server components pass `flags()` down as a prop.
 */
export type Flags = { accounts: boolean; diyTips: boolean };

export const FLAG_ENV = { accounts: "ACCOUNTS_ENABLED", diyTips: "DIY_TIPS_ENABLED" } as const;

export function flagOn(value: string | undefined): boolean {
  return value === "true";
}

export function flags(env: Record<string, string | undefined> = process.env): Flags {
  return { accounts: flagOn(env[FLAG_ENV.accounts]), diyTips: flagOn(env[FLAG_ENV.diyTips]) };
}

export const NO_FLAGS: Flags = { accounts: false, diyTips: false };
````

### `lib/server/access.ts`

````ts
import "server-only";
import type { Session } from "./session";
import { store, type PlanRow, type QuestionnaireRow } from "./store";

/** Authorization: full sessions see all their data; draft sessions only what they created. */
export async function canAccessQuestionnaire(s: Session | null, q: QuestionnaireRow | null): Promise<boolean> {
  if (!s || !q) return false;
  if (q.session_nonce === s.nonce) return true; // the browser session that created it
  return s.scope === "full" && !!q.user_id && q.user_id === s.uid;
}

export async function loadPlanFor(s: Session | null, planId: string): Promise<PlanRow | null> {
  if (!s || !/^[0-9a-f-]{36}$/i.test(planId)) return null;
  const p = await store.getPlan(planId);
  if (!p) return null;
  if (s.scope === "full" && p.user_id && p.user_id === s.uid) return p;
  const q = await store.getQuestionnaire(p.questionnaire_id);
  return q && q.session_nonce === s.nonce ? p : null; // the browser that built it
}
````

### `app/api/account/export/route.ts`

````ts
import { requireSession } from "@/lib/server/http";
import { store } from "@/lib/server/store";
import { BRAND } from "@/lib/brand";

/** GDPR/CCPA data export: everything we hold about the user, decrypted, as JSON. */
export async function GET() {
  const auth = await requireSession("full");
  if (!auth) return new Response("Sign in first", { status: 401 });
  const [questionnaires, plans, emailEvents, places, reminderPrefs] = await Promise.all([
    store.listQuestionnaires(auth.user.id),
    store.listPlans(auth.user.id),
    store.listEmailEvents(auth.user.id),
    store.getPlaces(auth.user.id),
    store.getReminderPrefs(auth.user.id),
  ]);
  // Everything: plans include their inventory (decrypted), plus My places and reminder preferences.
  const data = { exportedAt: new Date().toISOString(), user: auth.user, questionnaires, plans, emailEvents, places, reminderPrefs };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${BRAND.slug}-my-data.json"`, "Cache-Control": "no-store" },
  });
}
````

### `app/api/account/places/route.ts`

````ts
import { PlacesSchema } from "@/lib/accountData";
import { flags } from "@/lib/flags";
import { err, json, readJson, requireSession, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** D4 My places (accounts track): a confirmed account's backup destinations, encrypted. Never used in emails, analytics or AI. */
export async function GET() {
  if (!flags().accounts) return err("Not found", 404);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  return json({ places: await store.getPlaces(auth.user.id) });
}

export async function PUT(req: Request) {
  if (!flags().accounts) return err("Not found", 404);
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  const body = await readJson<{ places?: unknown }>(req, 20_000);
  const parsed = PlacesSchema.safeParse(body?.places);
  if (!parsed.success) return err("Check the places and try again");
  await store.setPlaces(auth.user.id, parsed.data);
  return json({ ok: true });
}
````

### `app/api/account/reminders/route.ts`

````ts
import { ReminderPrefsSchema } from "@/lib/accountData";
import { flags } from "@/lib/flags";
import { err, json, readJson, requireSession, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** D12 email reminders (accounts track): opt-in, per maintenance item, separate from marketing. */
export async function GET() {
  if (!flags().accounts) return err("Not found", 404);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  return json({ prefs: await store.getReminderPrefs(auth.user.id) });
}

export async function PUT(req: Request) {
  if (!flags().accounts) return err("Not found", 404);
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  const body = await readJson<{ prefs?: unknown }>(req, 10_000);
  const parsed = ReminderPrefsSchema.safeParse(body?.prefs);
  if (!parsed.success) return err("Invalid reminder settings");
  await store.setReminderPrefs(auth.user.id, parsed.data);
  return json({ ok: true });
}
````

### `app/api/auth/me/route.ts`

````ts
import { flags } from "@/lib/flags";
import { json } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

/** Menu state only: whether this browser is signed in, and whether the accounts track is on. No personal data. */
export async function GET() {
  const s = await getSession();
  return json({ signedIn: s?.scope === "full", accounts: flags().accounts });
}
````

### `app/api/cron/emails/route.ts`

````ts
import { renderConfirmReminder, renderFollowupEmail, renderReminderEmail, type FollowupKind } from "@/lib/email/render";
import { flags } from "@/lib/flags";
import { maintenanceItems } from "@/lib/plan/maintenance";
import { dueReminders } from "@/lib/reminders";
import { issueLink } from "@/lib/server/auth";
import type { ComputedPlan } from "@/lib/rules/engine";
import { env } from "@/lib/server/env";
import { metaFor, sendEmail } from "@/lib/server/mailer";
import { store } from "@/lib/server/store";
import { atLeast } from "@/lib/zip/profile";

export const maxDuration = 300;

/**
 * Daily follow-ups (Vercel Cron). Opt-in only: confirmed, follow-ups on, not unsubscribed.
 * Day 1, Day 3 and Day 30 after the latest plan; seasonal "winter" in November and "hurricane" in June
 * based on the plan's ZIP hazard profile. Each kind is sent at most once (per year for seasonal).
 */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const sent: Record<string, number> = {};
  for (const user of await store.listUsers()) {
    // One reminder to confirm, 1–6 days after signup, for people who built a plan but never confirmed.
    if (!user.double_opt_in_at && !user.unsubscribed_at) {
      const age = (now.getTime() - new Date(user.created_at).getTime()) / 86_400_000;
      if (age >= 1 && age < 6 && !(await store.hasEmailEvent(user.id, "sent:confirm_reminder")) && (await store.listPlans(user.id)).length) {
        const link = await issueLink(user.id, "confirm", "/account?confirmed=1");
        const m = renderConfirmReminder(link, metaFor(user.id));
        if (await sendEmail({ to: user.email, userId: user.id, type: "confirm_reminder", ...m })) sent.confirm_reminder = (sent.confirm_reminder ?? 0) + 1;
      }
      continue;
    }
    if (user.unsubscribed_at) continue;
    const plan = (await store.listPlans(user.id))[0];
    if (!plan) continue;
    // D12 (accounts track): opt-in maintenance reminders, a separate switch from marketing follow-ups.
    // At most one email per user per day, so a reminder takes the day's slot.
    if (flags().accounts) {
      const due = dueReminders(maintenanceItems(plan.computed_quantities as ComputedPlan), await store.getReminderPrefs(user.id), new Date(plan.created_at), now);
      const type = `reminder_${now.toISOString().slice(0, 10)}`;
      if (due.length && !(await store.hasEmailEvent(user.id, `sent:${type}`))) {
        const m = renderReminderEmail(due, `${env.appUrl}/plan/${plan.id}`, metaFor(user.id));
        if (await sendEmail({ to: user.email, userId: user.id, type, ...m })) sent.reminder = (sent.reminder ?? 0) + 1;
        continue;
      }
    }
    if (!user.followups_opt_in) continue;
    const ageDays = (now.getTime() - new Date(plan.created_at).getTime()) / 86_400_000;
    const profile = (plan.computed_quantities as ComputedPlan).profile;
    const due: [FollowupKind, string][] = [];
    if (ageDays >= 1 && ageDays < 3) due.push(["day1", "followup_day1"]);
    if (ageDays >= 3 && ageDays < 10) due.push(["day3", "followup_day3"]);
    if (ageDays >= 30 && ageDays < 40) due.push(["day30", "followup_day30"]);
    if (month === 11 && atLeast(profile.winter, "moderate")) due.push(["winter", `seasonal_winter_${year}`]);
    if (month === 6 && atLeast(profile.hurricane, "moderate")) due.push(["hurricane", `seasonal_hurricane_${year}`]);
    for (const [kind, type] of due) {
      if (await store.hasEmailEvent(user.id, `sent:${type}`)) continue;
      const m = renderFollowupEmail(kind, `${env.appUrl}/plan/${plan.id}`, metaFor(user.id));
      if (await sendEmail({ to: user.email, userId: user.id, type, marketing: true, ...m })) sent[kind] = (sent[kind] ?? 0) + 1;
      break; // at most one email per user per day
    }
  }
  const purgedAnonymous = await store.deleteStaleAnonQuestionnaires(30);
  return Response.json({ ok: true, sent, purgedAnonymous });
}
````

### `app/api/plans/[id]/ai-copy/route.ts`

````ts
import { loadPlanFor } from "@/lib/server/access";
import { err, json, sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import { AI_COPY_EVENT } from "@/lib/server/store/types";

/** D13: count a "Copy for your AI assistant" click. Only the plan id is recorded, never the copied text. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const session = await getSession();
  const { id } = await params;
  const plan = await loadPlanFor(session, id);
  if (!plan) return err("Not found", 404);
  await store.addEmailEvent({ user_id: plan.user_id, type: AI_COPY_EVENT, provider_id: plan.id, sent_at: new Date().toISOString() });
  return json({ ok: true });
}
````

### `app/api/plans/[id]/calendar/route.ts`

````ts
import { BRAND } from "@/lib/brand";
import { buildIcs } from "@/lib/calendar/ics";
import { maintenanceItems } from "@/lib/plan/maintenance";
import type { ComputedPlan } from "@/lib/rules/engine";
import { loadPlanFor } from "@/lib/server/access";
import { err } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

/** D12: "Add to my calendar". A .ics file with the plan's maintenance schedule; no account needed. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return err("Not found", 404);
  const ics = buildIcs(maintenanceItems(plan.computed_quantities as ComputedPlan), { from: new Date(), uidPrefix: `${plan.id}@${BRAND.slug}`, calName: `${BRAND.name} maintenance` });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${BRAND.file}-maintenance.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
````

### `app/api/plans/[id]/checks/route.ts`

````ts
import { z } from "zod";
import { loadPlanFor } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

const Body = z.object({ checks: z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.boolean()).refine((c) => Object.keys(c).length <= 300) });

/** Save checklist ticks on the plan for 30 days in this browser, or on any device once the email is confirmed. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return err("Not found", 404);
  const body = Body.safeParse(await readJson(req, 20_000));
  if (!body.success) return err("Invalid");
  await store.updatePlan(plan.id, { checks: Object.fromEntries(Object.entries(body.data.checks).filter(([, v]) => v)) });
  return json({ ok: true });
}
````

### `app/api/plans/[id]/choose/route.ts`

````ts
import { consentStillValid } from "@/lib/legal";
import { NextResponse } from "next/server";
import { AnswersSchema, GEAR_SLOTS, GearLevel, withGearChoice } from "@/lib/answers/schema";
import { loadPlanFor } from "@/lib/server/access";
import { env } from "@/lib/server/env";
import { sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

export const maxDuration = 60;

/**
 * À la carte: switch one gear slot (water, generator, go-bag…) to essential / standard / premium.
 * Rebuilds the plan with that choice (quantities still come from the rules), keeps checklist ticks,
 * and returns to the same section. Plain form POST, so it works without JavaScript.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new Response("Please reload the page and try again.", { status: 403 });
  const { id } = await params;
  const session = await getSession();
  const plan = await loadPlanFor(session, id);
  if (!plan || !session) return NextResponse.redirect(new URL("/account", env.appUrl), 303);
  const form = await req.formData();
  const group = String(form.get("group") ?? "");
  // "mix" (food only, D7) goes back to the recommended food mix.
  const level = group === "food" && form.get("level") === "mix" ? ({ success: true, data: "mix" } as const) : GearLevel.safeParse(form.get("level"));
  const back = String(form.get("back") ?? "gear").replace(/[^a-z0-9-]/g, "");
  if (!(GEAR_SLOTS as readonly string[]).includes(group) || !level.success) return NextResponse.redirect(new URL(`/plan/${plan.id}#${back}`, env.appUrl), 303);
  if (!(await limit(`choose:${session.nonce}`, 60, 3600)) || !(await limit(`choose:ip:${await clientIp()}`, LIMITS.generatePerIpHour * 3, 3600)))
    return new Response("Too many changes in a short time. Try again shortly.", { status: 429 });

  const source = await store.getQuestionnaire(plan.questionnaire_id);
  const prev = AnswersSchema.safeParse(source?.answers);
  if (!prev.success) return NextResponse.redirect(new URL(`/plan/${plan.id}#${back}`, env.appUrl), 303);
  const answers = withGearChoice(prev.data, group as (typeof GEAR_SLOTS)[number], level.data);
  // Rebuild only under a consent that still covers it (current Terms; health consent if health answers).
  // Otherwise open the last screen with the gear choice applied, so they tick the boxes and press Update.
  if (!consentStillValid(answers, plan.consent)) {
    const draft = await store.createQuestionnaire({ user_id: plan.user_id, session_nonce: session.nonce, answers: { ...answers, _screen: "budget" }, complete: false, version: 1 });
    return NextResponse.redirect(new URL(`/q/${draft.id}`, env.appUrl), 303);
  }
  const q = await store.createQuestionnaire({ user_id: plan.user_id, session_nonce: session.nonce, answers, complete: true, version: 1 });
  const next = await buildAndSavePlan(plan.user_id, q.id, answers, plan.consent);
  if (plan.checks && Object.keys(plan.checks).length) await store.updatePlan(next.id, { checks: plan.checks });
  return NextResponse.redirect(new URL(`/plan/${next.id}#${back}`, env.appUrl), 303);
}
````

### `app/api/plans/[id]/edit/route.ts`

````ts
import { withoutConsentTicks } from "@/lib/legal";
import { NextResponse } from "next/server";
import { loadPlanFor } from "@/lib/server/access";
import { env } from "@/lib/server/env";
import { sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

const EDIT_SCREENS = ["location", "household", "pets", "medical", "home", "heat", "power", "storage", "evacuation", "budget"] as const;

/**
 * "Change an answer": copy this plan's answers into a new questionnaire that opens on one screen,
 * with an "Update my plan" button. Plain form POST (works without JavaScript).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new Response("Please reload the page and try again.", { status: 403 });
  const { id } = await params;
  const session = await getSession();
  const plan = await loadPlanFor(session, id);
  if (!plan || !session) return NextResponse.redirect(new URL("/account", env.appUrl), 303);
  const source = await store.getQuestionnaire(plan.questionnaire_id);
  const screen = String((await req.formData()).get("screen") ?? "location");
  const q = await store.createQuestionnaire({
    user_id: plan.user_id,
    session_nonce: session.nonce,
    answers: { ...withoutConsentTicks(source?.answers ?? {}), _screen: (EDIT_SCREENS as readonly string[]).includes(screen) ? screen : "location", _step: undefined },
    complete: false,
    version: 1,
  });
  return NextResponse.redirect(new URL(`/q/${q.id}`, env.appUrl), 303);
}
````

### `app/api/plans/[id]/inventory/route.ts`

````ts
import { InventorySchema, seedInventory } from "@/lib/accountData";
import { flags } from "@/lib/flags";
import { loadPlanFor } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/**
 * D2 inventory (accounts track, behind ACCOUNTS_ENABLED). Saved on the plan, encrypted: without an
 * account it opens in this browser for 30 days; with a confirmed email, on any device.
 * Same access rule as the plan (loadPlanFor).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!flags().accounts) return err("Not found", 404);
  const plan = await loadPlanFor(await getSession(), (await params).id);
  if (!plan) return err("Not found", 404);
  return json({ inventory: seedInventory(plan.inventory, plan.checks) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!flags().accounts) return err("Not found", 404);
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const plan = await loadPlanFor(await getSession(), (await params).id);
  if (!plan) return err("Not found", 404);
  const body = await readJson<{ inventory?: unknown }>(req, 60_000);
  const parsed = InventorySchema.safeParse(body?.inventory);
  if (!parsed.success) return err("Invalid inventory");
  await store.updatePlan(plan.id, { inventory: parsed.data });
  return json({ ok: true });
}
````

### `app/api/plans/[id]/pdf/route.ts`

````ts
import type { PlanDocument } from "@/lib/plan/document";
import { flags } from "@/lib/flags";
import { renderPlanPdf } from "@/lib/pdf/PlanPdf";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";
import { BRAND } from "@/lib/brand";

export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return new Response("Not found", { status: 404 });
  const pdf = await renderPlanPdf(plan.plan as PlanDocument, { diyTips: flags().diyTips });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${BRAND.file}-${plan.created_at.slice(0, 10)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
````

### `app/api/questionnaire/[id]/generate/route.ts`

````ts
import { after } from "next/server";
import { AnswersSchema, migrateAnswers } from "@/lib/answers/schema";
import { checkConsent, consentRecord, type ConsentInput } from "@/lib/legal";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan, emailPlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import type { StreamLine } from "@/lib/plan/stages";

export const maxDuration = 60;

/** Build the plan for a questionnaire this browser started (email was given on the front page). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const session = await getSession();
  const { id } = await params;
  const q = /^[0-9a-f-]{36}$/i.test(id) ? await store.getQuestionnaire(id) : null;
  if (!q || !(await canAccessQuestionnaire(session, q))) return err("Not found", 404);
  const body = await readJson<{ answers?: unknown; consent?: ConsentInput }>(req, 20_000);
  const parsed = AnswersSchema.safeParse(migrateAnswers(body?.answers ?? q.answers));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Some answers are missing");
  const consentError = checkConsent(parsed.data, body?.consent);
  if (consentError) return err(consentError);
  const ip = await clientIp();

  // Email is optional: plans can be built anonymously and claimed later from the plan page.
  const user = q.user_id ? await store.getUser(q.user_id) : null;
  const who = user ? `user:${user.id}` : `nonce:${session!.nonce}`;
  if (!(await limit(`gen:${who}`, LIMITS.generatePerUserDay, 86_400)) || !(await limit(`gen:ip:${ip}`, LIMITS.generatePerIpHour, 3600)))
    return err("You've generated several plans today. Try again tomorrow.", 429);

  await store.updateQuestionnaire(id, { answers: parsed.data });
  // Confirmed addresses get the plan right away, even if they confirmed on another device.
  const emailNow = !!user?.double_opt_in_at;
  const finish = (plan: Awaited<ReturnType<typeof buildAndSavePlan>>) => {
    if (user && emailNow) after(() => emailPlan(plan, user).catch((e) => console.error("[mail] plan", e)));
    return { planId: plan.id, emailed: emailNow };
  };

  // D11: with Accept: application/x-ndjson, stream each build stage as it actually finishes.
  if ((req.headers.get("accept") ?? "").includes("application/x-ndjson")) {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(c) {
        const send = (line: StreamLine) => c.enqueue(enc.encode(JSON.stringify(line) + "\n"));
        try {
          const plan = await buildAndSavePlan(user?.id ?? null, id, parsed.data, consentRecord(parsed.data), (stage) => send({ stage }));
          send(finish(plan));
        } catch (e) {
          console.error("[generate]", e);
          send({ error: "Couldn't build the plan. Try again." });
        }
        c.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  }

  const plan = await buildAndSavePlan(user?.id ?? null, id, parsed.data, consentRecord(parsed.data));
  return json(finish(plan));
}
````

### `tests/authz.test.ts`

````ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * D9 authorization: no one can read or change another person's data. Calls the real route handlers
 * against a temporary file store, with the session cookie set per request.
 */
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
}));

const ORIGIN = "http://test.local";
process.env.READYPLAN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rp-authz-"));
process.env.APP_URL = ORIGIN;
process.env.ACCOUNTS_ENABLED = "true";

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let R: Record<string, Record<string, Handler>>;
let ids: { a: string; b: string; planA: string; planAnon: string; nonceA: string; nonceAnon: string };
let session: { encodeSession: (s: { uid: string; nonce: string; scope: "anon" | "draft" | "full"; exp: number }) => string };

const as = (who: { uid: string; nonce: string; scope: "anon" | "draft" | "full" } | null) => {
  jar.clear();
  if (who) jar.set("rp_session", session.encodeSession({ ...who, exp: Date.now() + 3600_000 }));
};
const req = (method: string, url: string, body?: unknown, origin = ORIGIN) =>
  new Request(`${ORIGIN}${url}`, { method, headers: { "content-type": "application/json", host: "test.local", ...(origin ? { origin } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
const call = (route: string, method: string, url: string, id?: string, body?: unknown, origin?: string) =>
  R[route][method](req(method, url, body, origin), { params: Promise.resolve({ id: id ?? "" }) });

beforeAll(async () => {
  const { fileStore: store } = await import("@/lib/server/store/file");
  session = await import("@/lib/server/session");
  const { buildPlan } = await import("./helpers/build");
  const built = await buildPlan();
  const a = await store.createUser({ email: "a@example.com", consent_at: new Date().toISOString(), double_opt_in_at: new Date().toISOString(), unsubscribed_at: null, followups_opt_in: false });
  const b = await store.createUser({ email: "b@example.com", consent_at: new Date().toISOString(), double_opt_in_at: new Date().toISOString(), unsubscribed_at: null, followups_opt_in: false });
  const qa = await store.createQuestionnaire({ user_id: a.id, session_nonce: "nonce-a", answers: {}, complete: true, version: 2 });
  const qn = await store.createQuestionnaire({ user_id: null, session_nonce: "nonce-anon", answers: {}, complete: true, version: 2 });
  const mk = (q: string, user: string | null) => store.createPlan({ questionnaire_id: q, user_id: user, computed_quantities: built.computed, plan: built.document, pdf_url: null, emailed_at: null, writer: "template", consent: null });
  const pa = await mk(qa.id, a.id);
  const pn = await mk(qn.id, null);
  await store.updatePlan(pa.id, { inventory: { radio: { status: "have" } } });
  await store.setPlaces(a.id, [{ id: "p1", name: "Aunt", address: "742 Sentinel Road" }]);
  ids = { a: a.id, b: b.id, planA: pa.id, planAnon: pn.id, nonceA: "nonce-a", nonceAnon: "nonce-anon" };
  R = {
    inventory: await import("@/app/api/plans/[id]/inventory/route"),
    checks: await import("@/app/api/plans/[id]/checks/route"),
    aiCopy: await import("@/app/api/plans/[id]/ai-copy/route"),
    calendar: await import("@/app/api/plans/[id]/calendar/route"),
    places: await import("@/app/api/account/places/route"),
    reminders: await import("@/app/api/account/reminders/route"),
    export: await import("@/app/api/account/export/route"),
  } as unknown as Record<string, Record<string, Handler>>;
});

const A = () => ({ uid: ids.a, nonce: "other", scope: "full" as const });
const B = () => ({ uid: ids.b, nonce: "nonce-b", scope: "full" as const });
const otherBrowser = () => ({ uid: "", nonce: "someone-else", scope: "anon" as const });

describe("D9: plan data (inventory, checks, calendar, Copy for AI)", () => {
  it("the owner can read and write; another user, another browser and no session get 404", async () => {
    as(A());
    expect((await call("inventory", "GET", "/x", ids.planA)).status).toBe(200);
    expect((await call("inventory", "PUT", "/x", ids.planA, { inventory: { radio: { status: "low" } } })).status).toBe(200);
    for (const who of [B(), otherBrowser(), null]) {
      as(who);
      expect((await call("inventory", "GET", "/x", ids.planA)).status, JSON.stringify(who)).toBe(404);
      expect((await call("inventory", "PUT", "/x", ids.planA, { inventory: { radio: { status: "need" } } })).status).toBe(404);
      expect((await call("checks", "PUT", "/x", ids.planA, { checks: { "week-1": true } })).status).toBe(404);
      expect((await call("calendar", "GET", "/x", ids.planA)).status).toBe(404);
      expect((await call("aiCopy", "POST", "/x", ids.planA)).status).toBe(404);
    }
    const { fileStore } = await import("@/lib/server/store/file");
    expect((await fileStore.getPlan(ids.planA))!.inventory).toEqual({ radio: { status: "low" } }); // unchanged by the others
  });
  it("an anonymous plan opens only in the browser that built it", async () => {
    as({ uid: "", nonce: ids.nonceAnon, scope: "anon" });
    expect((await call("inventory", "GET", "/x", ids.planAnon)).status).toBe(200);
    for (const who of [otherBrowser(), A(), B()]) {
      as(who);
      expect((await call("inventory", "GET", "/x", ids.planAnon)).status).toBe(404);
    }
  });
  it("writes from another site are refused", async () => {
    as(A());
    expect((await call("inventory", "PUT", "/x", ids.planA, { inventory: {} }, "https://evil.example")).status).toBe(403);
    expect((await call("places", "PUT", "/x", undefined, { places: [] }, "https://evil.example")).status).toBe(403);
    expect((await call("reminders", "PUT", "/x", undefined, { prefs: { enabled: true, types: {} } }, "https://evil.example")).status).toBe(403);
  });
});

describe("D9: account data (My places, reminders, export)", () => {
  it("only a signed-in owner sees their places; B sees only B's", async () => {
    as(A());
    expect(await (await call("places", "GET", "/x")).json()).toEqual({ places: [{ id: "p1", name: "Aunt", address: "742 Sentinel Road" }] });
    as(B());
    expect(await (await call("places", "GET", "/x")).json()).toEqual({ places: [] });
    as(otherBrowser());
    expect((await call("places", "GET", "/x")).status).toBe(401);
    as(null);
    expect((await call("reminders", "GET", "/x")).status).toBe(401);
    expect((await call("export", "GET", "/x")).status).toBe(401);
  });
  it("export includes inventory, places and reminder prefs, and nothing of anyone else's", async () => {
    as(A());
    const data = await (await call("export", "GET", "/x")).json();
    expect(data.places).toHaveLength(1);
    expect(data.reminderPrefs).toEqual({ enabled: false, types: {} });
    expect(data.plans.map((p: { id: string }) => p.id)).toEqual([ids.planA]);
    expect(data.plans[0].inventory).toBeTruthy();
    expect(JSON.stringify(data.user)).not.toContain("places_json");
  });
  it("delete removes the user's plans, inventory and places", async () => {
    const { fileStore } = await import("@/lib/server/store/file");
    await fileStore.deleteUserCascade(ids.a);
    expect(await fileStore.getPlan(ids.planA)).toBeNull();
    expect(await fileStore.getPlaces(ids.a)).toEqual([]);
    expect(await fileStore.getUser(ids.b)).not.toBeNull(); // B untouched
  });
});

describe("accounts track is off by default", () => {
  it("every accounts route is a 404 when ACCOUNTS_ENABLED isn't 'true'", async () => {
    process.env.ACCOUNTS_ENABLED = "false";
    as(B());
    expect((await call("places", "GET", "/x")).status).toBe(404);
    expect((await call("reminders", "GET", "/x")).status).toBe(404);
    expect((await call("inventory", "GET", "/x", ids.planAnon)).status).toBe(404);
    process.env.ACCOUNTS_ENABLED = "true";
  });
});

describe("D2 tiers: the 30-day cleanup", () => {
  it("removes anonymous plans older than 30 days, never an account's plans", async () => {
    const { fileStore } = await import("@/lib/server/store/file");
    const u = await fileStore.createUser({ email: "c@example.com", consent_at: new Date().toISOString(), double_opt_in_at: new Date().toISOString(), unsubscribed_at: null, followups_opt_in: false });
    const kept = await fileStore.createQuestionnaire({ user_id: u.id, session_nonce: "n1", answers: {}, complete: true, version: 2 });
    const old = await fileStore.createQuestionnaire({ user_id: null, session_nonce: "n2", answers: {}, complete: true, version: 2 });
    // Age both by 31 days.
    const file = path.join(process.env.READYPLAN_DATA_DIR!, "db.json");
    const db = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const q of db.questionnaires) if (q.id === kept.id || q.id === old.id) q.updated_at = new Date(Date.now() - 31 * 86_400_000).toISOString();
    fs.writeFileSync(file, JSON.stringify(db));
    await fileStore.deleteStaleAnonQuestionnaires(30);
    expect(await fileStore.getQuestionnaire(old.id)).toBeNull();
    expect(await fileStore.getQuestionnaire(kept.id)).not.toBeNull();
  });
});
````

## Migrations 0004–0008 (files only, never applied by this run)

### `supabase/migrations/0004_plan_checks.sql`

````sql
-- Checklist ticks follow the plan across devices (ids only; not sensitive).
alter table plans add column if not exists checks jsonb not null default '{}'::jsonb;
````

### `supabase/migrations/0005_plan_consent.sql`

````sql
-- Clickwrap record per plan: Terms version, when they were accepted, and when health-adjacent answers
-- (prescriptions, powered medical devices, mobility) were consented to. Null for plans built before this.
-- Encrypted like answers and plans (AES-256-GCM, lib/server/crypto.ts): the health timestamp reveals that a
-- household answered yes to a health question.
alter table plans add column if not exists consent_json jsonb;
````

### `supabase/migrations/0006_plan_inventory.sql`

````sql
-- Accounts track (owner brief D2, Batch D). Behind ACCOUNTS_ENABLED. The owner applies migrations.
-- Household inventory per plan (have / need / bought / low, quantity, optional expiry), encrypted by the
-- app (AES-256-GCM, lib/server/crypto.ts) like answers and plans. Deleted with the plan (cascade).
alter table plans add column if not exists inventory_json jsonb;
````

### `supabase/migrations/0007_user_places.sql`

````sql
-- Accounts track (owner brief D4, Batch D). Behind ACCOUNTS_ENABLED. The owner applies migrations.
-- "My places": backup destinations (name, address, notes, optional distance), encrypted by the app.
-- Never used in emails, analytics or AI. Deleted with the user row.
alter table users add column if not exists places_json jsonb;
````

### `supabase/migrations/0008_reminder_prefs.sql`

````sql
-- Accounts track (owner brief D12, Batch D). Behind ACCOUNTS_ENABLED. The owner applies migrations.
-- Opt-in email reminder preferences ({ enabled, types: { <maintenance id>: { on, every } } }).
-- A separate switch from marketing (followups_opt_in). Not personal content; deleted with the user row.
alter table users add column if not exists reminder_prefs jsonb;
````

### RLS in all migrations

`git grep -niE "row level security|create policy|enable rls" -- supabase/migrations`

````text
supabase/migrations/0001_init.sql:107:alter table users enable row level security;
supabase/migrations/0001_init.sql:108:alter table questionnaires enable row level security;
supabase/migrations/0001_init.sql:109:alter table plans enable row level security;
supabase/migrations/0001_init.sql:110:alter table auth_tokens enable row level security;
supabase/migrations/0001_init.sql:111:alter table gear_catalog enable row level security;
supabase/migrations/0001_init.sql:112:alter table rule_constants enable row level security;
supabase/migrations/0001_init.sql:113:alter table email_events enable row level security;
supabase/migrations/0001_init.sql:114:alter table rate_limits enable row level security;
````

The app reaches Supabase only from the server with the service-role key (lib/server/store/supabase.ts); RLS with no policies denies the anon and authenticated roles. New columns in 0006–0008 sit on tables that already have RLS on (plans, users).

## Export and delete: inventory, places, reminder prefs

Export (`app/api/account/export/route.ts`, full source above) reads `listPlans` (each plan carries its decrypted `inventory`), `getPlaces` and `getReminderPrefs`.

Storage: inventory is a column on the plan row (`plans.inventory_json`, sealed). My places and reminder prefs are columns on the user row (`users.places_json` sealed, `users.reminder_prefs`). Deleting the user row therefore removes places and prefs, and deleting the user's plans removes their inventory. In Supabase the plans go by FK ON DELETE CASCADE from users.

`lib/server/store/file.ts:106-115` (file store)

````ts
  async deleteUserCascade(id) {
    tx((db) => {
      const qids = new Set(db.questionnaires.filter((q) => q.user_id === id).map((q) => q.id));
      db.users = db.users.filter((u) => u.id !== id);
      db.questionnaires = db.questionnaires.filter((q) => q.user_id !== id);
      db.plans = db.plans.filter((p) => p.user_id !== id && !qids.has(p.questionnaire_id));
      db.tokens = db.tokens.filter((t) => t.user_id !== id);
      db.email_events = db.email_events.filter((e) => e.user_id !== id);
    });
  },
````

`lib/server/store/supabase.ts:62-68` (Supabase store)

````ts
  async deleteUserCascade(id) {
    // FK ON DELETE CASCADE removes questionnaires, plans, tokens and email events; storage objects removed here.
    const plans = must(await db().from("plans").select("pdf_url").eq("user_id", id)) as { pdf_url: string | null }[];
    const paths = plans.map((p) => p.pdf_url).filter((x): x is string => !!x);
    if (paths.length) await db().storage.from("plans").remove(paths);
    must(await db().from("users").delete().eq("id", id));
  },
````

Where the three fields are read and written in the stores:

````text
lib/server/store/file.ts:17:type StoredP = Omit<PlanRow, "computed_quantities" | "plan" | "consent" | "inventory"> & { computed_quantities_json: Sealed; plan_json: Sealed; consent_json?: Sealed | null; inventory_json?: Sealed | null };
lib/server/store/file.ts:18:/** Same columns as migrations 0007 (places_json, encrypted) and 0008 (reminder_prefs). */
lib/server/store/file.ts:19:type StoredU = UserRow & { places_json?: Sealed | null; reminder_prefs?: ReminderPrefs | null };
lib/server/store/file.ts:67:  const { computed_quantities_json, plan_json, consent_json, inventory_json, ...rest } = p;
lib/server/store/file.ts:73:    inventory: inventory_json ? unseal<Inventory>(inventory_json) : null,
lib/server/store/file.ts:77:const uOut = (u: StoredU | undefined): UserRow | null => {
lib/server/store/file.ts:79:  const { places_json: _p, reminder_prefs: _r, ...rest } = u;
lib/server/store/file.ts:85:    return uOut(load().users.find((u) => u.email === email.toLowerCase()));
lib/server/store/file.ts:88:    return uOut(load().users.find((u) => u.id === id));
lib/server/store/file.ts:104:    return load().users.map((u) => uOut(u)!);
lib/server/store/file.ts:169:      if (inventory !== undefined) p.inventory_json = inventory ? seal(inventory) : null;
lib/server/store/file.ts:174:    return u?.places_json ? unseal<Place[]>(u.places_json) : [];
lib/server/store/file.ts:179:      if (u) u.places_json = places.length ? seal(places) : null;
lib/server/store/file.ts:183:    return load().users.find((x) => x.id === userId)?.reminder_prefs ?? DEFAULT_REMINDER_PREFS;
lib/server/store/file.ts:188:      if (u) u.reminder_prefs = prefs;
lib/server/store/supabase.ts:26:type PDb = Omit<PlanRow, "computed_quantities" | "plan" | "consent" | "inventory"> & { computed_quantities_json: Sealed; plan_json: Sealed; consent_json?: Sealed | null; inventory_json?: Sealed | null };
lib/server/store/supabase.ts:27:/** Users are read without their sealed columns (places_json, migration 0007; reminder_prefs, 0008). */
lib/server/store/supabase.ts:28:const USER_COLS = "id,email,consent_at,double_opt_in_at,unsubscribed_at,followups_opt_in,created_at";
lib/server/store/supabase.ts:30:const pOut = ({ computed_quantities_json, plan_json, consent_json, inventory_json, ...r }: PDb): PlanRow => ({
lib/server/store/supabase.ts:35:  inventory: inventory_json ? unseal<Inventory>(inventory_json) : null,
lib/server/store/supabase.ts:48:    return must(await db().from("users").select(USER_COLS).eq("email", email.toLowerCase()).maybeSingle()) as UserRow | null;
lib/server/store/supabase.ts:51:    return must(await db().from("users").select(USER_COLS).eq("id", id).maybeSingle()) as UserRow | null;
lib/server/store/supabase.ts:54:    return must(await db().from("users").insert({ ...u, email: u.email.toLowerCase() }).select(USER_COLS).single()) as UserRow;
lib/server/store/supabase.ts:60:    return must(await db().from("users").select(USER_COLS)) as UserRow[];
lib/server/store/supabase.ts:101:    if (inventory !== undefined) row.inventory_json = inventory ? seal(inventory) : null;
lib/server/store/supabase.ts:105:    const r = must(await db().from("users").select("places_json").eq("id", userId).maybeSingle()) as { places_json: Sealed | null } | null;
lib/server/store/supabase.ts:106:    return r?.places_json ? unseal<Place[]>(r.places_json) : [];
lib/server/store/supabase.ts:109:    must(await db().from("users").update({ places_json: places.length ? seal(places) : null }).eq("id", userId));
lib/server/store/supabase.ts:112:    const r = must(await db().from("users").select("reminder_prefs").eq("id", userId).maybeSingle()) as { reminder_prefs: ReminderPrefs | null } | null;
lib/server/store/supabase.ts:113:    return r?.reminder_prefs ?? DEFAULT_REMINDER_PREFS;
lib/server/store/supabase.ts:116:    must(await db().from("users").update({ reminder_prefs: prefs }).eq("id", userId));
````

Tests touching export / delete:

````text
tests/accounts.test.ts:24:  it("places and reminder prefs are bounded", () => {
tests/authz.test.ts:58:    places: await import("@/app/api/account/places/route"),
tests/authz.test.ts:60:    export: await import("@/app/api/account/export/route"),
tests/authz.test.ts:95:    expect((await call("places", "PUT", "/x", undefined, { places: [] }, "https://evil.example")).status).toBe(403);
tests/authz.test.ts:100:describe("D9: account data (My places, reminders, export)", () => {
tests/authz.test.ts:101:  it("only a signed-in owner sees their places; B sees only B's", async () => {
tests/authz.test.ts:103:    expect(await (await call("places", "GET", "/x")).json()).toEqual({ places: [{ id: "p1", name: "Aunt", address: "742 Sentinel Road" }] });
tests/authz.test.ts:105:    expect(await (await call("places", "GET", "/x")).json()).toEqual({ places: [] });
tests/authz.test.ts:107:    expect((await call("places", "GET", "/x")).status).toBe(401);
tests/authz.test.ts:110:    expect((await call("export", "GET", "/x")).status).toBe(401);
tests/authz.test.ts:112:  it("export includes inventory, places and reminder prefs, and nothing of anyone else's", async () => {
tests/authz.test.ts:114:    const data = await (await call("export", "GET", "/x")).json();
tests/authz.test.ts:115:    expect(data.places).toHaveLength(1);
tests/authz.test.ts:116:    expect(data.reminderPrefs).toEqual({ enabled: false, types: {} });
tests/authz.test.ts:119:    expect(JSON.stringify(data.user)).not.toContain("places_json");
tests/authz.test.ts:121:  it("delete removes the user's plans, inventory and places", async () => {
tests/authz.test.ts:123:    await fileStore.deleteUserCascade(ids.a);
tests/authz.test.ts:134:    expect((await call("places", "GET", "/x")).status).toBe(404);
````
