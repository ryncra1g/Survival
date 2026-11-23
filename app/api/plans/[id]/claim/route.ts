import { isId } from "@/lib/ids";
import { after } from "next/server";
import { z } from "zod";
import { sendClaimLink, sendConfirm } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/env";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { loadPlanFor } from "@/lib/server/access";
import { emailPlan } from "@/lib/server/plans";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession, setSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";
import { verifyTurnstile } from "@/lib/server/turnstile";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  /** Optional, unticked by default: seasonal reminders + preparedness updates (marketing consent). */
  updates: z.boolean().default(false),
  turnstileToken: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot
});

/**
 * "Email me my plan" on the plan page. Links the plan to an email, then either emails it
 * (address already confirmed) or sends the double opt-in link (the plan follows on confirm).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const { id } = await params;
  if (!isId(id)) return err("Not found", 404);
  const session = await getSession();
  const plan = await loadPlanFor(session, id);
  if (!plan || !session) return err("Not found", 404);
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return err("Enter a valid email address.");
  const ip = await clientIp();
  if (!(await limit(`signup:ip:${ip}`, LIMITS.signupPerIpHour, 3600))) return err("Too many attempts. Try again in an hour.", 429);
  if (!(await verifyTurnstile(body.data.turnstileToken, ip))) return err("The bot check didn't pass. Reload and try again.");

  const { email, updates } = body.data;
  const now = new Date().toISOString();
  let user = await store.getUserByEmail(email);
  // Security review M1: an address that already has an account. Unless this browser is signed in as that
  // account, change nothing (no plan move, no consent change, no session change) and send a link to the
  // address instead; the plan is attached only when the link is used. Same reply as a new address.
  if (user && !(session.scope === "full" && session.uid === user.id)) {
    if (!(await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600))) return err("We've sent a few emails to that address already. Check your inbox and spam folder.", 429);
    const link = await sendClaimLink(user, plan.id, updates);
    return json({ ok: true, status: "confirm", email, ...(isDemo ? { demoLink: link } : {}) });
  }
  if (!user) user = await store.createUser({ email, consent_at: now, double_opt_in_at: null, unsubscribed_at: null, followups_opt_in: updates });
  else if (updates && !user.followups_opt_in) await store.updateUser(user.id, { followups_opt_in: true, unsubscribed_at: null, consent_at: now }); // signed in as this account

  await store.updateQuestionnaire(plan.questionnaire_id, { user_id: user.id });
  await store.updatePlan(plan.id, { user_id: user.id });
  // Same browser, now tied to this email at draft scope (sees only what it created until confirmed).
  if (session.scope !== "full" || session.uid !== user.id) await setSession(user.id, "draft", session.nonce);

  if (user.double_opt_in_at) {
    const u = user;
    const claimed = { ...plan, user_id: u.id };
    after(() => emailPlan(claimed, u).catch((e) => console.error("[mail] plan", e)));
    return json({ ok: true, status: "sent", email });
  }
  if (!(await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600))) return err("We've sent a few emails to that address already. Check your inbox and spam folder.", 429);
  const link = await sendConfirm(user.id, email);
  return json({ ok: true, status: "confirm", email, ...(isDemo ? { demoLink: link } : {}) });
}
