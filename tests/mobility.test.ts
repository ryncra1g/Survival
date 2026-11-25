import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { KEEP_WATER_CLOSE } from "@/lib/plan/build";
import { compareOptions, heavyWarning } from "@/lib/plan/compare";
import { documentStrings } from "@/lib/safety/linter";
import { ALL_HOUSEHOLDS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/**
 * UX-12 + owner decision (PR #16): with limited mobility the default water container weighs 25 lb or less when full,
 * and water is kept close. The heavy containers come back as non-default choices in Compare options only, with a
 * weight warning; they are never picked or set aside automatically, and a person's own choice is honoured.
 */
const fullLb = (id: string) => SEED_CATALOG.find((i) => i.id === id)!.fullWeightLb!;
const isHeavy = (id: string) => (SEED_CATALOG.find((i) => i.id === id)?.fullWeightLb ?? 0) > C.water.mobilityMaxLb;

describe("water containers for households with mobility needs (UX-12, owner decision)", () => {
  it("the catalog weights: 1-gallon jugs are light; 7-gallon jugs and bricks are heavy; drums stay out", () => {
    expect(C.water.mobilityMaxLb).toBe(25);
    expect(fullLb("water-gallons")).toBeLessThanOrEqual(C.water.mobilityMaxLb);
    for (const id of ["water-jug", "water-bricks"]) expect(fullLb(id), id).toBeGreaterThan(C.water.mobilityMaxLb);
    expect(SEED_CATALOG.find((i) => i.id === "water-drum")?.tags).toContain("!mobility");
  });

  const mobility = ALL_HOUSEHOLDS.filter((h) => h.a.elderlyOrMobility);
  it("checks the households with mobility needs", () => expect(mobility.length).toBeGreaterThanOrEqual(3));
  for (const h of mobility) {
    for (const budget of ["under_500", "5000_plus"] as const) {
      it(`${h.id} (${budget}): the default is light; heavy containers are only Compare choices, with the warning`, async () => {
        const r = await buildPlan({ ...h.a, budget });
        const auto = [...r.computed.budget.picks, ...r.computed.budget.deferred].map((p) => p.item.id);
        expect(auto.filter(isHeavy)).toEqual([]);
        expect(auto).toContain("water-gallons");
        expect(r.computed.water.drums).toBe(0);
        const t = documentStrings(r.document).join("\n");
        expect(t).toContain(KEEP_WATER_CLOSE);
        expect(t).not.toMatch(/\d+ 7-gal jugs?\b/);
        // Compare options for the water slot: the heavy levels are there, not selected, each with its weight.
        const slot = r.document.sections.flatMap((s) => s.blocks).flatMap((b) => (b.type === "products" ? b.items : [])).find((i) => i.group === "water")!;
        const heavyLevels = slot.levels!.filter((l) => l.heavyLb);
        expect(heavyLevels.map((l) => l.level).sort()).toEqual(["premium", "standard"]);
        expect(heavyLevels.every((l) => !l.selected)).toBe(true);
        const rows = [...compareOptions(slot.levels!, r.document.overview!.budget).upgrade];
        for (const row of rows) expect(row.heavyLb, row.name).toBeGreaterThan(C.water.mobilityMaxLb);
        expect(heavyWarning(62)).toBe("Heavy when full (about 62 lb). Choose only if someone can lift it, or store it where you'll use it.");
      });
    }
  }

  it("choosing a heavy container in Compare is honoured, with the right count", async () => {
    const h = ALL_HOUSEHOLDS.find((x) => x.id === "elderly-mobility")!.a;
    const jug = await buildPlan({ ...h, gearChoices: { water: "standard" } });
    const pick = jug.computed.budget.picks.find((p) => p.item.group === "water")!;
    expect(pick.item.id).toBe("water-jug");
    expect(pick.qty).toBe(Math.ceil(jug.computed.water.storedGal / C.water.jugGallons));
    const t = documentStrings(jug.document).join("\n");
    expect(t).toMatch(new RegExp(`${pick.qty} 7-gal jugs`));
    expect(t).not.toContain("1-gallon jugs or cases");
    expect(t).toContain("heavy when full (about 62 lb each)");
    expect(t).toContain(KEEP_WATER_CLOSE);
    const bricks = await buildPlan({ ...h, gearChoices: { water: "premium" } });
    expect(bricks.computed.budget.picks.find((p) => p.item.group === "water")!.item.id).toBe("water-bricks");
  });

  it("without mobility needs, nothing changes: 7-gallon jugs are still the standard pick, with no warning", async () => {
    const r = await buildPlan(ALL_HOUSEHOLDS.find((h) => h.id === "toddlers")!.a);
    expect(r.computed.budget.picks.some((p) => p.item.id === "water-jug")).toBe(true);
    expect(documentStrings(r.document).join("\n")).not.toContain(KEEP_WATER_CLOSE);
    expect(JSON.stringify(r.document)).not.toContain("heavyLb");
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
