import "server-only";
import { ID_RE } from "@/lib/ids";
import { hmac, hmacEqual } from "./crypto";

/**
 * Security review M1: attaching a plan to an address that already has an account needs proof that the
 * requester owns that address. The claim travels inside the magic link sent to that address, signed for
 * that user, that plan and the "send me updates" tick, and is completed by /api/auth/verify.
 * Nothing changes before the link is used.
 */
const sig = (userId: string, planId: string, updates: boolean) => hmac(`claim:${userId}:${planId}:${updates ? 1 : 0}`);

export const claimNext = (userId: string, planId: string, updates = false) => `/plan/${planId}?claim=${sig(userId, planId, updates)}${updates ? "&u=1" : ""}`;

/** The plan id uses the same exact format as every route (lib/ids.ts), so there's one rule. */
const CLAIM_RE = new RegExp(String.raw`^\/plan\/(${ID_RE.source.slice(1, -1)})\?claim=([A-Za-z0-9_-]+)(&u=1)?$`);

/** The plan id (and the updates tick) from a signed claim in a verify `next` path, or null when it's absent or not signed for this user. */
export function parseClaim(next: string, userId: string): { planId: string; updates: boolean } | null {
  const m = CLAIM_RE.exec(next);
  if (!m) return null;
  const updates = !!m[3];
  return hmacEqual(m[2], sig(userId, m[1], updates)) ? { planId: m[1], updates } : null;
}
