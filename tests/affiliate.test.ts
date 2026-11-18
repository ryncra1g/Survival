import { describe, expect, it } from "vitest";
import { buyUrl } from "@/lib/affiliate";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { renderPlanEmail } from "@/lib/email/render";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS, mergeConstants } from "@/lib/rules/constants";
import { SAMPLE_HOUSEHOLD } from "./fixtures/households";

const item = SEED_CATALOG.find((i) => i.id === "co-alarm")!;
const NOW = new Date("2026-11-18");

describe("affiliate links", () => {
  it("no tag and no item URL → no Buy button", () => expect(buyUrl(item, "")).toBeNull());
  it("tag → Amazon search for the first example model, tagged", () =>
    expect(buyUrl(item, "readyplan-20")).toBe("https://www.amazon.com/s?k=Kidde%20KN-COPP-3&tag=readyplan-20"));
  it("an item's own affiliate URL wins", () => expect(buyUrl({ ...item, affiliateUrl: "https://example.com/x" }, "readyplan-20")).toBe("https://example.com/x"));
  it("generic examples ('Any …', local supplier) search by item name instead", () => {
    const wood = SEED_CATALOG.find((i) => i.id === "firewood")!;
    expect(buyUrl(wood, "t-20")).toContain(encodeURIComponent(wood.name));
  });
  it("rejects tags with unsafe characters", () => expect(() => mergeConstants({ affiliate: { amazonTag: "x&evil=1" } })).toThrow());

  it("without a tag: no Buy buttons and no disclosure", async () => {
    const r = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, { useLlm: false, now: NOW });
    const items = r.document.sections.flatMap((s) => s.blocks).flatMap((b) => (b.type === "products" ? b.items : []));
    expect(items.length).toBeGreaterThan(10);
    expect(items.some((i) => i.buyable)).toBe(false);
    expect(r.document.affiliateDisclosure).toBeNull();
  });

  it("with a tag: Buy buttons in the shopping list and gear list, disclosure on, tracked links in email", async () => {
    const c = mergeConstants({ affiliate: { amazonTag: "readyplan-20" } });
    const r = await generatePlan(SAMPLE_HOUSEHOLD, c, SEED_CATALOG, { useLlm: false, now: NOW });
    const pr = r.document.sections.find((s) => s.id === "priorities")!;
    const shop = pr.blocks.find((b) => b.type === "products");
    expect(shop && shop.type === "products" && shop.items.every((i) => i.buyable)).toBe(true);
    expect(r.document.affiliateDisclosure).toMatch(/commission/);
    const e = renderPlanEmail(r.document, { appUrl: "https://app.example", unsubscribeUrl: "u", mailingAddress: "a", planUrl: "p", pdfAttached: true, planId: "abc" });
    expect(e.html).toContain("https://app.example/go/co-alarm?p=abc&amp;src=email");
    expect(e.html).not.toContain("amazon.com"); // all clicks go through the tracked redirect
    expect(Buffer.byteLength(e.html)).toBeLessThan(100_000);
  });
});
