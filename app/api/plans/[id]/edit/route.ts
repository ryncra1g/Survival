import { NextResponse } from "next/server";
import { loadPlanFor } from "@/lib/server/access";
import { env } from "@/lib/server/env";
import { sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

const EDIT_SCREENS = ["location", "household", "pets", "medical", "home", "heat", "power", "storage", "budget"] as const;

/**
 * "Change an answer": copy this plan's answers into a new questionnaire that opens on one screen,
 * with an "Update my plan" button. Plain form POST (works without JavaScript).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new Response("Please reload the page and try again.", { status: 403 });
  const { id } = await params;
  const session = await getSession();
  const plan = await loadPlanFor(session, id);
  if (!plan || !session) return NextResponse.redirect(new URL("/account", env.appUrl), 303);
  const source = await store.getQuestionnaire(plan.questionnaire_id);
  const screen = String((await req.formData()).get("screen") ?? "location");
  const q = await store.createQuestionnaire({
    user_id: plan.user_id,
    session_nonce: session.nonce,
    answers: { ...(source?.answers ?? {}), _screen: (EDIT_SCREENS as readonly string[]).includes(screen) ? screen : "location", _step: undefined },
    complete: false,
    version: 1,
  });
  return NextResponse.redirect(new URL(`/q/${q.id}`, env.appUrl), 303);
}
