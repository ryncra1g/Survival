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
import { SAMPLE_HOUSEHOLD, at } from "./fixtures/households";
import { sectionHelp } from "@/lib/plan/help";
import type { Answers } from "@/lib/answers/schema";

const NOW = new Date("2026-11-18");
const C = { ...DEFAULT_CONSTANTS, affiliate: { amazonTag: "test-20" } };
const plan = async (a: typeof SAMPLE_HOUSEHOLD) => (await generatePlan(a, C, SEED_CATALOG, { useLlm: false, now: NOW })).document;
const steps = (doc: PlanDocument) =>
  doc.sections.flatMap((s) => s.blocks).filter((b): b is Extract<Block, { type: "checklist" }> => b.type === "checklist").flatMap((b) => b.items);
const week = (doc: PlanDocument) => (doc.sections.find((s) => s.id === "priorities")!.blocks.find((b) => b.type === "checklist") as Extract<Block, { type: "checklist" }>).items;
const href = (id: string) => `/go/${id}`;

describe("each step says why, what to buy and where to go", () => {
  it("Long Island: first steps are the evacuation zone (Suffolk map; hurricanes and flooding are high, UX-13), CO alarms (Buy) and water (Buy); alerts link to NY-Alert", async () => {
    const doc = await plan(SAMPLE_HOUSEHOLD);
    const products = productIndex(doc);
    const [zone, co, water] = week(doc).slice(0, 3).map((i) => resolveStep(i, products, href));
    expect(zone.text).toMatch(/hurricanes and flooding/);
    expect(zone.text).toMatch(/flood zone/);
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
      // A moderate risk gets its own zone step; a high one has it inside the combined hazard step (UX-13).
      const hasZone = week(doc).some((i) => i.id === "week-zone" || (i.id === "week-hazard" && /hurricane evacuation zone/.test(i.text)));
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

/** Households that between them switch on every kind of step: all personas plus a spread of places and setups. */
const SPREAD: { name: string; a: Answers }[] = [
  { name: "sample", a: SAMPLE_HOUSEHOLD },
  ...PERSONAS,
  { name: "miami", a: at({ zip: "33101" }) },
  { name: "sf", a: at({ zip: "94110" }) },
  { name: "denver-wood", a: at({ zip: "80202", heatSources: ["wood"] }) },
  { name: "phoenix-apt", a: at({ zip: "85001", homeType: "apartment" }) },
  { name: "baby", a: at({ childrenAges: [0, 4], toddlerNeeds: ["diapers", "formula"] }) },
  { name: "solo", a: at({ adults: 1 }) },
];

describe("every recommendation has something for the customer", () => {
  it("every checklist step offers a Buy option in this plan, an official link, or a pointer to where the plan covers it", async () => {
    const empty: string[] = [];
    for (const p of SPREAD) {
      const doc = await plan(p.a);
      const products = productIndex(doc);
      for (const st of steps(doc)) {
        const r = resolveStep(st, products, href);
        if (!r.buy && !r.link && !r.see) empty.push(`${p.name}: ${st.text}`);
        // A pointer goes to a plan section, or to the dashboard's shopping list (which needs gear in the plan).
        if (r.see) expect(r.see.anchor === "shopping" ? (doc.overview?.gear.length ?? 0) > 0 : doc.sections.some((x) => x.id === r.see!.anchor), `${p.name}: ${r.see.anchor}`).toBe(true);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every section (except your answers and the gear list itself) ends with official links; its Buy ids are real catalog items", async () => {
    const ids = new Set(SEED_CATALOG.map((i) => i.id));
    for (const p of SPREAD) {
      const doc = await plan(p.a);
      for (const sec of doc.sections) {
        if (sec.id === "snapshot" || sec.id === "gear") continue;
        const help = sec.blocks.find((b) => b.type === "help");
        expect(help && help.type === "help" && help.links.length > 0, `${p.name}: ${sec.id}`).toBe(true);
        if (help?.type === "help") for (const id of help.buy) expect(ids.has(id), `${sec.id}: ${id}`).toBe(true);
      }
    }
    for (const id of ["priorities", "day0", "hazards", "water", "food", "cooking", "sanitation", "firstaid", "heat", "power", "comms", "security", "kids", "pets", "evacuation", "budget", "maintenance"])
      for (const b of sectionHelp(id, lookupZip("11746"))?.buy ?? []) expect(ids.has(b), `${id}: ${b}`).toBe(true);
  });
});
