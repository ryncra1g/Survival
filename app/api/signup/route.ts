import { z } from "zod";
import { DEFAULT_ANSWERS } from "@/lib/answers/schema";
import { sendConfirm, sendLogin } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/env";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession, setSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import { verifyTurnstile } from "@/lib/server/turnstile";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true),
  turnstileToken: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot: must be empty
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return err("Enter a valid email and tick the consent box.");
  const ip = await clientIp();
  if (!(await limit(`signup:ip:${ip}`, LIMITS.signupPerIpHour, 3600))) return err("Too many attempts. Try again in an hour.", 429);
  if (!(await verifyTurnstile(body.data.turnstileToken, ip))) return err("Bot check failed. Refresh and try again.", 400);

  const email = body.data.email;
  let user = await store.getUserByEmail(email);
  if (!user) user = await store.createUser({ email, consent_at: new Date().toISOString(), double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: true });

  // Reuse an existing full session for this user; otherwise start a draft-scope session.
  const existing = await getSession();
  const session = existing && existing.uid === user.id ? existing : await setSession(user.id, "draft");
  const q = await store.createQuestionnaire({ user_id: user.id, session_nonce: session.nonce, answers: { ...DEFAULT_ANSWERS }, complete: false, version: 1 });

  let link: string | null = null;
  if (session.scope !== "full" && (await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600)))
    link = user.double_opt_in_at ? await sendLogin(user.id, email) : await sendConfirm(user.id, email);

  return json({ questionnaireId: q.id, confirmed: !!user.double_opt_in_at, ...(isDemo && link ? { demoLink: link } : {}) });
}
