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
