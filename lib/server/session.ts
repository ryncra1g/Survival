import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { hmac, hmacEqual, randomToken } from "./crypto";
import { env, isProd } from "./env";

/**
 * Signed session cookie (HMAC-SHA256). Three scopes:
 *  - "anon": building a plan without an email (uid is ""). Sees only what this browser created.
 *  - "draft": created at email signup before the address is confirmed. Can only see
 *    questionnaires/plans created by this same session (nonce), so typing someone else's
 *    email never exposes their data.
 *  - "full": created by clicking a magic link. Can see all of the user's data.
 */
export interface Session {
  uid: string;
  nonce: string;
  scope: "anon" | "draft" | "full";
  exp: number;
}
/**
 * The shape a session cookie must have: these four fields with these types. Unknown fields are stripped, not
 * rejected, so a release that adds a field can be rolled back (or run beside an older one) without signing people out.
 */
const SessionSchema = z
  .object({
    uid: z.string().max(64),
    nonce: z.string().min(1).max(64),
    scope: z.enum(["anon", "draft", "full"]),
    exp: z.number().int().positive(),
  })
  .strip();
const NAME = "rp_session";
const DAYS = { anon: 30, draft: 30, full: 30 };

export function encodeSession(s: Session): string {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${body}.${hmac(body)}`;
}
export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const parts = raw.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    if (!body || !sig || !hmacEqual(sig, hmac(body))) return null;
    // Security review Low 5: a valid signature isn't enough; the contents must have the expected shape.
    const s = SessionSchema.safeParse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
    return s.success && s.data.exp > Date.now() ? s.data : null;
  } catch {
    return null; // anything malformed is signed out, never a 500
  }
}

export async function getSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(NAME)?.value);
}

export async function setSession(uid: string, scope: Session["scope"], nonce = randomToken(12)): Promise<Session> {
  const s: Session = { uid, nonce, scope, exp: Date.now() + DAYS[scope] * 86_400_000 };
  (await cookies()).set(NAME, encodeSession(s), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: DAYS[scope] * 86_400,
  });
  return s;
}

export async function clearSession() {
  (await cookies()).delete(NAME);
}

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && env.adminEmails.includes(email.toLowerCase());
}
