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
