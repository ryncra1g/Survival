import "server-only";
import { renderConfirmEmail, renderLoginEmail } from "@/lib/email/render";
import { randomToken, sha256 } from "./crypto";
import { env, isDemo } from "./env";
import { metaFor, sendEmail } from "./mailer";
import { store } from "./store";

/** Magic links: random token emailed to the user; only its SHA-256 is stored. Single use. */
export async function issueLink(userId: string, purpose: "confirm" | "login", next = "/account"): Promise<string> {
  const token = randomToken();
  const ttl = purpose === "confirm" ? 7 * 86_400_000 : 3_600_000;
  await store.createToken({ token_hash: sha256(token), user_id: userId, purpose, expires_at: new Date(Date.now() + ttl).toISOString(), used_at: null });
  const url = `${env.appUrl}/api/auth/verify?t=${token}&next=${encodeURIComponent(next)}`;
  if (isDemo) console.log(`[auth:demo] ${purpose} link for ${userId}: ${url}`);
  return url;
}

export async function sendConfirm(userId: string, email: string) {
  const link = await issueLink(userId, "confirm", "/account?confirmed=1");
  const m = renderConfirmEmail(link, metaFor(userId));
  await sendEmail({ to: email, userId, type: "confirm", ...m });
  return link;
}

export async function sendLogin(userId: string, email: string) {
  const link = await issueLink(userId, "login");
  const m = renderLoginEmail(link, metaFor(userId));
  await sendEmail({ to: email, userId, type: "login", ...m });
  return link;
}
