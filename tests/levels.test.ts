import { describe, expect, it } from "vitest";
import { GEAR_SLOTS, hasHouseholdFilter, isDrive, withGearChoice, type Answers } from "@/lib/answers/schema";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { documentStrings, lintDocument } from "@/lib/safety/linter";
import { PERSONAS } from "./fixtures/personas";
import { SAMPLE_HOUSEHOLD } from "./fixtures/households";

/**
 * À la carte levels, looped over the 10 focus-group households: every slot × every level is rebuilt
 * and checked (choice honoured, safety, don't-sell-what-they-have, exclusions, totals).
 */
const NOW = new Date("2026-11-18");
const plan = (a: Answers) => generatePlan(a, C, SEED_CATALOG, { useLlm: false, now: NOW });
const RANK = { mix: -1, essential: 0, standard: 1, premium: 2 } as const;
const FUEL_GEAR = ["gas-cans", "gen-cord", "propane-20", "inlet-interlock", "buddy-heater", "propane-1lb", "camp-stove"];

describe("à la carte levels: 10 households × every slot × every level", () => {
  it.each(PERSONAS.map((p) => [p.name, p.a] as const))("%s", async (_name, base) => {
    const b = await plan(base);
    const slots = b.computed.budget.slots;
    expect(slots.length).toBeGreaterThan(1);
    for (const slot of slots) {
      // levels are listed cheapest first and get more expensive
      // The food slot lists approaches (recommended mix, bulk, ready-to-eat, kits), not price levels (D7).
      if (slot.group !== "food") for (let i = 1; i < slot.options.length; i++) {
        expect(RANK[slot.options[i].level]).toBeGreaterThan(RANK[slot.options[i - 1].level]);
        expect(slot.options[i].high).toBeGreaterThanOrEqual(slot.options[i - 1].low);
      }
      for (const opt of slot.options) {
        const a = withGearChoice(base, slot.group as (typeof GEAR_SLOTS)[number], opt.level);
        const r = await plan(a);
        const why = `${slot.group}=${opt.level}`;
        const s2 = r.computed.budget.slots.find((x) => x.group === slot.group)!;
        expect(s2.chosen, why).toBe(opt.itemId);
        expect(lintDocument(r.document), why).toEqual([]);
        const all = [...r.computed.budget.picks, ...r.computed.budget.deferred];
        if (!["food-diy", "food-ready", "food-mix"].includes(opt.itemId)) expect(r.computed.budget.picks.some((p) => p.item.id === opt.itemId), why).toBe(true);
        // a standby generator replaces fuel cans, cords, the inlet and propane cylinders
        if (opt.itemId === "generator-standby") for (const id of ["gas-cans", "gen-cord", "propane-20", "inlet-interlock"]) expect(all.some((p) => p.item.id === id), `${why} ${id}`).toBe(false);
        // apartments never get fuel-burning gear at any level
        if (a.homeType === "apartment") for (const id of FUEL_GEAR) expect(all.some((p) => p.item.id === id), `${why} ${id}`).toBe(false);
        // the plan shows the chosen level wherever the slot appears
        expect(documentStrings(r.document).join("\n")).toContain(opt.name);
      }
    }
    // never offered: what they already have, at any level
    if (base.backupPower !== "none") expect(slots.some((x) => x.group === "generator")).toBe(false);
    if (base.backupPower === "solar_battery") expect(slots.some((x) => x.group === "battery-house")).toBe(false);
    if (hasHouseholdFilter(base)) expect(slots.some((x) => x.group === "filter")).toBe(false);
    // bug-out slots only for households with a fallback location; shelter only for raw land
    expect(slots.some((x) => x.group === "go-bag")).toBe(isDrive(base.evacuation.destination) && !!base.evacuation.distanceMiles);
    expect(slots.some((x) => x.group === "shelter")).toBe(base.evacuation.destination === "raw_land");
  }, 120_000);

  it("default level follows the budget; a choice overrides it", async () => {
    const level = async (a: Answers, g: string) => (await plan(a)).computed.budget.slots.find((x) => x.group === g)?.chosenLevel;
    expect(await level({ ...SAMPLE_HOUSEHOLD, budget: "under_500" }, "water")).toBe("essential");
    expect(await level({ ...SAMPLE_HOUSEHOLD, budget: "1500_5000" }, "water")).toBe("standard");
    expect(await level({ ...SAMPLE_HOUSEHOLD, budget: "5000_plus" }, "water")).toBe("premium");
    expect(await level({ ...SAMPLE_HOUSEHOLD, budget: "under_500", gearChoices: { water: "premium" } }, "water")).toBe("premium");
  });

  it("premium food swaps DIY staples for freeze-dried, sized by the rules", async () => {
    const r = await plan({ ...SAMPLE_HOUSEHOLD, gearChoices: { food: "premium" } });
    const fd = r.computed.budget.picks.find((p) => p.item.id === "food-freeze-dried")!;
    expect(fd.qty).toBe(11); // ceil(630,000 kcal / (2,000 kcal × 30 days) = 10.5)
    expect(r.computed.budget.consumables.some((l) => l.key === "food" || l.key === "food_rest")).toBe(false);
    // the DIY staples list (quantities) is still in the plan for reference
    expect(documentStrings(r.document).join("\n")).toMatch(/White rice/);
  });

  it("going premium everywhere costs more than going essential everywhere", async () => {
    const every = (lvl: "essential" | "premium") =>
      plan({ ...SAMPLE_HOUSEHOLD, budget: "5000_plus", gearChoices: { water: lvl, generator: lvl, filter: lvl, "two-way": lvl, "go-bag": lvl, shelter: lvl, "vehicle-kit": lvl, "battery-house": lvl } });
    const [lo, hi] = await Promise.all([every("essential"), every("premium")]);
    expect(hi.computed.budget.totalMid).toBeGreaterThan(lo.computed.budget.totalMid);
    expect(hi.computed.budget.picks.some((p) => p.item.id === "generator-standby")).toBe(true);
    expect(hi.computed.budget.picks.some((p) => p.item.id === "canvas-tent")).toBe(true);
  });

  it("a $5,000+ raw-land household sees the luxury cabin option", async () => {
    const r = await plan({ ...SAMPLE_HOUSEHOLD, budget: "5000_plus" });
    expect([...r.computed.budget.picks, ...r.computed.budget.deferred].some((p) => p.item.id === "raw-land-cabin")).toBe(true);
  });
});
