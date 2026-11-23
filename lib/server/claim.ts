import "server-only";
import { isId } from "@/lib/ids";
import { hmac, hmacEqual } from "./crypto";

/**
 * Security review M1: attaching a plan to an address that already has an account needs proof that the
 * requester owns that address. The claim travels inside the magic link sent to that address, signed for
 * that user, that plan and the "send me updates" tick, and is completed by /api/auth/verify.
 * Nothing changes before the link is used.
 */
const sig = (userId: string, planId: string, updates: boolean) => hmac(`claim:${userId}:${planId}:${updates ? 1 : 0}`);

export const claimNext = (userId: string, planId: string, updates = false) => `/plan/${planId}?claim=${sig(userId, planId, updates)}${updates ? "&u=1" : ""}`;

/** The plan id (and the updates tick) from a signed claim in a verify `next` path, or null when it's absent or not signed for this user. */
export function parseClaim(next: string, userId: string): { planId: string; updates: boolean } | null {
  const m = /^\/plan\/([0-9a-f-]{36})\?claim=([A-Za-z0-9_-]+)(&u=1)?$/i.exec(next);
  if (!m || !isId(m[1])) return null;
  const updates = !!m[3];
  return hmacEqual(m[2], sig(userId, m[1], updates)) ? { planId: m[1], updates } : null;
}
