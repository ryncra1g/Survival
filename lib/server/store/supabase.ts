import type { PlanConsent } from "@/lib/legal";
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { catIn, catOut, type CatalogDb } from "@/lib/catalog/db";
import { env } from "../env";
import { seal, unseal, type Sealed } from "../crypto";
import { clickStats } from "./file";
import type { EmailEventRow, PlanRow, QuestionnaireRow, RuleConstantsRow, Stats, Store, UserRow } from "./types";
import { AI_COPY_EVENT } from "./types";

/**
 * Production store on Supabase Postgres, using the service-role key from the server only.
 * RLS is enabled on every table with no anon/authenticated policies, so the public API
 * can't read anything; all access goes through these server functions.
 */
let client: SupabaseClient | null = null;
const db = () => (client ??= createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } }));

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(`[supabase] ${r.error.message}`);
  return r.data;
}

type QDb = Omit<QuestionnaireRow, "answers"> & { answers_json: Sealed };
type PDb = Omit<PlanRow, "computed_quantities" | "plan" | "consent"> & { computed_quantities_json: Sealed; plan_json: Sealed; consent_json?: Sealed | null };
const qOut = ({ answers_json, ...r }: QDb): QuestionnaireRow => ({ ...r, answers: unseal(answers_json) });
const pOut = ({ computed_quantities_json, plan_json, consent_json, ...r }: PDb): PlanRow => ({
  ...r,
  computed_quantities: unseal(computed_quantities_json),
  plan: unseal(plan_json),
  consent: consent_json ? unseal<PlanConsent>(consent_json) : null,
});

async function count(table: string, filter?: (q: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>) => unknown): Promise<number> {
  let q = db().from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q) as typeof q;
  const r = await q;
  if (r.error) throw new Error(r.error.message);
  return r.count ?? 0;
}

export const supabaseStore: Store = {
  async getUserByEmail(email) {
    return must(await db().from("users").select("*").eq("email", email.toLowerCase()).maybeSingle()) as UserRow | null;
  },
  async getUser(id) {
    return must(await db().from("users").select("*").eq("id", id).maybeSingle()) as UserRow | null;
  },
  async createUser(u) {
    return must(await db().from("users").insert({ ...u, email: u.email.toLowerCase() }).select().single()) as UserRow;
  },
  async updateUser(id, patch) {
    must(await db().from("users").update(patch).eq("id", id));
  },
  async listUsers() {
    return must(await db().from("users").select("*")) as UserRow[];
  },
  async deleteUserCascade(id) {
    // FK ON DELETE CASCADE removes questionnaires, plans, tokens and email events; storage objects removed here.
    const plans = must(await db().from("plans").select("pdf_url").eq("user_id", id)) as { pdf_url: string | null }[];
    const paths = plans.map((p) => p.pdf_url).filter((x): x is string => !!x);
    if (paths.length) await db().storage.from("plans").remove(paths);
    must(await db().from("users").delete().eq("id", id));
  },
  async createQuestionnaire({ answers, ...q }) {
    return qOut(must(await db().from("questionnaires").insert({ ...q, answers_json: seal(answers) }).select().single()) as QDb);
  },
  async getQuestionnaire(id) {
    const r = must(await db().from("questionnaires").select("*").eq("id", id).maybeSingle()) as QDb | null;
    return r ? qOut(r) : null;
  },
  async updateQuestionnaire(id, patch) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.answers) row.answers_json = seal(patch.answers);
    if (patch.complete !== undefined) row.complete = patch.complete;
    if (patch.user_id !== undefined) row.user_id = patch.user_id;
    must(await db().from("questionnaires").update(row).eq("id", id));
  },
  async deleteStaleAnonQuestionnaires(days) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const r = await db().from("questionnaires").delete({ count: "exact" }).is("user_id", null).lt("updated_at", cutoff);
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  },
  async listQuestionnaires(userId) {
    return (must(await db().from("questionnaires").select("*").eq("user_id", userId)) as QDb[]).map(qOut);
  },
  async createPlan({ computed_quantities, plan, consent, ...p }) {
    return pOut(must(await db().from("plans").insert({ ...p, computed_quantities_json: seal(computed_quantities), plan_json: seal(plan), consent_json: consent ? seal(consent) : null }).select().single()) as PDb);
  },
  async getPlan(id) {
    const r = must(await db().from("plans").select("*").eq("id", id).maybeSingle()) as PDb | null;
    return r ? pOut(r) : null;
  },
  async updatePlan(id, patch) {
    must(await db().from("plans").update(patch).eq("id", id));
  },
  async listPlans(userId) {
    return (must(await db().from("plans").select("*").eq("user_id", userId).order("created_at", { ascending: false })) as PDb[]).map(pOut);
  },
  async createToken(t) {
    must(await db().from("auth_tokens").insert(t));
  },
  async consumeToken(hash) {
    const r = await db()
      .from("auth_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", hash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select()
      .maybeSingle();
    return must(r);
  },
  async listCatalog() {
    return (must(await db().from("gear_catalog").select("*").order("phase").order("priority")) as CatalogDb[]).map(catOut);
  },
  async upsertCatalogItem(item) {
    must(await db().from("gear_catalog").upsert(catIn(item)));
  },
  async deleteCatalogItem(id) {
    must(await db().from("gear_catalog").delete().eq("id", id));
  },
  async latestRuleConstants() {
    return must(await db().from("rule_constants").select("*").order("version", { ascending: false }).limit(1).maybeSingle());
  },
  async saveRuleConstants(overrides, by) {
    return must(await db().from("rule_constants").insert({ overrides, created_by: by }).select().single()) as RuleConstantsRow;
  },
  async addEmailEvent(e) {
    must(await db().from("email_events").insert(e));
  },
  async hasEmailEvent(userId, type) {
    return (await count("email_events", (q) => q.eq("user_id", userId).eq("type", type))) > 0;
  },
  async listEmailEvents(userId) {
    return (must(await db().from("email_events").select("*").eq("user_id", userId)) ?? []) as EmailEventRow[];
  },
  async rateLimit(key, limit, windowSec) {
    const r = await db().rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSec });
    if (r.error) throw new Error(r.error.message);
    return r.data as boolean;
  },
  async stats(): Promise<Stats> {
    const clicks = (must(await db().from("email_events").select("type, provider_id").eq("type", "affiliate_click").limit(50_000)) ?? []) as { type: string; provider_id: string | null }[];
    const [signups, confirmed, started, completed, plans, sent, opens, unsub, withEmail, aiCopies] = await Promise.all([
      count("users"),
      count("users", (q) => q.not("double_opt_in_at", "is", null)),
      count("questionnaires"),
      count("questionnaires", (q) => q.eq("complete", true)),
      count("plans"),
      count("email_events", (q) => q.like("type", "sent:%")),
      count("email_events", (q) => q.eq("type", "opened")),
      count("users", (q) => q.not("unsubscribed_at", "is", null)),
      count("plans", (q) => q.not("user_id", "is", null)),
      count("email_events", (q) => q.eq("type", AI_COPY_EVENT)),
    ]);
    return { signups, confirmed, questionnairesStarted: started, questionnairesCompleted: completed, plansGenerated: plans, emailsSent: sent, emailOpens: opens, unsubscribed: unsub, plansWithEmail: withEmail, aiCopies, ...clickStats(clicks) };
  },
};
