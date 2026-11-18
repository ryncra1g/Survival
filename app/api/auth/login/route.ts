import { z } from "zod";
import { sendConfirm, sendLogin } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/env";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { store } from "@/lib/server/store";
import { verifyTurnstile } from "@/lib/server/turnstile";

/** Request a sign-in link. Same response whether or not the email exists (no account enumeration). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const body = z.object({ email: z.string().trim().toLowerCase().email(), turnstileToken: z.string().optional() }).safeParse(await readJson(req));
  if (!body.success) return err("Enter a valid email.");
  const ip = await clientIp();
  if (!(await limit(`login:ip:${ip}`, LIMITS.signupPerIpHour, 3600))) return err("Too many attempts. Try again later.", 429);
  if (!(await verifyTurnstile(body.data.turnstileToken, ip))) return err("Bot check failed.");
  const user = await store.getUserByEmail(body.data.email);
  let link: string | null = null;
  if (user && (await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600)))
    link = user.double_opt_in_at ? await sendLogin(user.id, user.email) : await sendConfirm(user.id, user.email);
  return json({ ok: true, ...(isDemo && link ? { demoLink: link } : {}) });
}
