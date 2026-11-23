import { describe, expect, it } from "vitest";
import { AI_GROUND_RULES, aiSummary, HEALTH_WORDS } from "@/lib/plan/aiSummary";
import { lintText } from "@/lib/safety/linter";
import { BRAND } from "@/lib/brand";
import { at } from "./fixtures/households";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan, SAMPLE_HOUSEHOLD } from "./helpers/build";
import type { Answers } from "@/lib/answers/schema";

/** Households with every health answer switched on: none of it may reach the copied text. */
function healthHeavy(): Answers[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
  const zips = ["11746", "10025", "33101", "70112", "94110", "05602", "99501", "00000"];
  return Array.from({ length: 40 }, (_, i) =>
    at({
      zip: zips[i % zips.length],
      scenarioDays: ([3, 14, 30, 90] as const)[i % 4],
      adults: 1 + (i % 3),
      childrenAges: rnd() < 0.5 ? [1, 7] : [],
      elderlyOrMobility: true,
      hasPrescriptions: true,
      poweredDevices: (["cpap", "oxygen", "nebulizer", "other"] as const).filter(() => rnd() < 0.7),
      pets: rnd() < 0.5 ? [{ type: "dog", count: 1, size: "large", specialDiet: true, medications: true }] : [],
      backupPower: (["none", "portable_generator", "solar_battery"] as const)[i % 3],
    }),
  );
}

describe("Copy for your AI assistant (D12b)", () => {
  it("never includes health answers, consent records, the ZIP or an address", async () => {
    const households = [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a), ...healthHeavy()];
    for (const a of households) {
      const r = await buildPlan(a);
      const t = aiSummary(r.document, r.computed.answers);
      const withoutRules = t.split("\n").filter((l) => !AI_GROUND_RULES.some((g) => l.includes(g))).join("\n");
      expect(withoutRules, a.zip).not.toMatch(HEALTH_WORDS);
      expect(t).not.toMatch(/consent|terms_version|TERMS_VERSION|agreed/i);
      expect(t).not.toContain(a.zip);
      expect(t).not.toMatch(/\b\d{5}\b/); // no ZIP-like number
      expect(t).not.toMatch(/\b(street|st\.|avenue|ave\.|road|rd\.|address)\b/i);
      expect(t).not.toMatch(/https?:\/\//); // no links at all, so never an Amazon link
    }
  });

  it("states the five ground rules word for word, with the brand from lib/brand.ts", async () => {
    const r = await buildPlan();
    const t = aiSummary(r.document, r.computed.answers);
    for (const g of AI_GROUND_RULES) expect(t).toContain(g);
    expect(t).toContain("Never suggest grills, generators or fuel-burning heaters indoors or in a garage.");
    expect(t).not.toContain("generators or heaters indoors"); // review 6: electric heaters are fine indoors
    expect(t).toContain(`This plan's numbers come from ${BRAND.name}; your assistant's advice is its own.`);
    expect(t).toContain("Set reminders for the dates in the maintenance schedule.");
    expect(t).toContain("Help me with my first 3 steps.");
  });

  it("uses the plan's own amounts and schedule, unchanged", async () => {
    const r = await buildPlan();
    const t = aiSummary(r.document, r.computed.answers);
    for (const s of r.document.overview!.stats) expect(t).toContain(`${s.label}: ${s.value} (${s.math})`);
    const maint = r.document.sections.find((s) => s.id === "maintenance")!.blocks[0];
    if (maint.type !== "table") throw new Error("maintenance table");
    for (const row of maint.rows) if (!HEALTH_WORDS.test(row[1])) expect(t).toContain(`${row[0]}: ${row[1]}`);
    expect(t).toContain("Every 12 months: Rotate stabilized gasoline into cars; replace bleach; check first aid kit; update documents, photos.");
    expect(t).toMatch(/2 adults, 2 children, 1 pet/);
    expect(t).toMatch(/Planning for: 90 days/);
  });

  it("passes the safety linter", async () => {
    for (const a of [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)]) {
      const r = await buildPlan(a);
      expect(lintText(aiSummary(r.document, r.computed.answers))).toEqual([]);
    }
  });
});
