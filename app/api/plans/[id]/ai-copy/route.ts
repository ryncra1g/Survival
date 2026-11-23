import { loadPlanFor } from "@/lib/server/access";
import { err, json, sameOrigin } from "@/lib/server/http";
import { LIMITS, clientIp, limit } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import { AI_COPY_EVENT } from "@/lib/server/store/types";

/**
 * D13: count a "Copy for your AI assistant" click. Only the plan id is recorded, never the copied text.
 * Rate-limited per browser (session nonce) and per IP; at most one event per plan per UTC day is recorded,
 * so repeated clicks can't inflate the admin count.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const session = await getSession();
  const ip = await clientIp();
  if (!(await limit(`aicopy:${session?.nonce ?? "none"}`, LIMITS.aiCopyPerNonceHour, 3600)) || !(await limit(`aicopy:ip:${ip}`, LIMITS.aiCopyPerIpHour, 3600)))
    return err("Too many requests. Try again later.", 429);
  const { id } = await params;
  const plan = await loadPlanFor(session, id);
  if (!plan) return err("Not found", 404);
  const day = new Date().toISOString().slice(0, 10);
  if (await limit(`aicopy:plan:${plan.id}:${day}`, 1, 86_400))
    await store.addEmailEvent({ user_id: plan.user_id, type: AI_COPY_EVENT, provider_id: plan.id, sent_at: new Date().toISOString() });
  return json({ ok: true });
}
