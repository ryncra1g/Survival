import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_REMINDER_PREFS, type Inventory, type Place, type ReminderPrefs } from "@/lib/accountData";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import type { CatalogItem } from "@/lib/catalog/types";
import type { PlanConsent } from "@/lib/legal";
import type { Store, UserRow } from "@/lib/server/store/types";

/**
 * The store contract (docs/review/08_STORE_AUDIT.md). One suite, run against every Store implementation:
 *   - tests/store.file.test.ts      the file store (demo mode), in every `npm test`;
 *   - tests/store.supabase.test.ts  the Supabase store on a real Postgres (Supabase CLI local stack), CI job
 *                                   "store-postgres".
 * Every Store method writes, reads back and deep-compares with what was written, so a field one store drops,
 * renames or returns differently fails here instead of in production.
 */
export function storeContract(name: string, load: () => Promise<Store>) {
  describe(`Store contract: ${name}`, () => {
    let s: Store;
    beforeAll(async () => {
      s = await load();
    });
    const uniq = () => Math.random().toString(36).slice(2, 10);
    const newEmail = () => `contract-${uniq()}@example.com`;
    const NO_ID = "00000000-0000-4000-8000-000000000000";
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const future = () => new Date(Date.now() + 3_600_000).toISOString();

    async function user(extra: Partial<UserRow> = {}): Promise<UserRow> {
      return s.createUser({ email: newEmail(), consent_at: "2026-01-02T03:04:05.678Z", double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: true, ...extra });
    }
    const consent: PlanConsent = { termsVersion: "2026-11-01", termsAcceptedAt: "2026-11-20T10:00:00.000Z", healthDataConsentAt: "2026-11-20T10:00:01.000Z" };
    const inventory: Inventory = { "water-jug": { status: "have", qty: 2 }, "co-alarm": { status: "low", expiresOn: "2027-06-01" }, "first-aid": { status: "need" } };
    const computed = { water: { storedGal: 54, dailyGal: 3.85 }, list: [1, 2.5, "x", null, { deep: [true, false] }] };
    const planDoc = { title: "Your emergency plan", sections: [{ id: "water", blocks: [{ type: "checklist", items: [{ id: "week-1", text: "Store water" }] }] }] };

    it("users: create, read back by id and by email (any case), update, list", async () => {
      const email = newEmail();
      const u = await s.createUser({ email: email.toUpperCase(), consent_at: "2026-01-02T03:04:05.678Z", double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: false });
      expect(u).toMatchObject({ email, consent_at: "2026-01-02T03:04:05.678Z", double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: false });
      expect(Object.keys(u).sort()).toEqual(["consent_at", "created_at", "double_opt_in_at", "email", "followups_opt_in", "id", "unsubscribed_at"]);
      expect(await s.getUser(u.id)).toStrictEqual(u);
      expect(await s.getUserByEmail(email.toUpperCase())).toStrictEqual(u);
      const patch = { double_opt_in_at: "2026-02-03T04:05:06.789Z", unsubscribed_at: "2026-03-04T05:06:07.890Z", followups_opt_in: true };
      await s.updateUser(u.id, patch);
      const v = await s.getUser(u.id);
      expect(v).toStrictEqual({ ...u, ...patch });
      expect((await s.listUsers()).find((x) => x.id === u.id)).toStrictEqual(v);
      expect(await s.getUser(NO_ID)).toBeNull();
      expect(await s.getUserByEmail(`nobody-${uniq()}@example.com`)).toBeNull();
    });

    it("questionnaires: create, read back, update answers / complete / user, list by user", async () => {
      const u = await user();
      const answers = { zip: "11746", scenarioDays: 14, nested: { list: [1, 2, { b: "c" }] }, _step: 3 };
      const q = await s.createQuestionnaire({ user_id: null, session_nonce: `n-${uniq()}`, answers, complete: false, version: 2 });
      expect(q).toMatchObject({ user_id: null, answers, complete: false, version: 2 });
      expect(await s.getQuestionnaire(q.id)).toStrictEqual(q);
      await sleep(5);
      const answers2 = { ...answers, zip: "10001" };
      await s.updateQuestionnaire(q.id, { answers: answers2, complete: true, user_id: u.id });
      const q2 = (await s.getQuestionnaire(q.id))!;
      expect(q2).toStrictEqual({ ...q, answers: answers2, complete: true, user_id: u.id, updated_at: q2.updated_at });
      expect(Date.parse(q2.updated_at)).toBeGreaterThan(Date.parse(q.updated_at));
      expect((await s.listQuestionnaires(u.id)).find((x) => x.id === q.id)).toStrictEqual(q2);
      expect(await s.getQuestionnaire(NO_ID)).toBeNull();
    });

    it("plans: create with consent, checks and inventory; read back; update every patchable field; list newest first", async () => {
      const u = await user();
      const q = await s.createQuestionnaire({ user_id: u.id, session_nonce: `n-${uniq()}`, answers: { zip: "11746" }, complete: true, version: 2 });
      const p = await s.createPlan({ questionnaire_id: q.id, user_id: u.id, computed_quantities: computed, plan: planDoc, pdf_url: null, emailed_at: null, writer: "template", consent, checks: { "week-1": true }, inventory });
      expect(p).toMatchObject({ questionnaire_id: q.id, user_id: u.id, computed_quantities: computed, plan: planDoc, pdf_url: null, emailed_at: null, writer: "template", consent, checks: { "week-1": true }, inventory });
      expect(await s.getPlan(p.id)).toStrictEqual(p);

      // A plan made without consent, checks or inventory reads back with null / {} / null in both stores.
      const bare = await s.createPlan({ questionnaire_id: q.id, user_id: null, computed_quantities: computed, plan: planDoc, pdf_url: null, emailed_at: null, writer: "llm", consent: null });
      expect(await s.getPlan(bare.id)).toStrictEqual(bare);
      expect(bare).toMatchObject({ consent: null, checks: {}, inventory: null, user_id: null });

      const patch = { pdf_url: `${u.id}/${p.id}.pdf`, emailed_at: "2026-11-21T08:00:00.000Z", checks: { "week-1": true, "month-2": true }, inventory: { ...inventory, "radio": { status: "bought" as const } } };
      await s.updatePlan(p.id, patch);
      expect(await s.getPlan(p.id)).toStrictEqual({ ...p, ...patch });
      await s.updatePlan(p.id, { inventory: null });
      expect((await s.getPlan(p.id))!.inventory).toBeNull();
      await s.updatePlan(bare.id, { user_id: u.id });
      expect((await s.getPlan(bare.id))!.user_id).toBe(u.id);

      const listed = await s.listPlans(u.id);
      expect(listed.map((x) => x.id)).toEqual([bare.id, p.id]); // newest first
      expect(listed[1]).toStrictEqual(await s.getPlan(p.id));
      expect(await s.getPlan(NO_ID)).toBeNull();
    });

    it("places and reminder prefs: defaults, write, read back, clear", async () => {
      const u = await user();
      expect(await s.getPlaces(u.id)).toStrictEqual([]);
      const places: Place[] = [
        { id: "aunt", name: "Aunt Rosa's house", address: "12 Sample Lane, Town, ST", notes: "Key under the mat", distanceMiles: 120 },
        { id: "cabin", name: "Cabin", address: "Route 9, mile 4" },
      ];
      await s.setPlaces(u.id, places);
      expect(await s.getPlaces(u.id)).toStrictEqual(places);
      await s.setPlaces(u.id, []);
      expect(await s.getPlaces(u.id)).toStrictEqual([]);

      expect(await s.getReminderPrefs(u.id)).toStrictEqual(DEFAULT_REMINDER_PREFS);
      const prefs: ReminderPrefs = { enabled: true, types: { "co-test": { on: true, every: "monthly" }, "water-rotate": { on: false, every: "as_scheduled" } } };
      await s.setReminderPrefs(u.id, prefs);
      expect(await s.getReminderPrefs(u.id)).toStrictEqual(prefs);
      // The user row itself never carries places or prefs.
      expect(Object.keys((await s.getUser(u.id))!)).not.toContain("places_json");
    });

    it("tokens: single use, and expired tokens are refused", async () => {
      const u = await user();
      const expires = future();
      const hash = `h-${uniq()}`;
      await s.createToken({ token_hash: hash, user_id: u.id, purpose: "confirm", expires_at: expires, used_at: null });
      const t = (await s.consumeToken(hash))!;
      expect(t).toMatchObject({ token_hash: hash, user_id: u.id, purpose: "confirm", expires_at: expires });
      expect(Date.parse(t.used_at!)).toBeGreaterThan(Date.now() - 60_000);
      expect(await s.consumeToken(hash)).toBeNull();
      const old = `h-${uniq()}`;
      await s.createToken({ token_hash: old, user_id: u.id, purpose: "login", expires_at: "2020-01-01T00:00:00.000Z", used_at: null });
      expect(await s.consumeToken(old)).toBeNull();
      expect(await s.consumeToken(`h-${uniq()}`)).toBeNull();
    });

    it("catalog: seeding an empty catalog gives exactly the seed; edits, admin items and deletes read back", async () => {
      for (const i of await s.listCatalog()) await s.deleteCatalogItem(i.id);
      expect(await s.listCatalog()).toStrictEqual([]);
      for (const i of SEED_CATALOG) await s.upsertCatalogItem(i);
      expect(await s.listCatalog()).toStrictEqual(SEED_CATALOG);
      // Re-seeding is idempotent.
      for (const i of SEED_CATALOG) await s.upsertCatalogItem(i);
      expect(await s.listCatalog()).toStrictEqual(SEED_CATALOG);

      const edited: CatalogItem = { ...SEED_CATALOG.find((i) => i.id === "generator-standby")!, name: "Edited standby", priceLow: 4999.5, active: false, notes: "admin edit" };
      const added: CatalogItem = {
        id: "zz-admin-item", category: "Test", name: "Added in the admin", spec: "Every field set", models: ["M1"], priceLow: 1, priceHigh: 2, tier: 4, phase: 3, priority: 99,
        qty: 3, tags: ["mobility", "!apartment"], essential: true, group: "two-way", level: "premium", excludes: ["frs-radios"], requiresGroup: "generator", bundle: true,
        affiliateUrl: "https://example.com/item", notes: "", active: true, reviewedAt: "2026-11-25",
      };
      await s.upsertCatalogItem(edited);
      await s.upsertCatalogItem(added);
      const after = await s.listCatalog();
      expect(after.find((i) => i.id === edited.id)).toStrictEqual(edited);
      expect(after.at(-1)).toStrictEqual(added); // admin-added items come after the seed (one order for every store)
      await s.deleteCatalogItem(added.id);
      await s.upsertCatalogItem(SEED_CATALOG.find((i) => i.id === "generator-standby")!);
      expect(await s.listCatalog()).toStrictEqual(SEED_CATALOG);
    });

    it("rule constants: save, latest, versions increase", async () => {
      const r1 = await s.saveRuleConstants({ water: { adultGalPerDay: 1.25 }, list: [1, 2] }, "contract");
      expect(r1).toMatchObject({ overrides: { water: { adultGalPerDay: 1.25 }, list: [1, 2] }, created_by: "contract" });
      expect(await s.latestRuleConstants()).toStrictEqual(r1);
      const r2 = await s.saveRuleConstants({ water: { adultGalPerDay: 1 } }, "contract-2");
      expect(r2.version).toBeGreaterThan(r1.version);
      expect(await s.latestRuleConstants()).toStrictEqual(r2);
    });

    it("email events: add, list in time order with every field, has", async () => {
      const u = await user();
      const e1 = { user_id: u.id, type: "sent:plan", provider_id: "re_1", sent_at: "2026-11-20T10:00:00.000Z" };
      const e2 = { user_id: u.id, type: "affiliate_click", provider_id: null, sent_at: "2026-11-20T09:00:00.000Z" };
      await s.addEmailEvent(e1);
      await s.addEmailEvent(e2);
      const listed = await s.listEmailEvents(u.id);
      expect(listed.map(({ id, ...rest }) => (expect(id).toBeTruthy(), rest))).toStrictEqual([e2, e1]);
      expect(await s.hasEmailEvent(u.id, "sent:plan")).toBe(true);
      expect(await s.hasEmailEvent(u.id, "sent:followup_day3")).toBe(false);
    });

    it("rate limit: a fixed window allows exactly the limit", async () => {
      const key = `rl-${uniq()}`;
      expect([await s.rateLimit(key, 2, 60), await s.rateLimit(key, 2, 60), await s.rateLimit(key, 2, 60)]).toEqual([true, true, false]);
    });

    it("stats: same shape, and counts move with the data", async () => {
      const before = await s.stats();
      const u = await user();
      await s.addEmailEvent({ user_id: u.id, type: "ai_copy", provider_id: null, sent_at: new Date().toISOString() });
      await s.addEmailEvent({ user_id: u.id, type: "affiliate_click", provider_id: "co-alarm", sent_at: new Date().toISOString() });
      const after = await s.stats();
      expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
      expect(after.signups).toBe(before.signups + 1);
      expect(after.aiCopies).toBe(before.aiCopies + 1);
      expect(after.affiliateClicks).toBe(before.affiliateClicks + 1);
    });

    it("stale anonymous questionnaires go, with their plans; questionnaires with an email stay", async () => {
      const u = await user();
      const anon = await s.createQuestionnaire({ user_id: null, session_nonce: `n-${uniq()}`, answers: { zip: "1" }, complete: true, version: 2 });
      const anonPlan = await s.createPlan({ questionnaire_id: anon.id, user_id: null, computed_quantities: computed, plan: planDoc, pdf_url: null, emailed_at: null, writer: "template", consent: null });
      const kept = await s.createQuestionnaire({ user_id: u.id, session_nonce: `n-${uniq()}`, answers: { zip: "2" }, complete: false, version: 2 });
      await sleep(5);
      expect(await s.deleteStaleAnonQuestionnaires(-1)).toBeGreaterThanOrEqual(1); // cutoff in the future: every anonymous one
      expect(await s.getQuestionnaire(anon.id)).toBeNull();
      expect(await s.getPlan(anonPlan.id)).toBeNull();
      expect(await s.getQuestionnaire(kept.id)).not.toBeNull();
    });

    it("deleting a user removes their questionnaires, plans, tokens, events, places and prefs", async () => {
      const u = await user();
      const q = await s.createQuestionnaire({ user_id: u.id, session_nonce: `n-${uniq()}`, answers: { zip: "3" }, complete: true, version: 2 });
      const p = await s.createPlan({ questionnaire_id: q.id, user_id: u.id, computed_quantities: computed, plan: planDoc, pdf_url: null, emailed_at: null, writer: "template", consent, inventory });
      const hash = `h-${uniq()}`;
      await s.createToken({ token_hash: hash, user_id: u.id, purpose: "login", expires_at: future(), used_at: null });
      await s.addEmailEvent({ user_id: u.id, type: "sent:plan", provider_id: null, sent_at: new Date().toISOString() });
      await s.setPlaces(u.id, [{ id: "home2", name: "Friend", address: "1 Elm St" }]);
      await s.setReminderPrefs(u.id, { enabled: true, types: {} });
      await s.deleteUserCascade(u.id);
      expect(await s.getUser(u.id)).toBeNull();
      expect(await s.getQuestionnaire(q.id)).toBeNull();
      expect(await s.getPlan(p.id)).toBeNull();
      expect(await s.consumeToken(hash)).toBeNull();
      expect(await s.listEmailEvents(u.id)).toStrictEqual([]);
      expect(await s.getPlaces(u.id)).toStrictEqual([]);
      expect(await s.getReminderPrefs(u.id)).toStrictEqual(DEFAULT_REMINDER_PREFS);
    });
  });
}
