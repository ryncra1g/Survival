/**
 * The dashboard's first screen (design audit DA-1, visual calm pass). Pure, so tests can check every promise is true:
 * - "Start with these 3" are the plan's own first 3 steps, and they stay put (ticked ones show Undo) until all 3 are done.
 * - "Everything else can wait." appears only when more open steps follow.
 * - One count only: "0 of 3 done" while on the first 3, then "This week: N of 10".
 */
import type { Block, PlanDocument } from "./document";
import { STAGE, STAGES } from "./priority";

export const START_WITH = 3;

export type Staged = { stage: string; step: { id: string } };

/**
 * `linger`: steps ticked in the last few seconds. They keep their place (with Undo) until the moment passes, so a
 * tick never makes the card jump away from under the finger, even the last one (code review).
 */
export function nextSteps<T extends Staged>(priority: T[], checks: Record<string, boolean>, linger: string[] = []) {
  const done = (p: T) => !!checks[p.step.id];
  const open = priority.filter((p) => !done(p));
  const onScreen = priority.filter((p) => !done(p) || linger.includes(p.step.id));
  const stage = (open[0] ?? onScreen[0])?.stage;
  const inStage = priority.filter((p) => p.stage === stage);
  const stageDone = inStage.filter(done).length;
  const firstThree = priority.slice(0, START_WITH);
  const firstDone = firstThree.filter(done).length;
  /** Still working on the first 3: they stay on screen, ticked or not. */
  const onFirst = firstThree.length > 0 && (firstDone < firstThree.length || firstThree.some((p) => linger.includes(p.step.id)));
  const shown = onFirst ? firstThree : onScreen.slice(0, START_WITH);
  const shownOpen = shown.filter((p) => !done(p));
  return {
    open,
    stage,
    inStage,
    stageDone,
    onFirst,
    /** The cards on the first screen. */
    shown,
    /** The open steps of this stage that aren't on screen: "See the rest of this week (N more)". */
    rest: inStage.filter((p) => (!done(p) || linger.includes(p.step.id)) && !shown.includes(p)),
    /** Kept for callers: the open steps among the cards. */
    startWith: shownOpen,
    /** The one count on screen. */
    count: onFirst ? `${firstDone} of ${firstThree.length} done` : stage ? `${stage}: ${stageDone} of ${inStage.length}` : null,
    /** Nothing ticked yet: the plan opens with reassurance before any counts. */
    fresh: priority.length > 0 && open.length === priority.length,
  };
}

/** Heading and note above the cards. The note is only shown when it's true (more open steps follow). */
export function startHeading(onFirst: boolean, shownOpen: number, openTotal: number, shownTotal = shownOpen): { title: string; note: string | null } {
  const n = onFirst ? shownTotal : shownOpen;
  const title = onFirst ? (n === 1 ? "Start with this one" : `Start with these ${n}`) : n === 1 ? "Next, this one" : `Next, these ${n}`;
  return { title, note: openTotal > shownOpen ? "Everything else can wait." : null };
}

export const REASSURANCE = "Your plan is ready. You don't need to do this all at once.";

type Item = Extract<Block, { type: "checklist" }>["items"][number];
/**
 * Every Priority-list step with its stage, in plan order: the list the web dashboard reads (components/PlanView.tsx),
 * the plan PDF, the fridge checklist and the plan email all start from this one function.
 */
export function priorityItems(doc: PlanDocument): { stage: string; step: Item }[] {
  const out: { stage: string; step: Item }[] = [];
  let stage = "";
  for (const b of doc.sections.find((s) => s.id === "priorities")?.blocks ?? []) {
    if (b.type === "subheading") stage = b.text;
    else if (b.type === "checklist" && STAGES.includes(stage)) for (const i of b.items) out.push({ stage, step: i });
  }
  return out;
}

/**
 * What a fresh plan's first screen shows, for print and email, by the web's own rules (nextSteps + startHeading):
 * the steps, the heading ("Start with these 3" / "Start with this one") and the note ("Everything else can wait." only
 * when more steps follow, in any stage). No steps: an empty list, and callers show no "Start with" block.
 */
export function firstScreen(doc: PlanDocument) {
  const steps = priorityItems(doc);
  const n = nextSteps(steps, {});
  const h = startHeading(n.onFirst, n.startWith.length, n.open.length, n.shown.length);
  const items = n.shown.map((p) => p.step);
  return { items, title: items.length ? h.title : "", note: items.length ? h.note : null, week: steps.filter((p) => p.stage === STAGE.week).map((p) => p.step) };
}
