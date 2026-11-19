import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { ALL_OFFICIAL_LINKS } from "@/lib/zip/resources";
import { atLeast, lookupZip } from "@/lib/zip/profile";
import { isAmazon } from "@/lib/affiliate";
import { renderPlanEmail } from "@/lib/email/render";
import { productIndex, resolveStep } from "@/components/StepExtras";
import { PERSONAS } from "./fixtures/personas";
import { SAMPLE_HOUSEHOLD } from "./fixtures/households";

const NOW = new Date("2026-11-18");
const C = { ...DEFAULT_CONSTANTS, affiliate: { amazonTag: "test-20" } };
const plan = async (a: typeof SAMPLE_HOUSEHOLD) => (await generatePlan(a, C, SEED_CATALOG, { useLlm: false, now: NOW })).document;
const steps = (doc: PlanDocument) =>
  doc.sections.flatMap((s) => s.blocks).filter((b): b is Extract<Block, { type: "checklist" }> => b.type === "checklist").flatMap((b) => b.items);
const week = (doc: PlanDocument) => (doc.sections.find((s) => s.id === "priorities")!.blocks.find((b) => b.type === "checklist") as Extract<Block, { type: "checklist" }>).items;
const href = (id: string) => `/go/${id}`;

describe("each step says why, what to buy and where to go", () => {
  it("Long Island: first steps are CO alarms (Buy), water (Buy) and the evacuation zone (Suffolk map); alerts link to NY-Alert", async () => {
    const doc = await plan(SAMPLE_HOUSEHOLD);
    const products = productIndex(doc);
    const [co, water, zone] = week(doc).slice(0, 3).map((i) => resolveStep(i, products, href));
    expect(co.text).toMatch(/CO alarms/);
    expect(co.why).toBeTruthy();
    expect(co.buy?.itemId).toBe("co-alarm");
    expect(water.buy?.itemId).toMatch(/^water-/);
    expect(zone.text).toMatch(/evacuation zone/);
    expect(zone.link?.url).toMatch(/suffolkcountyny\.gov/);
    expect(week(doc).find((i) => /Wireless Emergency Alerts/.test(i.text))?.link?.url).toBe("https://alert.ny.gov/sign-up-ny-alert");
  });

  it("every buy id is a real catalog item, and every link is an official https link, never Amazon", async () => {
    const ids = new Set(SEED_CATALOG.map((i) => i.id));
    for (const p of [{ name: "sample", a: SAMPLE_HOUSEHOLD }, ...PERSONAS]) {
      for (const st of steps(await plan(p.a))) {
        for (const id of st.buy ?? []) expect(ids.has(id), `${p.name}: ${id}`).toBe(true);
        if (st.link) {
          expect(st.link.url, p.name).toMatch(/^https:\/\//);
          expect(isAmazon(st.link.url)).toBe(false);
          expect(ALL_OFFICIAL_LINKS.map((l) => l.url)).toContain(st.link.url);
        }
      }
    }
  });

  it("a Buy button only appears for gear that is in this plan (never for what the household already has)", async () => {
    for (const p of [{ name: "sample", a: SAMPLE_HOUSEHOLD }, ...PERSONAS]) {
      const doc = await plan(p.a);
      const products = productIndex(doc);
      for (const st of steps(doc)) {
        const r = resolveStep(st, products, href);
        if (r.buy) expect(products.has(r.buy.itemId), `${p.name}: ${r.buy.itemId}`).toBe(true);
      }
    }
  });

  it("no evacuation-zone step where hurricanes aren't a real risk", async () => {
    for (const p of PERSONAS) {
      const doc = await plan(p.a);
      const hasZone = week(doc).some((i) => i.id === "week-zone");
      const hurricaneRisk = atLeast(lookupZip(p.a.zip).hurricane, "moderate");
      expect(hasZone, p.name).toBe(hurricaneRisk);
    }
  });

  it("the email shows official links but no Amazon links", async () => {
    const doc = await plan(SAMPLE_HOUSEHOLD);
    const { html, text } = renderPlanEmail(doc, { appUrl: "https://example.com", planUrl: "https://example.com/plan/x", pdfAttached: false, unsubscribeUrl: "https://example.com/u", mailingAddress: "1 Main St" });
    expect(html).toContain("alert.ny.gov");
    expect(text).toContain("alert.ny.gov");
    expect(html).not.toMatch(/amazon\./i);
  });
});
