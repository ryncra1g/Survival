import { after } from "next/server";
import { ERR } from "@/lib/errors";
import { AnswersSchema, migrateAnswers } from "@/lib/answers/schema";
import { checkConsent, consentRecord, type ConsentInput } from "@/lib/legal";
import { isId } from "@/lib/ids";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan, emailPlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import type { StreamLine } from "@/lib/plan/stages";

export const maxDuration = 60;

/** Build the plan for a questionnaire this browser started (email was given on the front page). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const session = await getSession();
  const { id } = await params;
  const q = isId(id) ? await store.getQuestionnaire(id) : null;
  if (!q || !(await canAccessQuestionnaire(session, q))) return err("Not found", 404);
  const body = await readJson<{ answers?: unknown; consent?: ConsentInput }>(req, 20_000);
  const parsed = AnswersSchema.safeParse(migrateAnswers(body?.answers ?? q.answers));
  if (!parsed.success) return err(ERR.answers);
  const consentError = checkConsent(parsed.data, body?.consent);
  if (consentError) return err(consentError);
  const ip = await clientIp();

  // Email is optional: plans can be built anonymously and claimed later from the plan page.
  const user = q.user_id ? await store.getUser(q.user_id) : null;
  const who = user ? `user:${user.id}` : `nonce:${session!.nonce}`;
  if (!(await limit(`gen:${who}`, LIMITS.generatePerUserDay, 86_400)) || !(await limit(`gen:ip:${ip}`, LIMITS.generatePerIpHour, 3600)))
    return err("You've generated several plans today. Try again tomorrow.", 429);

  await store.updateQuestionnaire(id, { answers: parsed.data });
  // Confirmed addresses get the plan right away, even if they confirmed on another device.
  const emailNow = !!user?.double_opt_in_at;
  const finish = (plan: Awaited<ReturnType<typeof buildAndSavePlan>>) => {
    if (user && emailNow) after(() => emailPlan(plan, user).catch((e) => console.error("[mail] plan", e)));
    return { planId: plan.id, emailed: emailNow };
  };

  // D11: with Accept: application/x-ndjson, stream each build stage as it actually finishes.
  if ((req.headers.get("accept") ?? "").includes("application/x-ndjson")) {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(c) {
        const send = (line: StreamLine) => c.enqueue(enc.encode(JSON.stringify(line) + "\n"));
        try {
          const plan = await buildAndSavePlan(user?.id ?? null, id, parsed.data, consentRecord(parsed.data), (stage) => send({ stage }));
          send(finish(plan));
        } catch (e) {
          console.error("[generate]", e);
          send({ error: ERR.build });
        }
        c.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  }

  const plan = await buildAndSavePlan(user?.id ?? null, id, parsed.data, consentRecord(parsed.data));
  return json(finish(plan));
}
