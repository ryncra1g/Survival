import { describe, expect, it } from "vitest";
import { DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { documentStrings, lintDocument } from "@/lib/safety/linter";

/**
 * Pathway coverage: every answer must change the plan, and what someone already has (or doesn't)
 * must steer products, skills and considerations correctly. See docs/PATHWAYS.md.
 */
const NOW = new Date("2026-11-18");
type Plan = Awaited<ReturnType<typeof generatePlan>>;
const plan = (a: Answers) => generatePlan(a, C, SEED_CATALOG, { useLlm: false, now: NOW });
const text = (r: Plan) => documentStrings(r.document).join("\n");
const picked = (r: Plan, id: string) => r.computed.budget.picks.some((p) => p.item.id === id);
const offered = (r: Plan, id: string) => picked(r, id) || r.computed.budget.deferred.some((p) => p.item.id === id);
const section = (r: Plan, id: string) => r.document.sections.some((s) => s.id === id);

const BASE: Answers = {
  ...DEFAULT_ANSWERS,
  zip: "11746",
  homeType: "house",
  hasYard: false,
  hasGarage: false,
  storage: ["closets"],
  vehicleFuels: ["gas"],
  evacuation: { mode: "fallback", locationType: "friends_family", distanceMiles: 120 },
};

// ------------------------------------------------------------------ 1. every answer matters
const VARIANTS: [string, Partial<Answers>][] = [
  ["scenario 72h", { scenarioDays: 3 }], ["scenario 30d", { scenarioDays: 30 }], ["scenario 90d", { scenarioDays: 90 }],
  ["more adults", { adults: 4 }], ["a child", { childrenAges: [8] }], ["elderly/mobility", { elderlyOrMobility: true }],
  ["diapers", { childrenAges: [1], toddlerNeeds: ["diapers"] }], ["formula", { childrenAges: [0], toddlerNeeds: ["formula"] }], ["toddler milk", { childrenAges: [2], toddlerNeeds: ["milk"] }],
  ["dog", { pets: [{ type: "dog", count: 1, size: "large", specialDiet: false, medications: false }] }],
  ["cat", { pets: [{ type: "cat", count: 1, size: "small", specialDiet: false, medications: false }] }],
  ["other pet", { pets: [{ type: "other", count: 1, size: "small", specialDiet: false, medications: false }] }],
  ["pet special diet", { pets: [{ type: "dog", count: 1, size: "small", specialDiet: true, medications: false }] }],
  ["pet medication", { pets: [{ type: "dog", count: 1, size: "small", specialDiet: false, medications: true }] }],
  ["prescriptions", { hasPrescriptions: true }], ["CPAP", { poweredDevices: ["cpap"] }], ["oxygen", { poweredDevices: ["oxygen"] }], ["nebulizer", { poweredDevices: ["nebulizer"] }],
  ["townhouse", { homeType: "townhouse" }], ["apartment", { homeType: "apartment" }], ["1 floor", { floors: 1 }], ["4 floors", { floors: 4 }],
  ["basement", { hasBasement: true }], ["garage", { hasGarage: true }], ["yard", { hasYard: true }],
  ["oil heat", { heatSources: ["oil"] }], ["propane heat", { heatSources: ["propane"] }], ["electric heat", { heatSources: ["electric"] }], ["wood heat", { heatSources: ["wood"] }],
  ["electric stove", { cooking: "electric" }], ["induction stove", { cooking: "induction" }],
  ["well", { waterSource: "well" }], ["has filter", { hasFiltration: true, scenarioDays: 30 }],
  ["portable generator", { backupPower: "portable_generator" }], ["standby generator", { backupPower: "standby_generator" }], ["solar + battery", { backupPower: "solar_battery" }],
  ["no vehicle", { vehicleFuels: [] }], ["diesel", { vehicleFuels: ["diesel"] }], ["EV", { vehicleFuels: ["ev"] }], ["hybrid", { vehicleFuels: ["hybrid"] }],
  ["storage garage", { storage: ["garage"] }], ["storage basement", { storage: ["basement"] }], ["storage shed", { storage: ["shed"] }], ["storage limited", { storage: ["limited"] }],
  ["shelter only", { evacuation: { mode: "shelter_only" } }], ["second property", { evacuation: { mode: "fallback", locationType: "second_property", distanceMiles: 120 } }],
  ["raw land", { evacuation: { mode: "fallback", locationType: "raw_land", distanceMiles: 120 } }], ["far fallback", { evacuation: { mode: "fallback", locationType: "friends_family", distanceMiles: 500 } }],
  ["budget <$500", { budget: "under_500" }], ["budget $1.5–5k", { budget: "1500_5000" }], ["budget $5k+", { budget: "5000_plus" }],
  ["knows first aid", { skills: ["first_aid"] }], ["knows camping", { skills: ["camping"], scenarioDays: 30 }], ["handy with tools", { skills: ["tools"] }],
  ["hurricane zone (Miami)", { zip: "33101" }], ["earthquake zone (Seattle)", { zip: "98115" }], ["wildfire + heat (Phoenix)", { zip: "85008" }], ["tornado + winter (Minnesota)", { zip: "56701" }],
];

describe("every answer changes the plan", () => {
  it.each(VARIANTS)("%s", async (_name, v) => {
    const [b, r] = await Promise.all([plan(BASE), plan({ ...BASE, ...v } as Answers)]);
    const ids = (x: Plan) => x.computed.budget.picks.map((p) => `${p.item.id}×${p.qty}`).join(",");
    expect(text(r) !== text(b) || ids(r) !== ids(b)).toBe(true);
  });
});

/**
 * Every answer leads to something to act on: a different product or quantity, or a step that carries a
 * product or official link. Text-only changes don't count. These three share the base answer's resources
 * (same vehicle kit, fuel and evacuation guidance) and change amounts in tables, so they're exempt.
 */
const SAME_RESOURCES_AS_BASE = new Set(["diesel", "hybrid", "far fallback"]);
describe("every answer traces to a product or resource", () => {
  const resources = (x: Plan) => {
    // Gear in the plan now or marked "later" both count as a product the answer leads to.
    const out = new Set([...x.computed.budget.picks, ...x.computed.budget.deferred].map((p) => `${p.item.id}×${p.qty}`));
    for (const s of x.document.sections)
      for (const bl of s.blocks) {
        if (bl.type === "checklist") for (const i of bl.items) if (i.link || i.buy?.length) out.add(`${i.text} → ${i.link?.url ?? i.buy?.[0]}`);
        if (bl.type === "help") for (const l of bl.links) out.add(l.url);
      }
    return out;
  };
  it.each(VARIANTS.filter(([n]) => !SAME_RESOURCES_AS_BASE.has(n)))("%s", async (_name, v) => {
    const [b, r] = await Promise.all([plan(BASE), plan({ ...BASE, ...v } as Answers)]);
    const before = resources(b), after = resources(r);
    expect([...after].some((x) => !before.has(x)) || [...before].some((x) => !after.has(x))).toBe(true);
  });
});

// ------------------------------------------------------------------ 2. pairwise households
type Field = { key: string; values: Partial<Answers>[] };
const FIELDS: Field[] = [
  { key: "zip", values: ["11746", "33101", "98115", "85008", "56701", "70119", "10025"].map((zip) => ({ zip })) },
  { key: "scenario", values: ([3, 14, 30, 90] as const).map((scenarioDays) => ({ scenarioDays })) },
  { key: "people", values: [{ adults: 1, childrenAges: [] }, { adults: 2, childrenAges: [0], toddlerNeeds: ["formula", "diapers"] }, { adults: 2, childrenAges: [2, 7], toddlerNeeds: ["diapers"] }, { adults: 4, childrenAges: [15], elderlyOrMobility: true }] },
  { key: "pets", values: [{ pets: [] }, { pets: [{ type: "dog", count: 2, size: "large", specialDiet: false, medications: true }] }, { pets: [{ type: "cat", count: 1, size: "small", specialDiet: true, medications: false }] }] },
  { key: "medical", values: [{ hasPrescriptions: false, poweredDevices: [] }, { hasPrescriptions: true, poweredDevices: [] }, { hasPrescriptions: true, poweredDevices: ["oxygen"] }] },
  { key: "home", values: [{ homeType: "apartment", hasYard: false, hasGarage: false, hasBasement: false }, { homeType: "house", hasYard: true, hasGarage: true, hasBasement: true }, { homeType: "townhouse", hasYard: false, hasGarage: true, hasBasement: false }, { homeType: "house", hasYard: false, hasGarage: false, hasBasement: true }] },
  { key: "heat", values: [["natural_gas"], ["oil"], ["propane"], ["electric"], ["wood"], ["natural_gas", "wood"]].map((heatSources) => ({ heatSources }) as Partial<Answers>) },
  { key: "cooking", values: (["gas", "electric", "induction"] as const).map((cooking) => ({ cooking })) },
  { key: "water", values: [{ waterSource: "municipal", hasFiltration: false }, { waterSource: "municipal", hasFiltration: true }, { waterSource: "well", hasFiltration: false }, { waterSource: "well", hasFiltration: true }] },
  { key: "power", values: (["none", "portable_generator", "standby_generator", "solar_battery"] as const).map((backupPower) => ({ backupPower })) },
  { key: "vehicles", values: [[], ["gas"], ["diesel", "ev"], ["hybrid"]].map((vehicleFuels) => ({ vehicleFuels }) as Partial<Answers>) },
  { key: "storage", values: [["limited"], ["closets"], ["garage", "basement"], ["shed"]].map((storage) => ({ storage }) as Partial<Answers>) },
  { key: "evac", values: [{ evacuation: { mode: "shelter_only" } }, { evacuation: { mode: "fallback", locationType: "friends_family", distanceMiles: 50 } }, { evacuation: { mode: "fallback", locationType: "second_property", distanceMiles: 250 } }, { evacuation: { mode: "fallback", locationType: "raw_land", distanceMiles: 120 } }] as Partial<Answers>[] },
  { key: "budget", values: (["under_500", "500_1500", "1500_5000", "5000_plus"] as const).map((budget) => ({ budget })) },
  { key: "skills", values: [[], ["first_aid"], ["camping"], ["tools"], ["first_aid", "camping", "tools"]].map((skills) => ({ skills }) as Partial<Answers>) },
];

/** Deterministic set of households that together cover every pair of values across all fields. */
function pairwiseHouseholds(): Answers[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
  const uncovered = new Set<string>();
  FIELDS.forEach((f, i) => FIELDS.forEach((g, j) => j > i && f.values.forEach((_, a) => g.values.forEach((_, b) => uncovered.add(`${i}:${a}|${j}:${b}`)))));
  const out: Answers[] = [];
  while (uncovered.size && out.length < 400) {
    // greedy: try a few random candidates, keep the one covering the most new pairs
    let best: number[] = [];
    let bestGain = -1;
    for (let t = 0; t < 30; t++) {
      const pick = FIELDS.map((f) => Math.floor(rnd() * f.values.length));
      let gain = 0;
      for (let i = 0; i < FIELDS.length; i++) for (let j = i + 1; j < FIELDS.length; j++) if (uncovered.has(`${i}:${pick[i]}|${j}:${pick[j]}`)) gain++;
      if (gain > bestGain) [best, bestGain] = [pick, gain];
    }
    for (let i = 0; i < FIELDS.length; i++) for (let j = i + 1; j < FIELDS.length; j++) uncovered.delete(`${i}:${best[i]}|${j}:${best[j]}`);
    out.push(Object.assign({ ...BASE }, ...FIELDS.map((f, i) => f.values[best[i]])) as Answers);
  }
  expect(uncovered.size).toBe(0);
  return out;
}

const COMBUSTION_ITEMS = ["gas-cans", "gen-cord", "propane-20", "buddy-heater", "propane-1lb", "camp-stove", "generator-dual", "generator-small", "inlet-interlock"];

describe("pairwise: what people have (or don't) steers products, skills and considerations", () => {
  it("covers every pair of answers and every rule holds", async () => {
    const households = pairwiseHouseholds();
    expect(households.length).toBeGreaterThan(30);
    for (const a of households) {
      const r = await plan(a);
      const t = text(r);
      const why = JSON.stringify({ zip: a.zip, home: a.homeType, power: a.backupPower, heat: a.heatSources, water: a.waterSource, filter: a.hasFiltration, veh: a.vehicleFuels, evac: a.evacuation, skills: a.skills, budget: a.budget });
      const gen = r.computed.budget.picks.concat(r.computed.budget.deferred).filter((p) => p.item.group === "generator");

      // never unsafe
      expect(lintDocument(r.document), why).toEqual([]);
      // don't sell what they already have
      if (a.backupPower !== "none") expect(gen.length + r.computed.budget.slots.filter((x) => x.group === "generator").length, why).toBe(0);
      if (a.backupPower === "solar_battery") expect(offered(r, "solar-panel") || r.computed.budget.slots.some((x) => x.group === "battery-house"), why).toBe(false);
      if (a.hasFiltration) expect(r.computed.budget.slots.some((x) => x.group === "filter"), why).toBe(false);
      if (a.backupPower === "standby_generator") expect(offered(r, "well-switch"), why).toBe(false);
      // but do cover what they lack
      if (a.poweredDevices.length) expect(picked(r, "med-battery"), why).toBe(true);
      if (a.waterSource === "well" && a.backupPower !== "standby_generator") expect(offered(r, "well-switch"), why).toBe(true);
      if (!a.hasFiltration && a.scenarioDays > 14) expect(r.computed.budget.slots.some((x) => x.group === "filter" && x.chosen), why).toBe(true);
      // essentials: CO alarms and some water container always bought; power bank, radio, first aid always at least offered
      expect(picked(r, "co-alarm") && r.computed.budget.picks.some((p) => p.item.group === "water"), why).toBe(true);
      for (const id of ["power-bank", "radio", "first-aid"]) expect(offered(r, id), `${id} ${why}`).toBe(true);
      // generous budgets get the sturdy jugs, not the low-cost fallback
      if (a.budget === "5000_plus") expect(picked(r, "water-gallons"), why).toBe(false);
      // apartments: no fuel-burning gear or fuel storage
      if (a.homeType === "apartment") for (const id of COMBUSTION_ITEMS) expect(offered(r, id), `${id} ${why}`).toBe(false);
      // sections appear only when they apply
      expect(section(r, "pets"), why).toBe(a.pets.length > 0);
      expect(section(r, "kids"), why).toBe(a.childrenAges.length > 0);
      expect(section(r, "evacuation"), why).toBe(a.evacuation.mode === "fallback");
      if (!a.pets.length) expect(offered(r, "pet-kit"), why).toBe(false);
      if (!a.childrenAges.length) expect(offered(r, "morale-kit"), why).toBe(false);
      const slot = (g: string) => r.computed.budget.slots.some((x) => x.group === g);
      if (a.evacuation.mode !== "fallback") expect(slot("go-bag") || slot("shelter"), why).toBe(false);
      if (a.evacuation.locationType !== "raw_land") expect(slot("shelter") || offered(r, "raw-land-cabin"), why).toBe(false);
      // vehicles
      if (a.evacuation.mode === "fallback") expect(/Fuel per vehicle/.test(t), why).toBe(a.vehicleFuels.length > 0);
      if (a.evacuation.mode === "fallback" && !a.vehicleFuels.length) expect(t, why).toMatch(/No car: plan your ride now/);
      if (!a.vehicleFuels.length) expect(slot("vehicle-kit"), why).toBe(false);
      // skills: what they know changes what they're told to learn
      expect(t, why).toMatch(a.skills.includes("first_aid") ? /refresh CPR every 2 years/ : /take a Red Cross First Aid\/CPR class/);
      expect(t, why).toMatch(a.skills.includes("tools") ? /do the DIY jobs yourself/ : /show you the gas, water and main electrical shutoffs/);
      if (a.evacuation.locationType === "raw_land" || a.scenarioDays >= 30)
        expect(t, why).toMatch(a.skills.includes("camping") ? /check the gear you already own/ : /one night "camping" at home/);
      // considerations follow equipment
      if (a.heatSources.includes("wood")) expect(t, why).toMatch(/Wood stove: practice/);
      if (a.backupPower === "portable_generator") expect(t, why).toMatch(/Generator: practice starting it/);
      if (a.storage.includes("limited")) expect(t, why).toMatch(/Limited space:/);
      if (a.storage.includes("shed")) expect(t, why).toMatch(/Shed: the right place for gas cans/);
    }
  }, 120_000);
});
