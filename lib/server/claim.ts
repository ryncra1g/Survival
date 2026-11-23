import "server-only";
import { hmac, hmacEqual } from "./crypto";

/**
 * Security review M1: attaching a plan to an address that already has an account needs proof that the
 * requester owns that address. The claim travels inside the magic link sent to that address, signed for
 * that user and that plan, and is completed by /api/auth/verify. Nothing changes before the link is used.
 */
const sig = (userId: string, planId: string) => hmac(`claim:${userId}:${planId}`);

export const claimNext = (userId: string, planId: string) => `/plan/${planId}?claim=${sig(userId, planId)}`;

/** The plan id from a signed claim in a verify `next` path, or null when it's absent or not signed for this user. */
export function parseClaim(next: string, userId: string): string | null {
  const m = /^\/plan\/([0-9a-f-]{36})\?claim=([A-Za-z0-9_-]+)$/i.exec(next);
  if (!m) return null;
  return hmacEqual(m[2], sig(userId, m[1])) ? m[1] : null;
}
