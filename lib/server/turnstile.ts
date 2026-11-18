import "server-only";
import { env } from "./env";

/** Cloudflare Turnstile verification. Skipped (allowed) when no secret is configured (demo/dev). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!env.turnstileSecret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.turnstileSecret, response: token, remoteip: ip });
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = (await r.json()) as { success?: boolean };
    return !!j.success;
  } catch {
    return false;
  }
}
