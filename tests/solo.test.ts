import { describe, expect, it } from "vitest";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { SAMPLE_HOUSEHOLD } from "@/tests/fixtures/households";

const solo = { ...SAMPLE_HOUSEHOLD, adults: 1, childrenAges: [], toddlerNeeds: [], pets: [] };

describe("one-person households", () => {
  it("reads naturally for someone living alone", async () => {
    const r = await generatePlan(solo, DEFAULT_CONSTANTS, SEED_CATALOG, { now: new Date("2026-11-18T12:00:00Z") });
    const text = JSON.stringify(r.document);
    expect(text).not.toMatch(/\b1 people\b/);
    expect(text).not.toMatch(/your family will reach|Family communications plan|Family tent|Family first aid kit|\b1 gallons\b/i);
    expect(text).toMatch(/This plan covers you, on your own/);
    expect(text).toMatch(/check on you during long outages/);
    expect(text).toMatch(/Who checks on me/);
  });
  it("keeps household wording for more than one person", async () => {
    const r = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, { now: new Date("2026-11-18T12:00:00Z") });
    const text = JSON.stringify(r.document);
    expect(text).toMatch(/This plan covers 4 people/);
    expect(text).not.toMatch(/Who checks on me/);
  });
});

describe("review 4: the generator planning assumption", () => {
  const NOW = new Date("2026-11-18T12:00:00Z");
  const assumptions = async (a: object) => {
    const r = await generatePlan(a, DEFAULT_CONSTANTS, SEED_CATALOG, { now: NOW, useLlm: false });
    const snap = r.document.sections.find((s) => s.id === "snapshot")!;
    const gear = [...r.computed.budget.picks, ...r.computed.budget.deferred].map((p) => p.item.id);
    return { lines: snap.blocks.flatMap((b) => (b.type === "bullets" ? b.items : [])), gear };
  };
  it("is left out for the one-adult apartment with no car, no backup power and no generator in the plan", async () => {
    const { lines, gear } = await assumptions({
      ...SAMPLE_HOUSEHOLD, zip: "10025", adults: 1, childrenAges: [], toddlerNeeds: [], pets: [], homeType: "apartment", floors: 1,
      hasBasement: false, hasGarage: false, hasYard: false, hasShed: false, heatSources: ["electric"], cooking: "electric", backupPower: "none",
      vehicleFuels: [], storage: ["none"], approach: "stay_home", evacuation: { destination: "not_sure" }, scenarioDays: 14, budget: "under_500",
    });
    expect(gear.some((id) => id.startsWith("generator-"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Generator:"))).toBe(false);
  });
  it("is shown for a generator owner, and when the plan includes a generator", async () => {
    expect((await assumptions({ ...SAMPLE_HOUSEHOLD, backupPower: "portable_generator" })).lines.some((l) => l.startsWith("Generator:"))).toBe(true);
    const sample = await assumptions(SAMPLE_HOUSEHOLD);
    expect(sample.gear.some((id) => id.startsWith("generator-"))).toBe(true);
    expect(sample.lines.some((l) => l.startsWith("Generator:"))).toBe(true);
  });
});
