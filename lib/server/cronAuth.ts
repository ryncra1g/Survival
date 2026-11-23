import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Cron routes: the request must carry `Authorization: Bearer <CRON_SECRET>`. Both sides are hashed to fixed-length
 * SHA-256 digests and compared with timingSafeEqual (lengths checked first, as timingSafeEqual requires), so neither
 * the secret's content nor its length leaks through timing. No secret set means no access.
 */
export function cronAuthorized(header: string | null, secret: string): boolean {
  if (!secret || !header) return false;
  const got = digest(header);
  const want = digest(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
