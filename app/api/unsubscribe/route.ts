import { NextResponse } from "next/server";
import { hmac, hmacEqual } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { store } from "@/lib/server/store";

/** One-click unsubscribe (RFC 8058): POST from mail clients, GET from the footer link. */
async function unsubscribe(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const s = url.searchParams.get("s") ?? "";
  if (!u || !s || !hmacEqual(s, hmac(`unsub:${u}`))) return false;
  const user = await store.getUser(u);
  if (!user) return true;
  if (!user.unsubscribed_at) {
    await store.updateUser(u, { unsubscribed_at: new Date().toISOString(), followups_opt_in: false });
    await store.addEmailEvent({ user_id: u, type: "unsubscribed", provider_id: null, sent_at: new Date().toISOString() });
  }
  return true;
}

export async function POST(req: Request) {
  return (await unsubscribe(req)) ? new Response("Unsubscribed", { status: 200 }) : new Response("Invalid link", { status: 400 });
}
export async function GET(req: Request) {
  const ok = await unsubscribe(req);
  return NextResponse.redirect(new URL(ok ? "/unsubscribed" : "/unsubscribed?error=1", env.appUrl));
}
