import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { BUILD_STAGES, parseStreamLines, type BuildStage } from "@/lib/plan/stages";
import { SAMPLE_HOUSEHOLD, TEST_CONSTANTS, TEST_NOW } from "./helpers/build";

describe("loading screen stages (D11)", () => {
  it("uses the brief's three labels, in order", () => {
    expect(BUILD_STAGES.map((s) => s.label)).toEqual([
      "Reading your area's hazards",
      "Calculating water, food and fuel for your household",
      "Organizing your first steps",
    ]);
  });

  it("generatePlan reports hazards, then quantities, each after its work is done", async () => {
    const seen: BuildStage[] = [];
    const r = await generatePlan(SAMPLE_HOUSEHOLD, TEST_CONSTANTS, SEED_CATALOG, { useLlm: false, now: TEST_NOW, onStage: (s) => void seen.push(s) });
    expect(seen).toEqual(["hazards", "quantities"]); // "steps" is reported by the server after the plan is saved
    expect(r.document.sections.length).toBeGreaterThan(10);
  });

  it("a failed build reports no further stages", async () => {
    const seen: BuildStage[] = [];
    await expect(generatePlan({ zip: "nope" }, TEST_CONSTANTS, SEED_CATALOG, { useLlm: false, onStage: (s) => void seen.push(s) })).rejects.toThrow();
    expect(seen).toEqual([]);
  });

  it("parses streamed lines, keeping a partial line for the next chunk", () => {
    const a = parseStreamLines('{"stage":"hazards"}\n{"stage":"quan');
    expect(a.lines).toEqual([{ stage: "hazards" }]);
    const b = parseStreamLines(a.rest + 'tities"}\n{"planId":"x"}\n');
    expect(b.lines).toEqual([{ stage: "quantities" }, { planId: "x" }]);
    expect(b.rest).toBe("");
    expect(parseStreamLines('{"error":"Couldn\'t build the plan. Try again."}\n').lines).toEqual([{ error: "Couldn't build the plan. Try again." }]);
  });
});
