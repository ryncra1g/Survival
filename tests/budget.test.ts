import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { computePlan } from "@/lib/rules/engine";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { budgetStatus, compareOptions } from "@/lib/plan/compare";
import type { LevelOption } from "@/lib/plan/document";
import { PERSONAS } from "./fixtures/personas";
import { at, SAMPLE_HOUSEHOLD } from "./fixtures/households";

const NOW = new Date("2026-11-18");
const households = [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)];
const BUDGETS = ["under_500", "500_1500", "1500_5000", "5000_plus"] as const;

describe("D3: safety items always come first", () => {
  it("CO alarms, then water, then first aid lead every shopping list, at every budget", () => {
    for (const a of households)
      for (const budget of BUDGETS) {
        const ids = computePlan({ ...a, budget }, DEFAULT_CONSTANTS, SEED_CATALOG, NOW).budget.picks.map((p) => p.item);
        expect(ids[0].id, `${a.zip} ${budget}`).toBe("co-alarm");
        expect(ids[1].group, `${a.zip} ${budget}`).toBe("water");
        expect(ids.findIndex((i) => i.id === "first-aid"), `${a.zip} ${budget}`).toBe(2);
      }
  });
  it("the first aid kit is never pushed out by the budget", () => {
    for (const a of households) {
      const b = computePlan({ ...a, budget: "under_500" }, DEFAULT_CONSTANTS, SEED_CATALOG, NOW).budget;
      expect(b.picks.some((p) => p.item.id === "first-aid")).toBe(true);
    }
  });
});

describe("D3: commission never affects ranking", () => {
  it("picks and their order are identical with or without affiliate links and an Associates tag", () => {
    const tagged = SEED_CATALOG.map((i) => ({ ...i, affiliateUrl: `https://example.com/aff/${i.id}` }));
    for (const a of households) {
      const plain = computePlan(a, DEFAULT_CONSTANTS, SEED_CATALOG, NOW).budget;
      const withTag = computePlan(a, { ...DEFAULT_CONSTANTS, affiliate: { amazonTag: "x-20" } }, SEED_CATALOG, NOW).budget;
      const withLinks = computePlan(a, DEFAULT_CONSTANTS, tagged, NOW).budget;
      const order = (b: typeof plain) => [...b.picks, ...b.deferred].map((p) => `${p.item.id}×${p.qty}`);
      expect(order(withTag)).toEqual(order(plain));
      expect(order(withLinks)).toEqual(order(plain));
    }
  });
});

describe("D3: Compare options", () => {
  const levels: LevelOption[] = [
    { level: "essential", name: "Jugs", price: "$40–60", selected: false, low: 40, high: 60 },
    { level: "standard", name: "7-gal", price: "$100–140", selected: true, low: 100, high: 140 },
    { level: "premium", name: "Bricks", price: "$300–400", selected: false, low: 300, high: 400 },
  ];
  const budget = { label: "$500–1,500", cap: 1500, totalLow: 1200, totalHigh: 1600 }; // mid 1,400

  it("shows the difference and new total, and how far over the stated budget it goes", () => {
    const c = compareOptions(levels, budget);
    expect(c.current?.level).toBe("standard");
    expect(c.lower).toEqual([{ level: "essential", name: "Jugs", price: "$40–60", diff: "−$70", newTotal: "$1,330", over: null }]);
    expect(c.upgrade).toEqual([{ level: "premium", name: "Bricks", price: "$300–400", diff: "+$230", newTotal: "$1,630", over: "$130 over your budget" }]);
  });
  it("never shows 'over' for the open-ended $5,000+ budget, and never changes the stated budget", () => {
    const open = { ...budget, cap: null, label: "$5,000+" };
    expect(compareOptions(levels, open).upgrade[0].over).toBeNull();
    expect(budgetStatus(open)).toBeNull();
    expect(budgetStatus({ ...budget, totalLow: 1600, totalHigh: 1800 })).toBe("$200 over your budget ($500–1,500)");
    expect(budget.cap).toBe(1500);
  });
  it("every plan carries its stated budget and gear total", () => {
    const r = computePlan(at({ budget: "500_1500" }), DEFAULT_CONSTANTS, SEED_CATALOG, NOW);
    expect(r.budget.picks.length).toBeGreaterThan(0);
  });
});
