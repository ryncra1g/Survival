import "server-only";
import fs from "node:fs";
import path from "node:path";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import type { CatalogItem } from "@/lib/catalog/types";
import { newId, seal, unseal, type Sealed } from "../crypto";
import type { EmailEventRow, PlanRow, QuestionnaireRow, RuleConstantsRow, Stats, Store, TokenRow, UserRow } from "./types";

/**
 * Demo/dev store: a JSON file at .data/db.json. Same encryption as production
 * (answers and plans are sealed). Not for production — single process, no locking.
 */
type StoredQ = Omit<QuestionnaireRow, "answers"> & { answers_json: Sealed };
type StoredP = Omit<PlanRow, "computed_quantities" | "plan"> & { computed_quantities_json: Sealed; plan_json: Sealed };
interface DB {
  users: UserRow[];
  questionnaires: StoredQ[];
  plans: StoredP[];
  tokens: TokenRow[];
  gear_catalog: CatalogItem[];
  rule_constants: RuleConstantsRow[];
  email_events: EmailEventRow[];
  rate_limits: Record<string, { count: number; reset: number }>;
}

const FILE = path.join(process.env.READYPLAN_DATA_DIR || path.join(process.cwd(), ".data"), "db.json");
const now = () => new Date().toISOString();

export function clickStats(events: { type: string; provider_id: string | null }[]) {
  const counts = new Map<string, number>();
  for (const e of events) if (e.type === "affiliate_click" && e.provider_id) counts.set(e.provider_id, (counts.get(e.provider_id) ?? 0) + 1);
  return {
    affiliateClicks: [...counts.values()].reduce((t, n) => t + n, 0),
    topClicks: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([itemId, clicks]) => ({ itemId, clicks })),
  };
}

function load(): DB {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
  } catch {
    return { users: [], questionnaires: [], plans: [], tokens: [], gear_catalog: SEED_CATALOG, rule_constants: [], email_events: [], rate_limits: {} };
  }
}
function save(db: DB) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE + ".tmp", JSON.stringify(db));
  fs.renameSync(FILE + ".tmp", FILE);
}
function tx<T>(fn: (db: DB) => T): T {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}

const qOut = (q: StoredQ): QuestionnaireRow => {
  const { answers_json, ...rest } = q;
  return { ...rest, answers: unseal(answers_json) };
};
const pOut = (p: StoredP): PlanRow => {
  const { computed_quantities_json, plan_json, ...rest } = p;
  return { ...rest, computed_quantities: unseal(computed_quantities_json), plan: unseal(plan_json) };
};

export const fileStore: Store = {
  async getUserByEmail(email) {
    return load().users.find((u) => u.email === email.toLowerCase()) ?? null;
  },
  async getUser(id) {
    return load().users.find((u) => u.id === id) ?? null;
  },
  async createUser(u) {
    return tx((db) => {
      const row: UserRow = { ...u, email: u.email.toLowerCase(), id: newId(), created_at: now() };
      db.users.push(row);
      return row;
    });
  },
  async updateUser(id, patch) {
    tx((db) => {
      const u = db.users.find((x) => x.id === id);
      if (u) Object.assign(u, patch);
    });
  },
  async listUsers() {
    return load().users;
  },
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
  async createQuestionnaire(q) {
    return tx((db) => {
      const { answers, ...rest } = q;
      const row: StoredQ = { ...rest, answers_json: seal(answers), id: newId(), created_at: now(), updated_at: now() };
      db.questionnaires.push(row);
      return qOut(row);
    });
  },
  async getQuestionnaire(id) {
    const q = load().questionnaires.find((x) => x.id === id);
    return q ? qOut(q) : null;
  },
  async updateQuestionnaire(id, patch) {
    tx((db) => {
      const q = db.questionnaires.find((x) => x.id === id);
      if (!q) return;
      if (patch.answers) q.answers_json = seal(patch.answers);
      if (patch.complete !== undefined) q.complete = patch.complete;
      if (patch.user_id !== undefined) q.user_id = patch.user_id;
      q.updated_at = now();
    });
  },
  async deleteStaleAnonQuestionnaires(days) {
    return tx((db) => {
      const cutoff = Date.now() - days * 86_400_000;
      const before = db.questionnaires.length;
      const gone = new Set(db.questionnaires.filter((q) => !q.user_id && Date.parse(q.updated_at) <= cutoff).map((q) => q.id));
      db.questionnaires = db.questionnaires.filter((q) => !gone.has(q.id));
      db.plans = db.plans.filter((p) => !gone.has(p.questionnaire_id));
      return before - db.questionnaires.length;
    });
  },
  async listQuestionnaires(userId) {
    return load().questionnaires.filter((q) => q.user_id === userId).map(qOut);
  },
  async createPlan(p) {
    return tx((db) => {
      const { computed_quantities, plan, ...rest } = p;
      const row: StoredP = { ...rest, computed_quantities_json: seal(computed_quantities), plan_json: seal(plan), id: newId(), created_at: now() };
      db.plans.push(row);
      return pOut(row);
    });
  },
  async getPlan(id) {
    const p = load().plans.find((x) => x.id === id);
    return p ? pOut(p) : null;
  },
  async updatePlan(id, patch) {
    tx((db) => {
      const p = db.plans.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });
  },
  async listPlans(userId) {
    return load()
      .plans.filter((p) => p.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(pOut);
  },
  async createToken(t) {
    tx((db) => void db.tokens.push(t));
  },
  async consumeToken(hash) {
    return tx((db) => {
      const t = db.tokens.find((x) => x.token_hash === hash);
      if (!t || t.used_at || new Date(t.expires_at) < new Date()) return null;
      t.used_at = now();
      return t;
    });
  },
  async listCatalog() {
    return load().gear_catalog;
  },
  async upsertCatalogItem(item) {
    tx((db) => {
      const i = db.gear_catalog.findIndex((x) => x.id === item.id);
      if (i >= 0) db.gear_catalog[i] = item;
      else db.gear_catalog.push(item);
    });
  },
  async deleteCatalogItem(id) {
    tx((db) => void (db.gear_catalog = db.gear_catalog.filter((x) => x.id !== id)));
  },
  async latestRuleConstants() {
    const r = load().rule_constants;
    return r.length ? r[r.length - 1] : null;
  },
  async saveRuleConstants(overrides, by) {
    return tx((db) => {
      const row: RuleConstantsRow = { version: db.rule_constants.length + 1, overrides, created_by: by, created_at: now() };
      db.rule_constants.push(row);
      return row;
    });
  },
  async addEmailEvent(e) {
    tx((db) => void db.email_events.push({ ...e, id: newId() }));
  },
  async hasEmailEvent(userId, type) {
    return load().email_events.some((e) => e.user_id === userId && e.type === type);
  },
  async listEmailEvents(userId) {
    return load().email_events.filter((e) => e.user_id === userId);
  },
  async rateLimit(key, limit, windowSec) {
    return tx((db) => {
      const t = Date.now();
      const r = db.rate_limits[key];
      if (!r || r.reset < t) {
        db.rate_limits[key] = { count: 1, reset: t + windowSec * 1000 };
        return true;
      }
      r.count++;
      return r.count <= limit;
    });
  },
  async stats(): Promise<Stats> {
    const db = load();
    const sent = db.email_events.filter((e) => e.type.startsWith("sent:")).length;
    return {
      signups: db.users.length,
      confirmed: db.users.filter((u) => u.double_opt_in_at).length,
      questionnairesStarted: db.questionnaires.length,
      questionnairesCompleted: db.questionnaires.filter((q) => q.complete).length,
      plansGenerated: db.plans.length,
      emailsSent: sent,
      emailOpens: db.email_events.filter((e) => e.type === "opened").length,
      unsubscribed: db.users.filter((u) => u.unsubscribed_at).length,
      plansWithEmail: db.plans.filter((p) => p.user_id).length,
      ...clickStats(db.email_events),
    };
  },
};
