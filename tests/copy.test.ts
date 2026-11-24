import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PLACES_NOT_SAVED, SAVED_ON_DEVICE, SAVED_ON_DEVICE_ACCOUNTS } from "@/lib/copy";
import { buildPlan } from "./helpers/build";

/**
 * Owner brief D2 correction: plans have no shareable link. Without an account a plan is saved on this
 * device for 30 days; any-device use needs a confirmed email. No user-facing string may promise otherwise.
 */
const ROOTS = ["app", "components", "lib", "demo"];
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n === "dist") return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|mjs)$/.test(n) ? [p] : [];
  });
}
/** Source text without comments (block, JSDoc and line comments). */
function uncommented(src: string): string[] {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"));
}
const LINK_PROMISE = /\b(private|shareable|share|sharing) link\b/i;
const ANY_DEVICE = /\b(any device|all (of )?your devices|across devices|every device|other devices?)\b/i;
const TIED_TO_ACCOUNT = /confirm(ed)? (your )?email|sign(ed)? in|account/i;

describe("copy never promises a shareable link or cross-device saving without an account", () => {
  const all = ROOTS.flatMap(files);
  it("finds source files", () => expect(all.length).toBeGreaterThan(30));
  for (const f of all) {
    it(f, () => {
      for (const line of uncommented(readFileSync(f, "utf8"))) {
        expect(line, `${f}: ${line.trim()}`).not.toMatch(LINK_PROMISE);
        if (ANY_DEVICE.test(line)) expect(line, `${f}: ${line.trim()}`).toMatch(TIED_TO_ACCOUNT);
      }
    });
  }
  it("the saving copy says 'on this device' and ties any-device to a confirmed email", () => {
    for (const t of [SAVED_ON_DEVICE, SAVED_ON_DEVICE_ACCOUNTS]) {
      expect(t).toMatch(/saved on this device for 30 days/i);
      expect(t).toMatch(/Confirm your email to keep (it|them) and use (it|them) on any device/);
    }
    expect(PLACES_NOT_SAVED).toMatch(/isn't saved/);
  });
  it("built plan text makes no such promise either", async () => {
    const text = JSON.stringify((await buildPlan()).document);
    expect(text).not.toMatch(LINK_PROMISE);
    expect(text).not.toMatch(ANY_DEVICE);
  });
});

/**
 * UX-2: amounts are planning estimates (Sources, plan footer), so no user-facing text calls them exact.
 * The Copy for AI ground rule "Use these amounts exactly" is an instruction to the assistant (owner brief A6), not a claim.
 */
const EXACT_PROMISE = /exact(ly)?\s+(amounts?|water|food|fuel|how much|food list|quantities)/i;
describe("copy never calls the amounts exact (UX-2)", () => {
  const all = ROOTS.flatMap(files);
  it("no source string says exact amount(s)", () => {
    const hits = all.flatMap((f) => uncommented(readFileSync(f, "utf8")).filter((l) => EXACT_PROMISE.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(hits).toEqual([]);
  });
  it("the front page uses the agreed line, and the estimates wording stays", () => {
    expect(readFileSync("components/Landing.tsx", "utf8")).toContain("Amounts worked out for your household, with the math shown");
    expect(readFileSync("lib/plan/document.ts", "utf8")).toMatch(/Quantities are planning estimates/);
  });
  it("built plans and emails don't say exact amounts either", async () => {
    const r = await buildPlan();
    expect(JSON.stringify(r.document)).not.toMatch(EXACT_PROMISE);
  });
});
