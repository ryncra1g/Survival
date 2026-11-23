import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { SAMPLE_HOUSEHOLD } from "../fixtures/households";

export const TEST_NOW = new Date("2026-11-18");
export const TEST_CONSTANTS = { ...DEFAULT_CONSTANTS, affiliate: { amazonTag: "test-20" } };

/** Build a plan deterministically (template wording, fixed date). */
export async function buildPlan(answers: unknown = SAMPLE_HOUSEHOLD, constants = TEST_CONSTANTS) {
  return generatePlan(answers, constants, SEED_CATALOG, { useLlm: false, now: TEST_NOW });
}
export { SAMPLE_HOUSEHOLD } from "../fixtures/households";
