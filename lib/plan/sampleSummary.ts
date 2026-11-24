import { SEED_CATALOG } from "@/lib/catalog/seed";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { computePlan } from "@/lib/rules/engine";
import { buildDraft } from "./build";
import { n, range } from "./format";
import { SAMPLE_HOUSEHOLD } from "./sample";

/**
 * Front-page preview of the sample plan: three numbers with their math, and the first 3 steps.
 * Computed by the real rules engine (no AI), so the preview can never drift from what the app produces.
 */
export interface SampleSummary {
  household: string;
  stats: { value: string; label: string; math: string }[];
  steps: string[];
  /** D10: example values for the four chapter cards on the front page (engine output, never typed). */
  chapters: Record<"do-now" | "supplies" | "power-heat" | "people-plans", string[]>;
}

export function sampleSummary(now = new Date("2026-11-18")): SampleSummary {
  const c = DEFAULT_CONSTANTS;
  const cp = computePlan(SAMPLE_HOUSEHOLD, c, SEED_CATALOG, now);
  const draft = buildDraft(cp, c);
  const week = draft.sections.find((s) => s.id === "priorities")?.blocks.find((b) => b.type === "checklist");
  const p = cp.power;
  return {
    household: "2 adults, kids 2 and 4, a dog · Long Island · gas heat · 90 days",
    stats: [
      { value: `${n(cp.water.storedGal)} gal`, label: "water to store", math: `${n(cp.water.dailyGal, 2)} gal/day × ${n(cp.water.storedDays)} days` },
      { value: n(cp.food.totalKcal), label: "calories of food", math: `${n(cp.food.dailyKcal)}/day × ${n(SAMPLE_HOUSEHOLD.scenarioDays)} days` },
      {
        value: `${range(p.gasolineGalPerDay[0], p.gasolineGalPerDay[1])} gal`,
        label: "gasoline per day",
        math: `${n(p.hoursPerDay)} generator hrs × ${range(c.generator.gasolineGalPerHour[0], c.generator.gasolineGalPerHour[1], 2)} gal/hr`,
      },
    ],
    steps: week && week.type === "checklist" ? week.items.slice(0, 3).map((i) => i.text) : [],
    chapters: {
      "do-now": [
        `${week && week.type === "checklist" ? week.items.length : 0} steps this week`,
        `${draft.sections.find((x) => x.id === "day0")?.blocks.filter((b) => b.type === "checklist").flatMap((b) => (b.type === "checklist" ? b.items : [])).length ?? 0}-step Day 0 checklist`,
      ],
      supplies: [`${n(cp.water.storedGal)} gal of water`, `${n(cp.food.totalKcal)} calories of food`, "$" + n(cp.cash.total) + " cash on hand"],
      "power-heat": [`${range(p.gasolineGalPerDay[0], p.gasolineGalPerDay[1])} gal of gasoline a day`, `${n(p.hoursPerDay)} generator hours a day`],
      "people-plans": [
        ...(cp.evacuation ? [`${n(cp.evacuation.reserveGalPerVehicle)} gal of fuel for the trip`] : []),
        `Steps for ${SAMPLE_HOUSEHOLD.childrenAges.length} kids and ${SAMPLE_HOUSEHOLD.pets.reduce((t, x) => t + x.count, 0)} pet`,
      ],
    },
  };
}
