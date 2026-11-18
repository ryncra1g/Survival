import { after } from "next/server";
import { z } from "zod";
import { AnswersSchema, migrateAnswers } from "@/lib/answers/schema";
import { canAccessQuestionnaire } from "@/lib/server/access";
import { sendConfirm, sendLogin } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/env";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { buildAndSavePlan, emailPlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession, setSession } from "@/lib/server/session";
import { store, type UserRow } from "@/lib/server/store";
import { verifyTurnstile } from "@/lib/server/turnstile";

export const maxDuration = 60;

const Contact = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true),
  turnstileToken: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot: must be empty
});

/**
 * Build the plan. If the questionnaire isn't linked to anyone yet, the body must also carry
 * the email + consent from the end-of-questionnaire screen (bot-checked and rate-limited).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  let session = await getSession();
  const { id } = await params;
  const q = /^[0-9a-f-]{36}$/i.test(id) ? await store.getQuestionnaire(id) : null;
  if (!q || !(await canAccessQuestionnaire(session, q))) return err("Not found", 404);
  const body = await readJson<{ answers?: unknown; contact?: unknown }>(req, 20_000);
  const parsed = AnswersSchema.safeParse(migrateAnswers(body?.answers ?? q.answers));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Some answers are missing");
  const ip = await clientIp();

  let user: UserRow | null = q.user_id ? await store.getUser(q.user_id) : null;
  let demoLink: string | null = null;
  if (!user) {
    const contact = Contact.safeParse(body?.contact);
    if (!contact.success) return err("Enter a valid email and tick the box so we can send your plan.");
    if (!(await limit(`signup:ip:${ip}`, LIMITS.signupPerIpHour, 3600))) return err("Too many attempts. Try again in an hour.", 429);
    if (!(await verifyTurnstile(contact.data.turnstileToken, ip))) return err("Bot check failed. Refresh and try again.");
    const email = contact.data.email;
    user = (await store.getUserByEmail(email)) ?? (await store.createUser({ email, consent_at: new Date().toISOString(), double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: true }));
    await store.updateQuestionnaire(id, { user_id: user.id });
    // Same browser nonce, now tied to this user at "draft" scope: it can see only this plan until the email is confirmed.
    if (!session || session.scope !== "full" || session.uid !== user.id) session = await setSession(user.id, "draft", session?.nonce);
    if (await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600)) demoLink = user.double_opt_in_at ? await sendLogin(user.id, email) : await sendConfirm(user.id, email);
  }

  if (!(await limit(`gen:user:${user.id}`, LIMITS.generatePerUserDay, 86_400)) || !(await limit(`gen:ip:${ip}`, LIMITS.generatePerIpHour, 3600)))
    return err("You've generated several plans today. Try again tomorrow.", 429);

  await store.updateQuestionnaire(id, { answers: parsed.data });
  const plan = await buildAndSavePlan(user.id, id, parsed.data);
  const emailNow = !!user.double_opt_in_at && session?.scope === "full";
  const u = user;
  if (emailNow) after(() => emailPlan(plan, u).catch((e) => console.error("[mail] plan", e)));
  return json({ planId: plan.id, emailed: emailNow, confirmed: !!user.double_opt_in_at, ...(isDemo && demoLink ? { demoLink } : {}) });
}
