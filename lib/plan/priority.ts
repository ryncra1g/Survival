/**
 * UX-6 / UX-7 (owner decision): how the Priority list is staged and counted.
 * - The plan opens on "This week": the first 3 steps plus at most 7 more, in the engine's priority order.
 * - Everything else is under "This month" and "Later" (the 60- and 90-day work, collapsed on the web). Every plan keeps them (UX-25).
 * - One step count everywhere: To do items only (checklists of kind "do").
 */
export const WEEK_MAX = 10;
export const STAGE = { week: "This week", month: "This month", later: "Later" } as const;
export const STAGES: string[] = [STAGE.week, STAGE.month, STAGE.later];
/** Collapsed on the web: everything after "This week". */
export const COLLAPSED_STAGES: string[] = [STAGE.month, STAGE.later];
