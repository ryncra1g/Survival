import { describe, expect, it } from "vitest";
import { documentStrings, lintText } from "@/lib/safety/linter";
import type { PlanDocument } from "@/lib/plan/document";
import { PERSONAS } from "./fixtures/personas";
import { at } from "./fixtures/households";
import { buildPlan, SAMPLE_HOUSEHOLD } from "./helpers/build";

const waterText = (doc: PlanDocument) => {
  const s = doc.sections.find((x) => x.id === "water")!;
  return documentStrings({ ...doc, sections: [s] }).join("\n");
};

describe("D6: water treatment in layers, never a dosage", () => {
  it("no amount next to drops, tablets, teaspoons, capfuls or ml in any plan's water text", async () => {
    for (const a of [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)]) {
      const t = waterText((await buildPlan(a)).document);
      expect(t, a.zip).not.toMatch(/\b\d+(\.\d+)?\s*(drops?|tablets?|teaspoons?|tsp|tablespoons?|tbsp|capfuls?|ml|mL)\b/);
      expect(lintText(t)).toEqual([]);
      expect(t).toContain("follow the product label and CDC/EPA guidance");
    }
  });

  it("lists the five layers in order, each with what it does not remove", async () => {
    const doc = (await buildPlan()).document;
    const table = doc.sections.find((s) => s.id === "water")!.blocks.find((b) => b.type === "table" && b.caption === "Safe water, in this order");
    if (!table || table.type !== "table") throw new Error("layers table");
    expect(table.rows.map((r) => r[0])).toEqual(["1. Stored water", "2. Household filter (gravity or pump)", "3. Treatment tablets", "4. Boiling", "5. Straw or bottle filter"]);
    for (const r of table.rows) expect(r[2].length).toBeGreaterThan(5);
    expect(waterText(doc)).toMatch(/can't be made safe by boiling or disinfecting/);
  });

  it("the water kit: containers, dispensing, labels, a backup method; spare elements only with a filter", async () => {
    const ids = (doc: PlanDocument) => doc.sections.find((s) => s.id === "water")!.blocks.flatMap((b) => (b.type === "checklist" ? b.items.map((i) => i.id) : []));
    const short = ids((await buildPlan(at({ scenarioDays: 3, waterFilter: "none" }))).document);
    expect(short).toEqual(["water-kit-containers", "water-kit-dispense", "water-kit-labels", "water-kit-backup"]);
    const withFilter = ids((await buildPlan(at({ scenarioDays: 3, waterFilter: "household" }))).document);
    expect(withFilter).toContain("water-kit-spares");
  });
});
