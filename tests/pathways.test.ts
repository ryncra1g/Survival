import { describe, expect, it } from "vitest";
import { APPROACH_PLACE, DEFAULT_ANSWERS, destinationForApproach, hasHouseholdFilter, hasPersonalFilter, isDrive, type Answers } from "@/lib/answers/schema";
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
  approach: "family_friends",
  evacuation: { destination: "friends_family", distanceMiles: 120 },
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
  ["basement", { hasBasement: true }], ["garage", { hasGarage: true }], ["yard", { hasYard: true }], ["shed (not for supplies)", { hasShed: true }],
  ["oil heat", { heatSources: ["oil"] }], ["propane heat", { heatSources: ["propane"] }], ["electric heat", { heatSources: ["electric"] }], ["wood heat", { heatSources: ["wood"] }],
  ["electric stove", { cooking: "electric" }], ["induction stove", { cooking: "induction" }],
  ["well", { waterSource: "well" }], ["household filter", { waterFilter: "household", scenarioDays: 30 }], ["personal filter", { waterFilter: "personal" }], ["both filters", { waterFilter: "both", scenarioDays: 30 }],
  ["portable generator", { backupPower: "portable_generator" }], ["standby generator", { backupPower: "standby_generator" }], ["solar + battery", { backupPower: "solar_battery" }],
  ["no vehicle", { vehicleFuels: [] }], ["diesel", { vehicleFuels: ["diesel"] }], ["EV", { vehicleFuels: ["ev"] }], ["hybrid", { vehicleFuels: ["hybrid"] }],
  ["storage garage", { hasGarage: true, storage: ["garage"] }], ["storage basement", { hasBasement: true, storage: ["basement"] }], ["storage shed", { hasShed: true, storage: ["shed"] }],
  ["storage other indoor", { storage: ["other_indoor"] }], ["storage limited", { storage: ["limited"] }], ["no suitable storage", { storage: ["none"] }],
  ["approach: stay home", { approach: "stay_home" }], ["approach: another property", { approach: "another_property" }], ["approach: hotel or shelter", { approach: "hotel_shelter" }], ["approach: not sure", { approach: "not_sure" }],
  ["go to: second property", { evacuation: { destination: "second_property", distanceMiles: 120 } }], ["go to: raw land", { evacuation: { destination: "raw_land", distanceMiles: 120 } }],
  ["go to: hotel", { evacuation: { destination: "hotel", distanceMiles: 120 } }], ["go to: public shelter", { evacuation: { destination: "public_shelter" } }], ["go to: not sure", { evacuation: { destination: "not_sure" } }],
  ["far fallback", { evacuation: { destination: "friends_family", distanceMiles: 500 } }],
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
  { key: "home", values: [{ homeType: "apartment", hasYard: false, hasGarage: false, hasBasement: false, hasShed: false }, { homeType: "house", hasYard: true, hasGarage: true, hasBasement: true, hasShed: true }, { homeType: "townhouse", hasYard: false, hasGarage: true, hasBasement: false, hasShed: false }, { homeType: "house", hasYard: false, hasGarage: false, hasBasement: true, hasShed: false }] },
  { key: "heat", values: [["natural_gas"], ["oil"], ["propane"], ["electric"], ["wood"], ["natural_gas", "wood"]].map((heatSources) => ({ heatSources }) as Partial<Answers>) },
  { key: "cooking", values: (["gas", "electric", "induction"] as const).map((cooking) => ({ cooking })) },
  { key: "water", values: [{ waterSource: "municipal", waterFilter: "none" }, { waterSource: "municipal", waterFilter: "household" }, { waterSource: "well", waterFilter: "personal" }, { waterSource: "well", waterFilter: "both" }] },
  { key: "power", values: (["none", "portable_generator", "standby_generator", "solar_battery"] as const).map((backupPower) => ({ backupPower })) },
  { key: "vehicles", values: [[], ["gas"], ["diesel", "ev"], ["hybrid"]].map((vehicleFuels) => ({ vehicleFuels }) as Partial<Answers>) },
  { key: "storage", values: [["limited"], ["closets"], ["garage", "basement"], ["shed"], ["closets", "other_indoor"], ["none"]].map((storage) => ({ storage }) as Partial<Answers>) },
  { key: "approach", values: (["stay_home", "family_friends", "another_property", "hotel_shelter", "not_sure"] as const).map((approach) => ({ approach })) },
  { key: "evac", values: [{ evacuation: { destination: "not_sure" } }, { evacuation: { destination: "public_shelter" } }, { evacuation: { destination: "friends_family", distanceMiles: 50 } }, { evacuation: { destination: "second_property", distanceMiles: 250 } }, { evacuation: { destination: "raw_land", distanceMiles: 120 } }, { evacuation: { destination: "hotel", distanceMiles: 25 } }] as Partial<Answers>[] },
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
      const why = JSON.stringify({ zip: a.zip, home: a.homeType, power: a.backupPower, heat: a.heatSources, water: a.waterSource, filter: a.waterFilter, approach: a.approach, veh: a.vehicleFuels, evac: a.evacuation, skills: a.skills, budget: a.budget });
      const gen = r.computed.budget.picks.concat(r.computed.budget.deferred).filter((p) => p.item.group === "generator");

      // never unsafe
      expect(lintDocument(r.document), why).toEqual([]);
      // don't sell what they already have
      if (a.backupPower !== "none") expect(gen.length + r.computed.budget.slots.filter((x) => x.group === "generator").length, why).toBe(0);
      if (a.backupPower === "solar_battery") expect(offered(r, "solar-panel") || r.computed.budget.slots.some((x) => x.group === "battery-house"), why).toBe(false);
      if (hasHouseholdFilter(a)) expect(r.computed.budget.slots.some((x) => x.group === "filter"), why).toBe(false);
      if (a.backupPower === "standby_generator") expect(offered(r, "well-switch"), why).toBe(false);
      // but do cover what they lack
      if (a.poweredDevices.length) expect(picked(r, "med-battery"), why).toBe(true);
      if (a.waterSource === "well" && a.backupPower !== "standby_generator") expect(offered(r, "well-switch"), why).toBe(true);
      // a personal (straw or bottle) filter never stands in for the household filter (D6)
      if (!hasHouseholdFilter(a) && a.scenarioDays > 14) expect(r.computed.budget.slots.some((x) => x.group === "filter" && x.chosen), why).toBe(true);
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
      const drive = isDrive(a.evacuation.destination) && !!a.evacuation.distanceMiles;
      // D4: every plan has "When you must leave", with the override line and the backup-destination step
      expect(section(r, "evacuation"), why).toBe(true);
      expect(t, why).toContain("Official evacuation orders override this plan.");
      expect(t, why).toContain("Add your backup destination");
      if (!a.pets.length) expect(offered(r, "pet-kit"), why).toBe(false);
      if (!a.childrenAges.length) expect(offered(r, "morale-kit"), why).toBe(false);
      const slot = (g: string) => r.computed.budget.slots.some((x) => x.group === g);
      if (!drive) expect(slot("go-bag") || slot("shelter"), why).toBe(false);
      if (a.evacuation.destination !== "raw_land") expect(slot("shelter") || offered(r, "raw-land-cabin"), why).toBe(false);
      // vehicles
      if (drive) expect(/Fuel per vehicle/.test(t), why).toBe(a.vehicleFuels.length > 0);
      if (drive && !a.vehicleFuels.length) expect(t, why).toMatch(/No car: plan your ride now/);
      if (!a.vehicleFuels.length) expect(slot("vehicle-kit"), why).toBe(false);
      // skills: what they know changes what they're told to learn
      expect(t, why).toMatch(a.skills.includes("first_aid") ? /refresh CPR every 2 years/ : /take a Red Cross First Aid\/CPR class/);
      expect(t, why).toMatch(a.skills.includes("tools") ? /do the DIY jobs yourself/ : /show you the gas, water and main electrical shutoffs/);
      if (a.evacuation.destination === "raw_land" || a.scenarioDays >= 30)
        expect(t, why).toMatch(a.skills.includes("camping") ? /check the gear you already own/ : /one night "camping" at home/);
      // considerations follow equipment
      if (a.heatSources.includes("wood")) expect(t, why).toMatch(/Wood stove: practice/);
      if (a.backupPower === "portable_generator") expect(t, why).toMatch(/Generator: practice starting it/);
      if (a.storage.includes("limited")) expect(t, why).toMatch(/Limited space:/);
      if (a.storage.includes("shed")) expect(t, why).toMatch(/Shed: the right place for gas cans/);
      if (a.storage.includes("none")) expect(t, why).toMatch(/No suitable storage: keep the first 3 days of water/);
      if (a.storage.includes("other_indoor")) expect(t, why).toMatch(/Other indoor space/);
      // D4: every plan says what to do about the preferred approach, with an official link
      const steps = r.document.sections.flatMap((s) => s.blocks).flatMap((bl) => (bl.type === "checklist" ? bl.items : []));
      const approach = steps.find((i) => i.id === "month-approach");
      expect(approach?.link?.url, why).toMatch(/^https:\/\/www\.(ready\.gov|redcross\.org)\//);
      if (a.evacuation.destination === "public_shelter") expect(steps.find((i) => i.id === "month-destination")?.link?.url, why).toMatch(/redcross\.org/);
      if (hasPersonalFilter(a) && drive) expect(t, why).toMatch(/your straw or bottle filter/);
    }
  }, 120_000);
});

/**
 * UX-5 (owner decision): the questionnaire pre-fills the destination from a place approach and asks only
 * "which one" and the distance. Every pair it can produce must still lead to the approach step and its destination.
 */
describe("evacuation answers the questionnaire can produce (UX-5)", () => {
  const pairs: [string, Partial<Answers>][] = [];
  for (const approach of ["family_friends", "another_property", "hotel_shelter"] as const) {
    const p = APPROACH_PLACE[approach]!;
    for (const d of [p.main, ...(p.alt ? [p.alt] : [])]) pairs.push([`${approach} → ${d}`, { approach, evacuation: isDrive(d) ? { destination: d, distanceMiles: 120 } : { destination: d } }]);
  }
  for (const approach of ["stay_home", "not_sure"] as const) pairs.push([`${approach} → not sure`, { approach, evacuation: { destination: "not_sure" } }]);
  it("a place approach always pre-fills a destination of the same kind", () => {
    expect(destinationForApproach("family_friends", "not_sure")).toBe("friends_family");
    expect(destinationForApproach("another_property", "raw_land")).toBe("raw_land");
    expect(destinationForApproach("another_property", "hotel")).toBe("second_property");
    expect(destinationForApproach("hotel_shelter", "not_sure")).toBe("hotel");
    expect(destinationForApproach("hotel_shelter", "public_shelter")).toBe("public_shelter");
    expect(destinationForApproach("stay_home", "hotel")).toBeNull();
    expect(destinationForApproach("not_sure", "friends_family")).toBeNull();
  });
  it.each(pairs)("%s: approach step with an official link, and the destination's own step or section", async (_n, v) => {
    const a = { ...BASE, ...v } as Answers;
    const r = await plan(a);
    const steps = r.document.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === "checklist" ? b.items : [])));
    expect(steps.find((i) => i.id === "month-approach")?.link?.url).toMatch(/^https:\/\/www\.(ready\.gov|redcross\.org)\//);
    if (isDrive(a.evacuation.destination)) expect(r.computed.evacuation?.locationType).toBe(a.evacuation.destination);
    else expect(steps.find((i) => i.id === "month-destination")?.link?.url).toMatch(/^https:\/\//);
  });
});

