import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { ACCOUNT_ITEMS, menuItems } from "@/lib/menu";

const labels = (s: Parameters<typeof menuItems>[0]) => menuItems(s).map((i) => i.label);

describe("site menu (D9)", () => {
  it("visitor: Sign in, Help, About, Sources & safety, Terms, Privacy", () => {
    expect(labels({ signedIn: false, accounts: false })).toEqual(["Sign in", "Help", "About", "Sources & safety", "Terms", "Privacy"]);
    expect(labels({ signedIn: false, accounts: true })).toEqual(labels({ signedIn: false, accounts: false }));
  });
  it("signed in with accounts off shows only what exists today", () => {
    const l = labels({ signedIn: true, accounts: false });
    expect(l).toContain("My plan");
    expect(l).toContain("Privacy & data");
    expect(l.at(-1)).toBe("Sign out");
    for (const a of ACCOUNT_ITEMS) expect(l).not.toContain(a.label);
  });
  it("signed in with accounts on adds the accounts-track items", () => {
    const l = labels({ signedIn: true, accounts: true });
    for (const a of ACCOUNT_ITEMS) expect(l).toContain(a.label);
  });
  it("every visitor and flag-off link points to a page that exists", () => {
    for (const s of [{ signedIn: false, accounts: false }, { signedIn: true, accounts: false }]) {
      for (const i of menuItems(s)) {
        if (!("href" in i)) continue;
        const path = i.href.split("#")[0].replace(/^\//, "");
        expect(existsSync(`app/${path}/page.tsx`), i.href).toBe(true);
      }
    }
  });
});

describe("accounts-track menu pages (D1–D4, D12)", () => {
  it("every accounts-track link points to a page that exists", () => {
    for (const a of ACCOUNT_ITEMS) expect(existsSync(`app/${a.href.replace(/^\//, "")}/page.tsx`), a.href).toBe(true);
  });
});
