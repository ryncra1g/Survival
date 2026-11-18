import { after } from "next/server";
import { AnswersSchema, migrateAnswers } from "@/lib/answers/schema";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan, emailPlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

export const maxDuration = 60;

/** Build the plan for a questionnaire this browser started (email was given on the front page). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const session = await getSession();
  const { id } = await params;
  const q = /^[0-9a-f-]{36}$/i.test(id) ? await store.getQuestionnaire(id) : null;
  if (!q || !(await canAccessQuestionnaire(session, q))) return err("Not found", 404);
  const body = await readJson<{ answers?: unknown }>(req, 20_000);
  const parsed = AnswersSchema.safeParse(migrateAnswers(body?.answers ?? q.answers));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Some answers are missing");
  const ip = await clientIp();

  const user = q.user_id ? await store.getUser(q.user_id) : null;
  if (!user) return err("Start from the front page with your email.", 400);

  if (!(await limit(`gen:user:${user.id}`, LIMITS.generatePerUserDay, 86_400)) || !(await limit(`gen:ip:${ip}`, LIMITS.generatePerIpHour, 3600)))
    return err("You've generated several plans today. Try again tomorrow.", 429);

  await store.updateQuestionnaire(id, { answers: parsed.data });
  const plan = await buildAndSavePlan(user.id, id, parsed.data);
  // Confirmed addresses get the plan right away, even if they confirmed on another device.
  const emailNow = !!user.double_opt_in_at;
  const u = user;
  if (emailNow) after(() => emailPlan(plan, u).catch((e) => console.error("[mail] plan", e)));
  return json({ planId: plan.id, emailed: emailNow, confirmed: !!user.double_opt_in_at });
}
