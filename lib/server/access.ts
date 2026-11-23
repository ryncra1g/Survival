import "server-only";
import { isId } from "@/lib/ids";
import type { Session } from "./session";
import { store, type PlanRow, type QuestionnaireRow } from "./store";

/**
 * Authorization: full sessions see all their data; the browser that built a plan sees it while it isn't in a
 * confirmed account. Security review M2: once the owner has confirmed their email, only that account's full
 * sessions can open it, so a shared computer (or someone who planted the plan) loses access.
 */
async function nonceStillCounts(userId: string | null): Promise<boolean> {
  if (!userId) return true;
  return !(await store.getUser(userId))?.double_opt_in_at;
}

export async function canAccessQuestionnaire(s: Session | null, q: QuestionnaireRow | null): Promise<boolean> {
  if (!s || !q) return false;
  if (s.scope === "full" && !!q.user_id && q.user_id === s.uid) return true;
  return q.session_nonce === s.nonce && (await nonceStillCounts(q.user_id)); // the browser session that created it
}

export async function loadPlanFor(s: Session | null, planId: string): Promise<PlanRow | null> {
  if (!s || !isId(planId)) return null;
  const p = await store.getPlan(planId);
  if (!p) return null;
  if (s.scope === "full" && p.user_id && p.user_id === s.uid) return p;
  const q = await store.getQuestionnaire(p.questionnaire_id);
  return q && q.session_nonce === s.nonce && (await nonceStillCounts(p.user_id)) ? p : null; // the browser that built it
}
