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
