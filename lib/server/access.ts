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
  if (!p || p.user_id !== s.uid) return null;
  if (s.scope === "full") return p;
  const q = await store.getQuestionnaire(p.questionnaire_id);
  return q && q.session_nonce === s.nonce ? p : null;
}
