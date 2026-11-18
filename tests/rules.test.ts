import { describe, expect, it } from "vitest";
import { DEFAULT_CONSTANTS as C, mergeConstants } from "@/lib/rules/constants";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import {
  childCalories,
  computeDiapers,
  computeFood,
  computePlan,
  computePower,
  computeSanitation,
  computeWater,
  household,
} from "@/lib/rules/engine";
import { lookupZip } from "@/lib/zip/profile";
import { at, SAMPLE_HOUSEHOLD } from "./fixtures/households";

// Expected values below are worked out by hand from the constants, not copied from output.

describe("water", () => {
  it("sample household: 2 adults, 2 kids, medium dog, 90 days", () => {
    const w = computeWater(SAMPLE_HOUSEHOLD, C);
    expect(w.dailyGal).toBe(3.85); // 2×1 + 2×0.75 + 0.35
    expect(w.storedDays).toBe(14); // min(14, 90)
    expect(w.storedGal).toBe(54); // ceil(3.85 × 14 = 53.9)
    expect(w.filterDays).toBe(76);
    expect(w.filterGal).toBe(293); // ceil(3.85 × 76 = 292.6)
    expect(w.jugs).toBe(8); // ceil(54 / 7)
    expect(w.drums).toBe(0); // 54 ≤ 60 drum threshold
    expect(w.threeDayGal).toBe(12); // ceil(11.55)
  });

  it("72-hour single adult stores everything, no filtration", () => {
    const w = computeWater(at({ adults: 1, scenarioDays: 3 }), C);
    expect(w.dailyGal).toBe(1);
    expect(w.storedGal).toBe(3);
    expect(w.filterDays).toBe(0);
    expect(w.filterGal).toBe(0);
  });

  it("stored target is capped at 14 days for 30-day scenarios", () => {
    const w = computeWater(at({ adults: 2, childrenAges: [], scenarioDays: 30 }), C);
    expect(w.storedGal).toBe(28);
    expect(w.filterGal).toBe(32);
  });

  it("uses drums for large stored volumes with garage/basement space", () => {
    // 6 adults × 14 days = 84 gal > 60 threshold; drums = floor(84×0.75/55)=1; jugs = ceil((84−55)/7)=5
    const w = computeWater(at({ adults: 6, scenarioDays: 14, storage: ["basement"] }), C);
    expect(w.storedGal).toBe(84);
    expect(w.drums).toBe(1);
    expect(w.jugs).toBe(5);
  });

  it("never puts drums in apartments", () => {
    const w = computeWater(at({ adults: 6, scenarioDays: 14, storage: ["basement"], homeType: "apartment" }), C);
    expect(w.drums).toBe(0);
    expect(w.jugs).toBe(12);
  });

  it("pet water by size and type", () => {
    const w = computeWater(
      at({
        adults: 1,
        scenarioDays: 3,
        pets: [
          { type: "dog", count: 2, size: "large", specialDiet: false, medications: false },
          { type: "cat", count: 1, size: "small", specialDiet: false, medications: false },
        ],
      }),
      C,
    );
    expect(w.dailyGal).toBe(2.3); // 1 + 2×0.6 + 0.1
  });
});

describe("calories & food", () => {
  it("child age bands", () => {
    expect(childCalories(0, C)).toBe(800);
    expect(childCalories(2, C)).toBe(1000);
    expect(childCalories(3, C)).toBe(1000);
    expect(childCalories(4, C)).toBe(1400);
    expect(childCalories(8, C)).toBe(1400);
    expect(childCalories(9, C)).toBe(1800);
    expect(childCalories(14, C)).toBe(2200);
  });

  it("sample household daily and total calories", () => {
    const f = computeFood(SAMPLE_HOUSEHOLD, C);
    expect(f.dailyKcal).toBe(7000); // 2×2300 + 1000 + 1400
    expect(f.totalKcal).toBe(630000); // × 90
  });

  it("staple pounds and units", () => {
    const f = computeFood(SAMPLE_HOUSEHOLD, C);
    const get = (k: string) => f.staples.find((s) => s.key === k)!;
    // rice: 630000 × 0.26 = 163800 kcal / 1650 = 99.27 → 100 lb → 5 × 20-lb bags
    expect(get("rice").lbs).toBe(100);
    expect(get("rice").units).toBe(5);
    // beans: 630000 × 0.13 = 81900 / 1550 = 52.84 → 53 lb → 6 × 10-lb bags
    expect(get("beans").lbs).toBe(53);
    expect(get("beans").units).toBe(6);
    // oil: 630000 × 0.08 = 50400 / 4000 = 12.6 → 13 lb → 2 × 1-gal jugs (7.6 lb)
    expect(get("oil").lbs).toBe(13);
    expect(get("oil").units).toBe(2);
    // peanut butter: 50400 / 2650 = 19.02 → 20 lb → 8 × 40-oz jars
    expect(get("peanut_butter").lbs).toBe(20);
    expect(get("peanut_butter").units).toBe(8);
  });

  it("staple shares sum to 1 so every calorie is allocated", () => {
    const f = computeFood(SAMPLE_HOUSEHOLD, C);
    expect(f.staples.reduce((t, s) => t + s.kcal, 0)).toBeCloseTo(630000, -1);
  });
});

describe("diapers", () => {
  it("sample: one child in diapers for 90 days, split current/next size", () => {
    const h = household(SAMPLE_HOUSEHOLD, C);
    const d = computeDiapers(SAMPLE_HOUSEHOLD, C, h)!;
    expect(h.childrenInDiapers).toBe(1); // age 2 only (age 4 is over maxAge 3)
    expect(d.perDay).toBe(6);
    expect(d.total).toBe(540);
    expect(d.currentSize).toBe(270);
    expect(d.nextSize).toBe(270);
    expect(d.wipes).toBe(720);
    expect(d.wipesPacks).toBe(9);
  });

  it("no next-size split at 30 days or less", () => {
    const a = at({ childrenAges: [1, 1], toddlerNeeds: ["diapers"], scenarioDays: 30 });
    const d = computeDiapers(a, C, household(a, C))!;
    expect(d.total).toBe(360); // 2 × 6 × 30
    expect(d.nextSize).toBe(0);
  });

  it("no diapers unless selected", () => {
    const a = at({ childrenAges: [1], toddlerNeeds: [] });
    expect(computeDiapers(a, C, household(a, C))).toBeNull();
  });
});

describe("toilet paper", () => {
  it("1 roll/person/week, weeks rounded up", () => {
    const s = computeSanitation(SAMPLE_HOUSEHOLD, C, household(SAMPLE_HOUSEHOLD, C));
    expect(s.weeks).toBe(13); // ceil(90/7)
    expect(s.toiletPaperRolls).toBe(52); // 4 × 13
    const s3 = computeSanitation(at({ adults: 2, scenarioDays: 3 }), C, household(at({ adults: 2, scenarioDays: 3 }), C));
    expect(s3.toiletPaperRolls).toBe(2);
  });
});

describe("generator fuel math", () => {
  const li = lookupZip("11746");
  it("gas furnace in a moderate-winter climate runs 12 h/day", () => {
    const p = computePower(SAMPLE_HOUSEHOLD, C, li, { furnaceNeedsPower: true });
    expect(p.hoursPerDay).toBe(12);
    expect(p.gasolineGalPerDay).toEqual([3, 4.8]); // 12 × 0.25, 12 × 0.4
    expect(p.propaneGalPerDay).toEqual([4.2, 7.2]); // 12 × 0.35, 12 × 0.6
    expect(p.storedGasolineGal).toBe(30);
    expect(p.storedGasolineDays).toEqual([6.3, 10]); // 30/4.8 = 6.25 → 6.3; 30/3 = 10
    expect(p.gasolineTable.find((r) => r.gallons === 20)).toEqual({ gallons: 20, daysLow: 4.2, daysHigh: 6.7 });
    expect(p.propane20lbDays).toEqual([0.7, 1.1]); // 4.7/7.2 = 0.65; 4.7/4.2 = 1.12
    expect(p.gasCans).toBe(6);
    expect(p.generatorStatus).toBe("recommended");
  });

  it("electric heat can't be run by a portable generator: 6 h/day", () => {
    const a = at({ heatSources: ["electric"] });
    expect(computePower(a, C, li, { furnaceNeedsPower: false }).hoursPerDay).toBe(6);
  });

  it("warm climate uses non-winter hours even with a gas furnace", () => {
    const miami = lookupZip("33101");
    expect(miami.winter).toBe("none");
    expect(computePower(at({ zip: "33101" }), C, miami, { furnaceNeedsPower: true }).hoursPerDay).toBe(6);
  });

  it("apartments never get a generator recommendation", () => {
    const a = at({ homeType: "apartment", hasYard: false, hasGarage: false });
    expect(computePower(a, C, li, { furnaceNeedsPower: true }).generatorStatus).toBe("not_recommended");
  });
});

describe("whole plan", () => {
  const cp = computePlan(SAMPLE_HOUSEHOLD, C, SEED_CATALOG, new Date("2026-11-18"));
  it("evacuation fuel", () => {
    expect(cp.evacuation!.oneWayGalPerVehicle).toBe(4.8); // 120 / 25
    expect(cp.evacuation!.reserveGalPerVehicle).toBe(7.2); // × 1.5
  });
  it("heat strategy for gas furnace, no backup, cold winter", () => {
    expect(cp.heat).toEqual(["generator_inlet_furnace", "indoor_propane_heater", "one_warm_room", "pipe_freeze"]);
  });
  it("budget stays within planning amount except essentials", () => {
    expect(cp.budget.totalMid).toBeLessThanOrEqual(cp.budget.planningAmount);
    expect(cp.budget.picks.some((p) => p.item.id === "co-alarm")).toBe(true);
  });
  it("gas cans are only bought together with a generator", () => {
    const hasGen = cp.budget.picks.some((p) => p.item.group === "generator");
    const hasCans = cp.budget.picks.some((p) => p.item.id === "gas-cans");
    expect(hasCans).toBe(hasGen);
  });
  it("well and medical device flags", () => {
    const m = computePlan(at({ waterSource: "well", poweredDevices: ["cpap"], budget: "under_500" }), C, SEED_CATALOG, new Date("2026-11-18"));
    expect(m.flags.wellPumpPriority).toBe(true);
    expect(m.flags.medicalDevicePriority).toBe(true);
    expect(m.budget.picks.some((p) => p.item.id === "med-battery")).toBe(true); // essential even on a small budget
  });
  it("stale catalog items are hidden", () => {
    const stale = SEED_CATALOG.map((i) => (i.id === "radio" ? { ...i, reviewedAt: "2025-01-01" } : i));
    const r = computePlan(SAMPLE_HOUSEHOLD, C, stale, new Date("2026-11-18"));
    expect(r.budget.staleHidden).toContain("radio");
    expect(r.budget.picks.some((p) => p.item.id === "radio")).toBe(false);
  });
});

describe("constants overrides", () => {
  it("deep-merges and recomputes", () => {
    const c = mergeConstants({ water: { adultGalPerDay: 1.5 } });
    expect(c.water.childGalPerDay).toBe(0.75);
    expect(computeWater(at({ adults: 2, scenarioDays: 3 }), c).storedGal).toBe(9);
  });
  it("rejects invalid overrides", () => {
    expect(() => mergeConstants({ water: { adultGalPerDay: -1 } })).toThrow();
    expect(() => mergeConstants({ staples: [{ key: "x", name: "x", share: 0.5, kcalPerLb: 1, unit: "lb", unitLbs: 1, costPerUnit: 1 }] })).toThrow();
  });
});

describe("zip lookup", () => {
  it("Long Island is coastal with hurricane/flood risk", () => {
    const z = lookupZip("11746");
    expect(z.region).toBe("Long Island");
    expect(z.hurricane).toBe("high");
    expect(z.winter).toBe("moderate");
  });
  it("unknown prefix falls back to approximate defaults", () => {
    expect(lookupZip("00000").approximate).toBe(true);
  });
});
