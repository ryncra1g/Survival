import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { computePlan } from "@/lib/rules/engine";
import { PlanDocumentSchema } from "@/lib/plan/document";
import { gotId } from "@/components/BuyIfNeeded";
import { PERSONAS } from "./fixtures/personas";
import { SAMPLE_HOUSEHOLD } from "./fixtures/households";

const NOW = new Date("2026-11-18");

describe("plan dashboard data", () => {
  it("headline numbers come straight from the rules engine, with their math", async () => {
    const r = await generatePlan(SAMPLE_HOUSEHOLD, C, SEED_CATALOG, { useLlm: false, now: NOW });
    const cp = computePlan(SAMPLE_HOUSEHOLD, C, SEED_CATALOG, NOW);
    const stat = (k: string) => r.document.overview!.stats.find((s) => s.key === k)!;
    expect(stat("water").value).toBe(`${cp.water.storedGal.toLocaleString("en-US")} gal`);
    expect(stat("water").math).toMatch(/gal\/day × \d+ days/);
    expect(stat("food").value).toBe(cp.food.totalKcal.toLocaleString("en-US"));
    expect(stat("cash").value).toBe(`$${cp.cash.total.toLocaleString("en-US")}`);
  });

  it("the gear list is exactly the plan's gear (picks + later), with line totals, for every persona", async () => {
    for (const p of [{ name: "sample", a: SAMPLE_HOUSEHOLD }, ...PERSONAS]) {
      const r = await generatePlan(p.a, C, SEED_CATALOG, { useLlm: false, now: NOW });
      const cp = computePlan(p.a, C, SEED_CATALOG, NOW);
      const ov = r.document.overview!;
      expect(ov.gear.map((g) => g.itemId).sort(), p.name).toEqual([...cp.budget.picks, ...cp.budget.deferred].map((x) => x.item.id).sort());
      for (const g of ov.gear) {
        const it = SEED_CATALOG.find((i) => i.id === g.itemId)!;
        expect(g.low, `${p.name} ${g.itemId}`).toBe(it.priceLow * g.qty);
        expect(gotId(g.itemId)).toMatch(/^[a-z0-9-]{1,40}$/); // accepted by PUT /api/plans/<id>/checks
      }
      for (const s of ov.stats) expect(r.document.sections.some((x) => x.id === s.anchor), `${p.name} ${s.anchor}`).toBe(true);
      expect(PlanDocumentSchema.safeParse(r.document).success).toBe(true);
    }
  });

  it("older saved plans without dashboard data still parse", async () => {
    const r = await generatePlan(SAMPLE_HOUSEHOLD, C, SEED_CATALOG, { useLlm: false, now: NOW });
    const old = { ...r.document, overview: undefined };
    expect(PlanDocumentSchema.safeParse(old).success).toBe(true);
  });
});
