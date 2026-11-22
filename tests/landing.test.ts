import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { computePlan } from "@/lib/rules/engine";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { n } from "@/lib/plan/format";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
import { sampleSummary } from "@/lib/plan/sampleSummary";

describe("front-page chapter cards (D10)", () => {
  const s = sampleSummary();
  const cp = computePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, new Date("2026-11-18"));
  it("has example values for all four chapters, 2–3 each", () => {
    for (const id of ["do-now", "supplies", "power-heat", "people-plans"] as const) {
      expect(s.chapters[id].length).toBeGreaterThanOrEqual(2);
      expect(s.chapters[id].length).toBeLessThanOrEqual(3);
    }
  });
  it("example amounts are the engine's numbers for the sample household", () => {
    expect(s.chapters.supplies).toContain(`${n(cp.water.storedGal)} gal of water`);
    expect(s.chapters.supplies).toContain(`${n(cp.food.totalKcal)} calories of food`);
    expect(s.chapters.supplies).toContain("$" + n(cp.cash.total) + " cash on hand");
    expect(s.chapters["people-plans"][0]).toBe(`${n(cp.evacuation!.reserveGalPerVehicle)} gal fuel reserve per car`);
  });
});
