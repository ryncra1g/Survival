import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { CHAPTERS, groupIntoChapters } from "@/lib/plan/chapters";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { PERSONAS } from "./fixtures/personas";
import { SAMPLE_HOUSEHOLD } from "./fixtures/households";

const NOW = new Date("2026-11-18");

describe("plan chapters (web)", () => {
  it("every section lands in exactly one chapter, for every persona", async () => {
    for (const p of [{ name: "sample", a: SAMPLE_HOUSEHOLD }, ...PERSONAS]) {
      const r = await generatePlan(p.a, C, SEED_CATALOG, { useLlm: false, now: NOW });
      const chapters = groupIntoChapters(r.document.sections);
      const ids = chapters.flatMap((c) => c.items.map((s) => s.id));
      expect(ids.sort(), p.name).toEqual(r.document.sections.map((s) => s.id).sort());
      expect(new Set(ids).size, p.name).toBe(ids.length);
      expect(chapters[0].id, p.name).toBe("do-now");
      expect(chapters[0].items[0].id, p.name).toBe("priorities");
    }
  });

  it("chapter groupings match the design", () => {
    expect(CHAPTERS.map((c) => [c.title, c.short])).toEqual([["Do now", "Do now"], ["Supplies", "Supplies"], ["Power & heat", "Power"], ["People & plans", "People"]]);
    expect(CHAPTERS.find((c) => c.id === "supplies")!.sections).toEqual(["water", "food", "cooking", "sanitation", "firstaid", "gear", "budget"]);
  });

  it("unknown sections go into the last chapter; empty chapters are dropped", () => {
    const out = groupIntoChapters([{ id: "priorities" }, { id: "brand-new-section" }]);
    expect(out.map((c) => c.id)).toEqual(["do-now", "people-plans"]);
    expect(out[1].items.map((s) => s.id)).toEqual(["brand-new-section"]);
  });
});
