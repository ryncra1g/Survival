import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { computeFood, computeFoodMix, computePlan, defaultFoodMix, mixLabel } from "@/lib/rules/engine";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { withGearChoice } from "@/lib/answers/schema";
import { documentStrings } from "@/lib/safety/linter";
import { PERSONAS } from "./fixtures/personas";
import { at, SAMPLE_HOUSEHOLD } from "./fixtures/households";
import { buildPlan } from "./helpers/build";

const NOW = new Date("2026-11-18");

describe("D7: food approaches", () => {
  it("default mix follows the eating order (hand-computed)", () => {
    // 90 days, house with gas: ready-to-eat covers 14 of 90 days, bulk staples the other 76.
    expect(defaultFoodMix(SAMPLE_HOUSEHOLD)).toEqual({ bulk: 76 / 90, ready: 14 / 90, kits: 0 });
    // 14 days or less: all ready-to-eat.
    expect(defaultFoodMix(at({ scenarioDays: 14 }))).toEqual({ bulk: 0, ready: 1, kits: 0 });
    // 30 days: 14/30 ready, 16/30 bulk.
    expect(defaultFoodMix(at({ scenarioDays: 30 }))).toEqual({ bulk: 16 / 30, ready: 14 / 30, kits: 0 });
    // No suitable storage, or an apartment with an electric stove and no backup power: all ready-to-eat.
    expect(defaultFoodMix(at({ scenarioDays: 90, storage: ["none"] })).ready).toBe(1);
    expect(defaultFoodMix(at({ scenarioDays: 90, homeType: "apartment", cooking: "electric", backupPower: "none", storage: ["closets"] })).ready).toBe(1);
    // $5,000+: a quarter of the bulk share becomes kits.
    const rich = defaultFoodMix({ ...SAMPLE_HOUSEHOLD, budget: "5000_plus" });
    expect(rich.kits).toBeCloseTo((76 / 90) * 0.25, 10);
    expect(rich.bulk + rich.ready + rich.kits).toBeCloseTo(1, 10);
  });

  it("the calorie total never changes, whatever the choice", () => {
    for (const a of [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)]) {
      const food = computeFood(a, C);
      for (const lvl of ["mix", "essential", "standard", "premium"] as const) {
        const m = computeFoodMix(withGearChoice(a, "food", lvl), C, food);
        expect(m.kcal.bulk + m.kcal.ready + m.kcal.kits, `${a.zip} ${lvl}`).toBe(food.totalKcal);
      }
    }
  });

  it("all bulk staples gives exactly the full staples list; containers only with bulk staples, sized to the pounds", () => {
    const food = computeFood(SAMPLE_HOUSEHOLD, C);
    const bulk = computeFoodMix(withGearChoice(SAMPLE_HOUSEHOLD, "food", "essential"), C, food);
    expect(bulk.bulk.totalLbs).toBe(food.totalLbs);
    expect(bulk.bulk.cost).toBe(food.cost);
    // Buckets count dry staples only, each at its own lb per bucket (canned goods, oil and peanut butter excluded).
    const dry = food.staples.filter((s) => ["rice", "beans", "oats", "pasta", "milk_powder"].includes(s.key));
    expect(bulk.bulk.dryLbs).toBe(dry.reduce((t, s) => t + s.lbs, 0));
    expect(bulk.bulk.buckets).toBe(Math.ceil(dry.reduce((t, s) => t + s.lbs / C.staples.find((x) => x.key === s.key)!.bucketLbs!, 0)));
    const ready = computeFoodMix(withGearChoice(SAMPLE_HOUSEHOLD, "food", "standard"), C, food);
    expect(ready.bulk.buckets).toBe(0);
    expect(ready.readyCost).toBe(Math.round((food.totalKcal / 1000) * C.foodMix.readyCostPer1000Kcal));
    const plan = (lvl: "essential" | "standard") => computePlan(withGearChoice(SAMPLE_HOUSEHOLD, "food", lvl), C, SEED_CATALOG, NOW);
    const b = plan("essential").budget; // bought now, or listed as "buy next" when the budget is full
    expect([...b.picks, ...b.deferred].find((p) => p.item.id === "storage-kit")?.qty).toBe(bulk.bulk.buckets);
    expect([...plan("standard").budget.picks, ...plan("standard").budget.deferred].some((p) => p.item.id === "storage-kit")).toBe(false);
  });

  it("sample household (recommended mix): 8 buckets, hand-computed", () => {
    // 630,000 kcal; ready-to-eat covers 14 of 90 days, so bulk = 630,000 × 76/90 = 532,000 kcal.
    // rice   532,000 × 0.26 / 1650 = 83.8 → 84 lb ÷ 33 = 2.545
    // beans  532,000 × 0.13 / 1550 = 44.6 → 45 lb ÷ 30 = 1.5
    // oats   532,000 × 0.10 / 1700 = 31.3 → 32 lb ÷ 20 = 1.6
    // pasta  532,000 × 0.10 / 1680 = 31.7 → 32 lb ÷ 20 = 1.6
    // milk   532,000 × 0.05 / 1650 = 16.1 → 17 lb ÷ 25 = 0.68
    // total 7.925 → 8 buckets for 210 lb of dry staples (peanut butter, oil and cans excluded)
    const m = computeFoodMix(SAMPLE_HOUSEHOLD, C, computeFood(SAMPLE_HOUSEHOLD, C));
    expect(m.choice).toBe("mix");
    expect(m.bulk.staples.filter((s) => ["rice", "beans", "oats", "pasta", "milk_powder"].includes(s.key)).map((s) => s.lbs)).toEqual([84, 45, 32, 32, 17]);
    expect(m.bulk.dryLbs).toBe(210);
    expect(m.bulk.buckets).toBe(8);
  });

  it("the plan states the mix, the comparison and the notes, with no can or pouch counts", async () => {
    const r = await buildPlan({ ...SAMPLE_HOUSEHOLD, budget: "5000_plus" });
    const t = documentStrings(r.document).join("\n");
    expect(t).toContain(`Your mix: ${mixLabel(r.computed.foodMix.shares)}`);
    expect(t).toContain("Compare food options");
    expect(t).toContain("Ration bars are for go-bags and the first days, not your whole supply.");
    expect(t).toContain("Freeze-dried meals need hot water: count it in your water and cooking fuel.");
    expect(t).toContain("Adjust for any allergies or diets in your household.");
    expect(t).not.toMatch(/\d+\s*(cans?|pouches)\b/i);
  });
});
