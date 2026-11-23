import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * D9 authorization: no one can read or change another person's data. Calls the real route handlers
 * against a temporary file store, with the session cookie set per request.
 */
const jar = new Map<string, string>();
let ip = "203.0.113.1";
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
  headers: async () => new Headers({ "x-forwarded-for": ip }),
}));

// Next's after() needs a request scope; the tests don't need the background email.
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: () => {} }));

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

describe("security review Low 6: plan ids must have the exact generated format", () => {
  const BAD = [
    "",
    "not-a-plan",
    "------------------------------------", // 36 dashes passed the old loose check
    "00000000-0000-0000-0000-000000000000", // not version 4
    "../../etc/passwd",
  ];
  it("isId accepts generated ids only", async () => {
    const { isId } = await import("@/lib/ids");
    const { newId } = await import("@/lib/server/crypto");
    for (let i = 0; i < 50; i++) expect(isId(newId())).toBe(true);
    expect(isId(ids.planA)).toBe(true);
    for (const b of [...BAD, ids.planA.toUpperCase(), `${ids.planA}x`, ` ${ids.planA}`, `${ids.planA}\n`, null, undefined, 42]) expect(isId(b), String(b)).toBe(false);
  });
  it("every plan route answers 404 to a bad id, before any store lookup", async () => {
    const { fileStore } = await import("@/lib/server/store/file");
    const extra = {
      pdf: await import("@/app/api/plans/[id]/pdf/route"),
      checklist: await import("@/app/api/plans/[id]/checklist/route"),
      choose: await import("@/app/api/plans/[id]/choose/route"),
      edit: await import("@/app/api/plans/[id]/edit/route"),
      claim: await import("@/app/api/plans/[id]/claim/route"),
    } as unknown as Record<string, Record<string, Handler>>;
    const routes: [Record<string, Handler>, string][] = [
      [R.inventory, "GET"], [R.inventory, "PUT"], [R.checks, "PUT"], [R.aiCopy, "POST"], [R.calendar, "GET"],
      [extra.pdf, "GET"], [extra.checklist, "GET"], [extra.choose, "POST"], [extra.edit, "POST"], [extra.claim, "POST"],
    ];
    const spies = [vi.spyOn(fileStore, "getPlan"), vi.spyOn(fileStore, "getQuestionnaire"), vi.spyOn(fileStore, "rateLimit")];
    ip = "203.0.113.60";
    as(A()); // even the owner's full session
    try {
      for (const bad of [...BAD, ids.planA.toUpperCase()])
        for (const [r, m] of routes) {
          const res = await r[m](req(m, "/x", m === "GET" ? undefined : { email: "a@example.com" }), { params: Promise.resolve({ id: bad }) });
          expect(res.status, `${m} ${bad}`).toBe(404);
        }
      for (const s of spies) expect(s).not.toHaveBeenCalled();
    } finally {
      for (const s of spies) s.mockRestore();
    }
    // The real id still works.
    expect((await call("calendar", "GET", "/x", ids.planA)).status).toBe(200);
  });
});

describe("review 3: Copy for AI is rate-limited and counted once per plan per day", () => {
  it("records one ai_copy event per plan per day, whatever the clicks", async () => {
    const { fileStore } = await import("@/lib/server/store/file");
    const count = async () => (await fileStore.listEmailEvents(ids.a)).filter((e) => e.type === "ai_copy" && e.provider_id === ids.planA).length;
    const before = await count();
    as({ uid: ids.a, nonce: "copy-nonce-1", scope: "full" });
    ip = "203.0.113.10";
    for (let i = 0; i < 5; i++) expect((await call("aiCopy", "POST", "/x", ids.planA)).status).toBe(200);
    expect(before).toBe(0);
    expect(await count()).toBe(1);
  });
  it("answers 429 past the per-browser limit, and past the per-IP limit from many browsers", async () => {
    const { LIMITS } = await import("@/lib/server/ratelimit");
    as({ uid: ids.a, nonce: "copy-nonce-2", scope: "full" });
    ip = "203.0.113.20";
    for (let i = 0; i < LIMITS.aiCopyPerNonceHour; i++) expect((await call("aiCopy", "POST", "/x", ids.planA)).status).toBe(200);
    expect((await call("aiCopy", "POST", "/x", ids.planA)).status).toBe(429);
    ip = "203.0.113.30";
    let last = 0;
    for (let i = 0; i <= LIMITS.aiCopyPerIpHour; i++) {
      as({ uid: ids.a, nonce: `copy-ip-${i}`, scope: "full" });
      last = (await call("aiCopy", "POST", "/x", ids.planA)).status;
    }
    expect(last).toBe(429);
  }, 60_000);
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

describe("security review M1/M2: claiming a plan for an address that already has an account", () => {
  it("changes nothing until the address owner uses the link; then only that account can open the plan", async () => {
    const { fileStore } = await import("@/lib/server/store/file");
    const claim = await import("@/app/api/plans/[id]/claim/route");
    const verify = await import("@/app/api/auth/verify/route");
    const { issueLink } = await import("@/lib/server/auth");
    const { claimNext } = await import("@/lib/server/claim");
    ip = "203.0.113.99"; // a fresh IP: the rate-limit test above used its own up
    await fileStore.updateUser(ids.b, { followups_opt_in: false, unsubscribed_at: "2026-11-01T00:00:00.000Z" });
    // An anonymous browser (the attacker's) claims its plan for B's address, asking for marketing.
    const anon = { uid: "", nonce: ids.nonceAnon, scope: "anon" as const };
    as(anon);
    const cookieBefore = jar.get("rp_session");
    const r = await claim.POST(req("POST", "/x", { email: "b@example.com", updates: true }), { params: Promise.resolve({ id: ids.planAnon }) });
    expect(r.status).toBe(200);
    expect((await r.json()).status).toBe("confirm"); // same reply as a new address; no "sent"
    expect((await fileStore.getPlan(ids.planAnon))!.user_id).toBeNull(); // not attached
    const after = (await fileStore.getUser(ids.b))!;
    expect(after.followups_opt_in).toBe(false); // consent not forged
    expect(after.unsubscribed_at).toBe("2026-11-01T00:00:00.000Z"); // unsubscribe not reversed
    expect(jar.get("rp_session")).toBe(cookieBefore); // no session tied to B
    // A forged claim in the link (signed for another user) is ignored.
    const forged = await issueLink(ids.b, "confirm", claimNext(ids.a, ids.planAnon));
    await verify.GET(new Request(forged));
    expect((await fileStore.getPlan(ids.planAnon))!.user_id).toBeNull();
    // B uses the real link: the plan is attached to B.
    const link = await issueLink(ids.b, "login", claimNext(ids.b, ids.planAnon, true));
    const v = await verify.GET(new Request(link));
    expect(v.headers.get("location")).toContain(`/plan/${ids.planAnon}`);
    expect((await fileStore.getPlan(ids.planAnon))!.user_id).toBe(ids.b);
    expect((await fileStore.getUser(ids.b))!.followups_opt_in).toBe(true); // B ticked updates and proved the address
    // A claim whose updates tick was added to the link afterwards isn't valid.
    const { parseClaim } = await import("@/lib/server/claim");
    expect(parseClaim(claimNext(ids.b, ids.planAnon, false) + "&u=1", ids.b)).toBeNull();
    expect(parseClaim(claimNext(ids.b, ids.planAnon, true), ids.b)).toEqual({ planId: ids.planAnon, updates: true });
    // M2: the browser that built it no longer opens it, now that it's in a confirmed account; B does.
    as(anon);
    expect((await call("checks", "PUT", "/x", ids.planAnon, { checks: { "week-1": true } })).status).toBe(404);
    expect((await call("aiCopy", "POST", "/x", ids.planAnon)).status).toBe(404);
    as(B());
    expect((await call("calendar", "GET", "/x", ids.planAnon)).status).toBe(200);
  });
});
