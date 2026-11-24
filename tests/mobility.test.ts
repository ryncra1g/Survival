import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { KEEP_WATER_CLOSE } from "@/lib/plan/build";
import { documentStrings } from "@/lib/safety/linter";
import { ALL_HOUSEHOLDS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/** UX-12: with limited mobility, water containers weigh 25 lb or less when full, and water is kept close. */
const CONTAINER_GAL: Record<string, number> = { "water-gallons": 1, "water-jug": 7, "water-bricks": 3.5, "water-drum": 55 };
const fullLb = (gal: number) => gal * C.water.lbPerGallon;

describe("water containers for households with mobility needs (UX-12)", () => {
  it("the rule: 1-gallon jugs are under the limit; 7-gal jugs, bricks and drums are over it", () => {
    expect(C.water.mobilityMaxLb).toBe(25);
    expect(fullLb(C.water.liftableGallons)).toBeLessThanOrEqual(C.water.mobilityMaxLb);
    for (const id of ["water-jug", "water-bricks", "water-drum"]) {
      expect(fullLb(CONTAINER_GAL[id])).toBeGreaterThan(C.water.mobilityMaxLb);
      expect(SEED_CATALOG.find((i) => i.id === id)?.tags).toContain("!mobility");
    }
  });

  const mobility = ALL_HOUSEHOLDS.filter((h) => h.a.elderlyOrMobility);
  it("checks the households with mobility needs", () => expect(mobility.length).toBeGreaterThanOrEqual(3));
  for (const h of mobility) {
    for (const budget of ["under_500", "5000_plus"] as const) {
      it(`${h.id} (${budget}): every water container offered is liftable, and the plan says to keep water close`, async () => {
        const r = await buildPlan({ ...h.a, budget });
        const offered = [...r.computed.budget.picks, ...r.computed.budget.deferred].map((p) => p.item.id).filter((id) => id in CONTAINER_GAL);
        expect(offered.length).toBeGreaterThan(0);
        for (const id of offered) expect(fullLb(CONTAINER_GAL[id]), id).toBeLessThanOrEqual(C.water.mobilityMaxLb);
        expect(r.computed.water.drums).toBe(0);
        const t = documentStrings(r.document).join("\n");
        expect(t).toContain(KEEP_WATER_CLOSE);
        expect(t).not.toMatch(/7-gal(lon)? jug|55-gal drum|water bricks/i);
      });
    }
  }

  it("without mobility needs, nothing changes: 7-gallon jugs are still the standard pick", async () => {
    const r = await buildPlan(ALL_HOUSEHOLDS.find((h) => h.id === "toddlers")!.a);
    expect(r.computed.budget.picks.some((p) => p.item.id === "water-jug")).toBe(true);
    expect(documentStrings(r.document).join("\n")).not.toContain(KEEP_WATER_CLOSE);
  });
});

describe("UX-12 numbers come from the constants (code review)", () => {
  it("the constants schema rejects a liftable container heavier than the limit", async () => {
    const { RuleConstantsSchema } = await import("@/lib/rules/constants");
    expect(RuleConstantsSchema.safeParse(C).success).toBe(true);
    expect(RuleConstantsSchema.safeParse({ ...C, water: { ...C.water, liftableGallons: 7 } }).success).toBe(false);
  });
  it("the plan text follows liftableGallons", async () => {
    const two = { ...C, water: { ...C.water, liftableGallons: 2 } };
    const r = await buildPlan(ALL_HOUSEHOLDS.find((h) => h.id === "elderly-mobility")!.a, { ...two, affiliate: { amazonTag: "test-20" } } as never);
    const t = documentStrings(r.document).join("\n");
    expect(t).toContain("2-gallon jugs or cases (about 17 lb");
    expect(t).not.toContain("1-gallon jugs or cases");
  });
});
