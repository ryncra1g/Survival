import { after, NextResponse } from "next/server";
import { sha256 } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
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
  const latest = (await store.listPlans(user.id))[0];
  if (latest && !latest.emailed_at) after(() => emailPlan(latest, user).catch((e) => console.error("[mail] plan", e)));
  const dest = latest && !latest.emailed_at ? `/plan/${latest.id}?emailed=1` : next;
  return NextResponse.redirect(new URL(dest, env.appUrl));
}
