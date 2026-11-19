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
  it("no tag → a plain (untagged) Amazon search, so the item still has a Buy link", () =>
    expect(buyUrl(item, "")).toBe("https://www.amazon.com/s?k=Kidde%20KN-COPP-3"));
  it("tag → Amazon search for the first example model, tagged", () =>
    expect(buyUrl(item, "mysite-20")).toBe("https://www.amazon.com/s?k=Kidde%20KN-COPP-3&tag=mysite-20"));
  it("an item's own affiliate URL wins", () => expect(buyUrl({ ...item, affiliateUrl: "https://example.com/x" }, "mysite-20")).toBe("https://example.com/x"));
  it("generic examples ('Any store brand') search by item name; a named model wins over a generic one", () => {
    const bleach = SEED_CATALOG.find((i) => i.id === "bleach")!;
    expect(buyUrl(bleach, "t-20")).toContain(encodeURIComponent(bleach.name));
    const med = SEED_CATALOG.find((i) => i.id === "med-battery")!;
    expect(buyUrl(med, "t-20")).toContain(encodeURIComponent(med.models[1]));
  });
  it("'use what you own' and 'buy locally' items have no store link", () => {
    for (const id of ["go-bag-basic", "quake-bedside", "mobility-kit", "morale-kit", "firewood", "raw-land-cabin"])
      expect(buyUrl(SEED_CATALOG.find((i) => i.id === id)!, "t-20"), id).toBeNull();
  });
  it("rejects tags with unsafe characters", () => expect(() => mergeConstants({ affiliate: { amazonTag: "x&evil=1" } })).toThrow());

  it("without a tag: every item has a Buy link, but no commission disclosure (nothing earns one)", async () => {
    const r = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, { useLlm: false, now: NOW });
    const items = r.document.sections.flatMap((s) => s.blocks).flatMap((b) => (b.type === "products" ? b.items : []));
    expect(items.length).toBeGreaterThan(10);
    // Every real product has a Buy link; only "use what you own / buy locally" items don't.
    expect(items.filter((i) => !i.buyable).map((i) => i.itemId).every((id) => ["go-bag-basic", "quake-bedside", "mobility-kit", "morale-kit", "firewood", "raw-land-cabin"].includes(id))).toBe(true);
    expect(items.filter((i) => i.buyable).length).toBeGreaterThan(10);
    expect(r.document.affiliateDisclosure).toBeNull();
  });
  it("without a tag, an item with its own affiliate URL turns the disclosure on", async () => {
    const cat = SEED_CATALOG.map((i) => (i.id === "radio" ? { ...i, affiliateUrl: "https://www.example-store.com/radio?aff=1" } : i));
    const r = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, cat, { useLlm: false, now: NOW });
    expect(r.document.affiliateDisclosure).toMatch(/commission/);
  });

  it("with a tag: Buy buttons in the shopping list and gear list, disclosure on, tracked links in email", async () => {
    const c = mergeConstants({ affiliate: { amazonTag: "mysite-20" } });
    const r = await generatePlan(SAMPLE_HOUSEHOLD, c, SEED_CATALOG, { useLlm: false, now: NOW });
    const pr = r.document.sections.find((s) => s.id === "priorities")!;
    const shop = pr.blocks.find((b) => b.type === "products");
    expect(shop && shop.type === "products" && shop.items.every((i) => i.buyable)).toBe(true);
    expect(r.document.affiliateDisclosure).toMatch(/commission/);
    const e = renderPlanEmail(r.document, { appUrl: "https://app.example", unsubscribeUrl: "u", mailingAddress: "a", planUrl: "p", pdfAttached: true, planId: "abc" });
    // Amazon links aren't allowed in email: Amazon-bound items link back to the plan page instead
    expect(e.html).not.toContain("/go/co-alarm");
    expect(e.html).toContain("https://app.example/plan/abc#priorities");
    expect(e.html).not.toContain("amazon.com");
    expect(Buffer.byteLength(e.html)).toBeLessThan(100_000);
  });
});

describe("email-safe affiliate links", () => {
  it("non-Amazon affiliate URLs go in emails through the tracked redirect", async () => {
    const cat = SEED_CATALOG.map((i) => (i.id === "radio" ? { ...i, affiliateUrl: "https://www.example-store.com/radio?aff=1" } : i));
    const r = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, cat, { useLlm: false, now: NOW });
    const e = renderPlanEmail(r.document, { appUrl: "https://app.example", unsubscribeUrl: "u", mailingAddress: "a", planUrl: "p", pdfAttached: true, planId: "abc" });
    expect(e.html).toContain("https://app.example/go/radio?p=abc&amp;src=email");
    expect(r.document.affiliateDisclosure).toMatch(/commission/);
  });
  it.each([["https://www.amazon.com/dp/B0", true], ["https://amzn.to/3xyz", true], ["https://www.amazon.co.uk/x", true], ["https://www.homedepot.com/p/1", false], ["https://notamazon.com/x", false]])("isAmazon(%s) = %s", async (u, want) => {
    const { isAmazon } = await import("@/lib/affiliate");
    expect(isAmazon(u)).toBe(want);
  });
});
