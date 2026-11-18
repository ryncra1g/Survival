import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { secret } from "./env";

/** AES-256-GCM application-level encryption for answers and plans (on top of DB encryption at rest). */
export interface Sealed {
  v: 1;
  iv: string;
  tag: string;
  ct: string;
}
const key = () => createHash("sha256").update(secret("encryption")).digest();

export function seal(value: unknown): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ct: ct.toString("base64") };
}

export function unseal<T = unknown>(s: Sealed): T {
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(s.iv, "base64"));
  d.setAuthTag(Buffer.from(s.tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(s.ct, "base64")), d.final()]).toString("utf8")) as T;
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newId = () => randomUUID();

export function hmac(data: string): string {
  return createHmac("sha256", secret("session")).update(data).digest("base64url");
}
export function hmacEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
