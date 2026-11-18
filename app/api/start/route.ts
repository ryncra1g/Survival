import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_ANSWERS } from "@/lib/answers/schema";
import { sendConfirm, sendLogin } from "@/lib/server/auth";
import { env, isDemo } from "@/lib/server/env";
import { sameOrigin } from "@/lib/server/http";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession, setSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import { verifyTurnstile } from "@/lib/server/turnstile";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.union([z.literal(true), z.literal("on"), z.literal("true")]),
  turnstileToken: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot: must be empty
});

/**
 * Step 1 of the funnel: email + consent, then straight into the questionnaire.
 * Accepts JSON (from the page script) or a plain form POST (works before JavaScript loads).
 */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  const fail = (message: string, status = 400) =>
    isForm ? NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}#start`, env.appUrl), 303) : NextResponse.json({ error: message }, { status });

  if (!sameOrigin(req)) return fail("Please reload the page and try again.", 403);
  let raw: Record<string, unknown> = {};
  try {
    if (isForm) {
      const f = await req.formData();
      raw = { email: f.get("email"), consent: f.get("consent") ?? undefined, turnstileToken: f.get("cf-turnstile-response") ?? undefined, website: f.get("website") || undefined };
    } else raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("Please reload the page and try again.");
  }
  const body = Body.safeParse(raw);
  if (!body.success) return fail(body.error.issues.some((i) => i.path[0] === "consent") ? "Tick the box so we can send your plan." : "Enter a valid email address.");

  const ip = await clientIp();
  if (!(await limit(`signup:ip:${ip}`, LIMITS.signupPerIpHour, 3600))) return fail("Too many attempts from this network. Try again in an hour.", 429);
  if (!(await verifyTurnstile(body.data.turnstileToken, ip))) return fail("The bot check didn't pass. Reload and try again.");

  const email = body.data.email;
  const user = (await store.getUserByEmail(email)) ?? (await store.createUser({ email, consent_at: new Date().toISOString(), double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: true }));
  // Keep a full session if it's the same person; otherwise a draft session that can only see this new plan.
  const existing = await getSession();
  const session = existing?.scope === "full" && existing.uid === user.id ? existing : await setSession(user.id, "draft");
  const q = await store.createQuestionnaire({ user_id: user.id, session_nonce: session.nonce, answers: { ...DEFAULT_ANSWERS }, complete: false, version: 1 });

  let demoLink: string | null = null;
  if (session.scope !== "full" && (await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600)))
    demoLink = user.double_opt_in_at ? await sendLogin(user.id, email) : await sendConfirm(user.id, email);

  if (isForm) return NextResponse.redirect(new URL(`/q/${q.id}`, env.appUrl), 303);
  return NextResponse.json({ questionnaireId: q.id, ...(isDemo && demoLink ? { demoLink } : {}) });
}
