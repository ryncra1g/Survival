import { NextResponse } from "next/server";
import { AnswersSchema, GEAR_SLOTS, GearLevel } from "@/lib/answers/schema";
import { loadPlanFor } from "@/lib/server/access";
import { env } from "@/lib/server/env";
import { sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

export const maxDuration = 60;

/**
 * À la carte: switch one gear slot (water, generator, go-bag…) to essential / standard / premium.
 * Rebuilds the plan with that choice (quantities still come from the rules), keeps checklist ticks,
 * and returns to the same section. Plain form POST, so it works without JavaScript.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new Response("Please reload the page and try again.", { status: 403 });
  const { id } = await params;
  const session = await getSession();
  const plan = await loadPlanFor(session, id);
  if (!plan || !session) return NextResponse.redirect(new URL("/account", env.appUrl), 303);
  const form = await req.formData();
  const group = String(form.get("group") ?? "");
  const level = GearLevel.safeParse(form.get("level"));
  const back = String(form.get("back") ?? "gear").replace(/[^a-z0-9-]/g, "");
  if (!(GEAR_SLOTS as readonly string[]).includes(group) || !level.success) return NextResponse.redirect(new URL(`/plan/${plan.id}#${back}`, env.appUrl), 303);
  if (!(await limit(`choose:${session.nonce}`, 60, 3600)) || !(await limit(`choose:ip:${await clientIp()}`, LIMITS.generatePerIpHour * 3, 3600)))
    return new Response("Too many changes in a short time. Try again shortly.", { status: 429 });

  const source = await store.getQuestionnaire(plan.questionnaire_id);
  const prev = AnswersSchema.safeParse(source?.answers);
  if (!prev.success) return NextResponse.redirect(new URL(`/plan/${plan.id}#${back}`, env.appUrl), 303);
  const answers = { ...prev.data, gearChoices: { ...(prev.data.gearChoices ?? {}), [group]: level.data } };
  const q = await store.createQuestionnaire({ user_id: plan.user_id, session_nonce: session.nonce, answers, complete: true, version: 1 });
  const next = await buildAndSavePlan(plan.user_id, q.id, answers);
  if (plan.checks && Object.keys(plan.checks).length) await store.updatePlan(next.id, { checks: plan.checks });
  return NextResponse.redirect(new URL(`/plan/${next.id}#${back}`, env.appUrl), 303);
}
