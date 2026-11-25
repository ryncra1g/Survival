/**
 * The dashboard's "Start with these 3" (design audit DA-1). Pure, so tests can check the reassurance is true:
 * the steps shown are the first open steps in the plan's own priority order, and "Everything else can wait."
 * appears only when there are more open steps after them.
 */
export const START_WITH = 3;

export type Staged = { stage: string; step: { id: string } };

export function nextSteps<T extends Staged>(priority: T[], checks: Record<string, boolean>) {
  const open = priority.filter((p) => !checks[p.step.id]);
  // Progress is shown for the current stage (this week, then this month…): a near goal, not 0 of 80.
  const stage = open[0]?.stage;
  const inStage = priority.filter((p) => p.stage === stage);
  return {
    open,
    stage,
    inStage,
    stageDone: inStage.filter((p) => checks[p.step.id]).length,
    startWith: open.slice(0, START_WITH),
    /** Nothing ticked yet: the plan opens with reassurance before any counts. */
    fresh: priority.length > 0 && open.length === priority.length,
  };
}

/** Heading and note above the first steps. The note is only shown when it's true (more open steps follow). */
export function startHeading(shown: number, openTotal: number): { title: string; note: string | null } {
  return {
    title: shown === 1 ? "Start with this one" : `Start with these ${shown}`,
    note: openTotal > shown ? "Everything else can wait." : null,
  };
}

export const REASSURANCE = "Your plan is ready. You don't need to do this all at once.";
