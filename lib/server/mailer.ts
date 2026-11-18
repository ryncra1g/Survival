import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { hmac } from "./crypto";
import { env } from "./env";
import { store } from "./store";
import type { EmailMeta } from "@/lib/email/render";

/**
 * Sends email via Resend, or (demo mode, no RESEND_API_KEY) writes it to .data/outbox
 * and logs the links to the console. Every send records an email_events row.
 */
export const unsubscribeUrl = (userId: string) => `${env.appUrl}/api/unsubscribe?u=${userId}&s=${hmac(`unsub:${userId}`)}`;
export const metaFor = (userId: string): EmailMeta => ({ appUrl: env.appUrl, unsubscribeUrl: unsubscribeUrl(userId), mailingAddress: env.mailingAddress });

export interface OutgoingEmail {
  to: string;
  userId: string;
  type: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
  /** Marketing emails respect unsubscribe; transactional ones (confirm/login/plan) don't. */
  marketing?: boolean;
}

export async function sendEmail(m: OutgoingEmail): Promise<boolean> {
  if (m.marketing) {
    const u = await store.getUser(m.userId);
    if (!u || u.unsubscribed_at || !u.double_opt_in_at || !u.followups_opt_in) return false;
  }
  const unsub = unsubscribeUrl(m.userId);
  const headers = { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  let providerId: string | null = null;
  if (env.resendKey) {
    const resend = new Resend(env.resendKey);
    const r = await resend.emails.send({
      from: env.emailFrom,
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      headers,
      attachments: m.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
      tags: [{ name: "type", value: m.type.replace(/[^a-zA-Z0-9_-]/g, "_") }],
    });
    if (r.error) {
      console.error("[mail] send failed", r.error);
      return false;
    }
    providerId = r.data?.id ?? null;
  } else {
    const dir = path.join(process.env.READYPLAN_DATA_DIR || path.join(process.cwd(), ".data"), "outbox");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${m.type.replace(/\W/g, "_")}.html`);
    fs.writeFileSync(file, m.html);
    for (const a of m.attachments ?? []) fs.writeFileSync(file.replace(/\.html$/, `-${a.filename}`), a.content);
    console.log(`[mail:demo] ${m.type} → ${m.to}: "${m.subject}" (${file})`);
  }
  await store.addEmailEvent({ user_id: m.userId, type: `sent:${m.type}`, provider_id: providerId, sent_at: new Date().toISOString() });
  return true;
}
