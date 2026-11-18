import { NextResponse } from "next/server";
import { DEFAULT_ANSWERS } from "@/lib/answers/schema";
import { env } from "@/lib/server/env";
import { sameOrigin } from "@/lib/server/http";
import { clientIp, limit, LIMITS } from "@/lib/server/ratelimit";
import { getSession, setSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/**
 * Start a plan with no email (the email is asked for at the end, next to a preview).
 * Plain form POST from the landing page, so it works before any JavaScript loads.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Bad origin", { status: 403 });
  if (!(await limit(`start:ip:${await clientIp()}`, LIMITS.startPerIpHour, 3600))) return new Response("Too many plans started from this network. Try again in an hour.", { status: 429 });
  const existing = await getSession();
  const session = existing ?? (await setSession("", "anon"));
  const user = session.uid ? await store.getUser(session.uid) : null;
  const q = await store.createQuestionnaire({ user_id: user?.id ?? null, session_nonce: session.nonce, answers: { ...DEFAULT_ANSWERS }, complete: false, version: 1 });
  return NextResponse.redirect(new URL(`/q/${q.id}`, env.appUrl), 303);
}
