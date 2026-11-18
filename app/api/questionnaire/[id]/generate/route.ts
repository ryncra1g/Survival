import { after } from "next/server";
import { AnswersSchema, migrateAnswers } from "@/lib/answers/schema";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { err, json, readJson, requireSession, sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan, emailPlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { store } from "@/lib/server/store";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession();
  const { id } = await params;
  const q = auth ? await store.getQuestionnaire(id) : null;
  if (!auth || !q || !(await canAccessQuestionnaire(auth.session, q))) return err("Not found", 404);

  const body = await readJson<{ answers?: unknown }>(req, 20_000);
  const parsed = AnswersSchema.safeParse(migrateAnswers(body?.answers ?? q.answers));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Some answers are missing");
  if (!(await limit(`gen:user:${auth.user.id}`, LIMITS.generatePerUserDay, 86_400)) || !(await limit(`gen:ip:${await clientIp()}`, LIMITS.generatePerIpHour, 3600)))
    return err("You've generated several plans today. Try again tomorrow.", 429);

  await store.updateQuestionnaire(id, { answers: parsed.data });
  const plan = await buildAndSavePlan(auth.user.id, id, parsed.data);
  const user = auth.user;
  // Email only goes to confirmed addresses. Unconfirmed users get it when they click the confirm link.
  if (user.double_opt_in_at && auth.session.scope === "full") after(() => emailPlan(plan, user).catch((e) => console.error("[mail] plan", e)));
  return json({ planId: plan.id, emailed: !!user.double_opt_in_at && auth.session.scope === "full" });
}
