import "server-only";
import { cookies } from "next/headers";
import { hmac, hmacEqual, randomToken } from "./crypto";
import { env, isProd } from "./env";

/**
 * Signed session cookie (HMAC-SHA256). Two scopes:
 *  - "draft": created at email signup before the address is confirmed. Can only see
 *    questionnaires/plans created by this same session (nonce), so typing someone else's
 *    email never exposes their data.
 *  - "full": created by clicking a magic link. Can see all of the user's data.
 */
export interface Session {
  uid: string;
  nonce: string;
  scope: "draft" | "full";
  exp: number;
}
const NAME = "rp_session";
const DAYS = { draft: 2, full: 30 };

export function encodeSession(s: Session): string {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${body}.${hmac(body)}`;
}
export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !hmacEqual(sig, hmac(body))) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
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
