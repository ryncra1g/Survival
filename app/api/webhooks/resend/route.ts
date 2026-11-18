import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/server/env";
import { store } from "@/lib/server/store";

/** Resend webhook (Svix-signed): records opens/bounces/complaints into email_events. */
function verify(body: string, h: Headers): boolean {
  const id = h.get("svix-id");
  const ts = h.get("svix-timestamp");
  const sigs = h.get("svix-signature");
  if (!env.resendWebhookSecret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(env.resendWebhookSecret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const sig = Buffer.from(s.split(",")[1] ?? "", "base64");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!verify(body, req.headers)) return new Response("Invalid signature", { status: 401 });
  const evt = JSON.parse(body) as { type: string; data?: { email_id?: string } };
  const map: Record<string, string> = { "email.opened": "opened", "email.bounced": "bounced", "email.complained": "complained", "email.delivered": "delivered" };
  const type = map[evt.type];
  if (type) await store.addEmailEvent({ user_id: null, type, provider_id: evt.data?.email_id ?? null, sent_at: new Date().toISOString() });
  return new Response("ok");
}
