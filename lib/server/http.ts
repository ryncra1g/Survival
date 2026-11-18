import "server-only";
import { NextResponse } from "next/server";
import { env } from "./env";
import { getSession, isAdmin, type Session } from "./session";
import { store, type UserRow } from "./store";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const err = (message: string, status = 400) => json({ error: message }, status);

/** CSRF defence for cookie-authenticated mutations: Origin must match the app. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET";
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return o.host === host || o.origin === new URL(env.appUrl).origin;
  } catch {
    return false;
  }
}

export async function requireSession(scope?: "full"): Promise<{ session: Session; user: UserRow } | null> {
  const session = await getSession();
  if (!session || (scope === "full" && session.scope !== "full")) return null;
  const user = await store.getUser(session.uid);
  return user ? { session, user } : null;
}

export async function requireAdmin(): Promise<UserRow | null> {
  const s = await requireSession("full");
  return s && isAdmin(s.user.email) ? s.user : null;
}

export async function readJson<T = unknown>(req: Request, maxBytes = 50_000): Promise<T | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
