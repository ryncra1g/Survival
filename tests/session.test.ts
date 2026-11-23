import { describe, expect, it } from "vitest";
import { hmac } from "@/lib/server/crypto";
import { decodeSession, encodeSession } from "@/lib/server/session";

/** Low 5 (security review): after the signature check, the cookie's contents are validated with zod. */
const later = () => Date.now() + 3600_000;
/** Sign an arbitrary body, so the test reaches the shape check (an attacker can't do this without the secret). */
const signed = (body: string) => {
  const b = Buffer.from(body).toString("base64url");
  return `${b}.${hmac(b)}`;
};

describe("decodeSession", () => {
  it("accepts a valid cookie for every scope", () => {
    for (const scope of ["anon", "draft", "full"] as const) {
      const s = { uid: scope === "anon" ? "" : "3f2b1c4d-0000-4000-8000-000000000001", nonce: "abc123", scope, exp: later() };
      expect(decodeSession(encodeSession(s))).toEqual(s);
    }
  });

  it("rejects tampered cookies", () => {
    const good = encodeSession({ uid: "u1", nonce: "n1", scope: "anon", exp: later() });
    const [body, sig] = good.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "u1", nonce: "n1", scope: "full", exp: later() })).toString("base64url");
    expect(decodeSession(`${forged}.${sig}`)).toBeNull(); // body changed, old signature
    expect(decodeSession(`${body}.${sig.slice(0, -2)}xx`)).toBeNull(); // signature changed
    expect(decodeSession(`${body}.`)).toBeNull();
    expect(decodeSession(`${good}.extra`)).toBeNull();
  });

  it("treats malformed (but signed) contents as signed out, without throwing", () => {
    const bad = [
      "not json",
      "null",
      "[]",
      '"a string"',
      "{}",
      JSON.stringify({ uid: "u1", nonce: "n1", scope: "admin", exp: later() }), // unknown scope
      JSON.stringify({ uid: 5, nonce: "n1", scope: "full", exp: later() }), // wrong type
      JSON.stringify({ uid: "u1", nonce: "", scope: "full", exp: later() }), // empty nonce
      JSON.stringify({ uid: "u1", nonce: "n1", scope: "full", exp: String(later()) }), // exp as string
      JSON.stringify({ uid: "u1", nonce: "n1", scope: "full" }), // missing exp
      JSON.stringify({ uid: "u1", nonce: "n1", scope: "full", exp: later(), admin: true }), // extra field
      JSON.stringify({ uid: "u1", nonce: "n1", scope: "full", exp: Date.now() - 1000 }), // expired
    ];
    for (const b of bad) expect(() => decodeSession(signed(b)), b).not.toThrow();
    for (const b of bad) expect(decodeSession(signed(b)), b).toBeNull();
  });

  it("treats garbage cookie strings as signed out", () => {
    for (const raw of [undefined, "", ".", "...", "%%%", "a.b", "\u0000.\u0000", "x".repeat(5000)]) {
      expect(() => decodeSession(raw)).not.toThrow();
      expect(decodeSession(raw)).toBeNull();
    }
  });
});
