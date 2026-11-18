import { DraftAnswersSchema } from "@/lib/answers/schema";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/** Autosave (partial answers). Answers travel in the body only — never in URLs. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const session = await getSession();
  const { id } = await params;
  const q = /^[0-9a-f-]{36}$/i.test(id) ? await store.getQuestionnaire(id) : null;
  if (!(await canAccessQuestionnaire(session, q))) return err("Not found", 404);
  if (!(await limit(`save:${await clientIp()}`, LIMITS.saveAnswersPerIpMinute, 60))) return err("Slow down", 429);
  const body = await readJson<{ answers: unknown }>(req, 20_000);
  const parsed = DraftAnswersSchema.safeParse(body?.answers);
  if (!parsed.success) return err("Invalid answers");
  await store.updateQuestionnaire(id, { answers: parsed.data });
  return json({ ok: true });
}
