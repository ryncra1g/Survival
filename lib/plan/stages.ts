/**
 * D11 / LP-07: the three real stages of building a plan, in order. Each is reported when it has actually
 * finished (no padding, no percentage):
 *  - hazards: the ZIP's hazard profile is looked up
 *  - quantities: the rules engine has computed water, food, fuel and the budget
 *  - steps: the plan document is built, worded, safety-checked and saved
 */
export const BUILD_STAGES = [
  { id: "hazards", label: "Reading your area's hazards" },
  { id: "quantities", label: "Calculating water, food and fuel for your household" },
  { id: "steps", label: "Organizing your first steps" },
] as const;

export type BuildStage = (typeof BUILD_STAGES)[number]["id"];
export type OnStage = (stage: BuildStage) => void | Promise<void>;

/** One line of the streamed generate response (application/x-ndjson). */
export type StreamLine = { stage: BuildStage } | { planId: string; emailed?: boolean } | { error: string };

export function parseStreamLines(buffer: string): { lines: StreamLine[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  const lines = parts.filter((l) => l.trim()).map((l) => JSON.parse(l) as StreamLine);
  return { lines, rest };
}
