import { timingSafeEqual } from "node:crypto";

/**
 * Cron routes: the request must carry `Authorization: Bearer <CRON_SECRET>`. Compared in constant time
 * (lengths checked first, because timingSafeEqual throws on unequal lengths). No secret set means no access.
 */
export function cronAuthorized(header: string | null, secret: string): boolean {
  if (!secret || !header) return false;
  const got = Buffer.from(header, "utf8");
  const want = Buffer.from(`Bearer ${secret}`, "utf8");
  return got.length === want.length && timingSafeEqual(got, want);
}
