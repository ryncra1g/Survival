import { after, NextResponse } from "next/server";
import { sha256 } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { parseClaim } from "@/lib/server/claim";
import { emailPlan } from "@/lib/server/plans";
import { setSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/** Magic-link landing: confirms the address (double opt-in) and upgrades to a full session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const nextParam = url.searchParams.get("next") ?? "/account";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";
  const t = token ? await store.consumeToken(sha256(token)) : null;
  if (!t) return NextResponse.redirect(new URL("/account?link=expired", env.appUrl));
  const user = await store.getUser(t.user_id);
  if (!user) return NextResponse.redirect(new URL("/account?link=expired", env.appUrl));
  if (!user.double_opt_in_at) {
    user.double_opt_in_at = new Date().toISOString();
    await store.updateUser(user.id, { double_opt_in_at: user.double_opt_in_at });
  }
  await setSession(user.id, "full");
  // Security review M1: a signed claim from "Email me my plan" for an existing account. Attach that plan now
  // that the address owner has used the link, unless it already belongs to another confirmed account.
  const claim = parseClaim(nextParam, user.id);
  if (claim) {
    const p = await store.getPlan(claim.planId);
    const holder = p?.user_id && p.user_id !== user.id ? await store.getUser(p.user_id) : null;
    if (!p || holder?.double_opt_in_at) return NextResponse.redirect(new URL("/account", env.appUrl)); // refused: don't land on a plan they can't open
    await store.updateQuestionnaire(p.questionnaire_id, { user_id: user.id });
    await store.updatePlan(p.id, { user_id: user.id });
    // The owner ticked "send me updates" when asking, and has now proved the address is theirs.
    if (claim.updates && !user.followups_opt_in) await store.updateUser(user.id, { followups_opt_in: true, unsubscribed_at: null, consent_at: new Date().toISOString() });
    if (!p.emailed_at) after(() => emailPlan({ ...p, user_id: user.id }, user).catch((e) => console.error("[mail] plan", e)));
    return NextResponse.redirect(new URL(`/plan/${p.id}${p.emailed_at ? "" : "?emailed=1"}`, env.appUrl));
  }
  const latest = (await store.listPlans(user.id))[0];
  if (latest && !latest.emailed_at) after(() => emailPlan(latest, user).catch((e) => console.error("[mail] plan", e)));
  const dest = latest && !latest.emailed_at ? `/plan/${latest.id}?emailed=1` : next;
  return NextResponse.redirect(new URL(dest, env.appUrl));
}
