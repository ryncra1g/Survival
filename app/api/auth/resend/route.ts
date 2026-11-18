import { sendConfirm } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/env";
import { err, json, requireSession, sameOrigin } from "@/lib/server/http";
import { limit } from "@/lib/server/ratelimit";

/** "Didn't get it? Resend" on the plan page. Only for the signed-in (draft) user's own address. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession();
  if (!auth) return err("Start from the front page.", 401);
  if (auth.user.double_opt_in_at) return json({ ok: true, alreadyConfirmed: true });
  if (!(await limit(`resend:${auth.user.id}`, 3, 3600))) return err("We've sent it a few times already. Check your spam folder, or try again in an hour.", 429);
  const link = await sendConfirm(auth.user.id, auth.user.email);
  return json({ ok: true, email: auth.user.email, ...(isDemo ? { demoLink: link } : {}) });
}
