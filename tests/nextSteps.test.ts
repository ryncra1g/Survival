import { describe, expect, it } from "vitest";
import { nextSteps, REASSURANCE, START_WITH, startHeading } from "@/lib/plan/nextSteps";
import { STAGES, STAGE } from "@/lib/plan/priority";
import type { PlanDocument } from "@/lib/plan/document";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan } from "./helpers/build";

/** The dashboard's priority steps, in plan order, the way components/PlanView.tsx reads them. */
function priority(doc: PlanDocument) {
  const out: { stage: string; step: { id: string; text: string } }[] = [];
  let stage = "";
  for (const b of doc.sections.find((s) => s.id === "priorities")?.blocks ?? []) {
    if (b.type === "subheading") stage = b.text;
    else if (b.type === "checklist" && STAGES.includes(stage)) for (const i of b.items) out.push({ stage, step: { id: i.id, text: i.text } });
  }
  return out;
}

describe("DA-1: Start with these 3. Everything else can wait.", () => {
  it.each(PERSONAS.map((p) => [p.name, p.a] as const))("%s: the 3 shown are the plan's own first 3, and the rest really comes after them", async (_n, a) => {
    const { document: doc } = await buildPlan(a);
    const steps = priority(doc);
    const first = nextSteps(steps, {});
    expect(first.fresh).toBe(true);
    // The first three steps of "This week", in the engine's priority order: the most important first.
    expect(first.startWith.map((s) => s.step.id)).toEqual(steps.slice(0, START_WITH).map((s) => s.step.id));
    expect(first.startWith.every((s) => s.stage === STAGE.week)).toBe(true);
    // "Everything else can wait." is only claimed when there is something else, and all of it is later in the order.
    const h = startHeading(first.startWith.length, first.open.length);
    expect(h.title).toBe("Start with these 3");
    expect(h.note).toBe(steps.length > START_WITH ? "Everything else can wait." : null);

    // Tick the first step: the next one moves up, and the reassurance (nothing done yet) goes away.
    const after = nextSteps(steps, { [steps[0].step.id]: true });
    expect(after.fresh).toBe(false);
    expect(after.startWith.map((s) => s.step.id)).toEqual(steps.slice(1, 1 + START_WITH).map((s) => s.step.id));
  });

  it("says 'this one' and drops 'can wait' when one step is left", () => {
    const steps = [{ stage: STAGE.week, step: { id: "a" } }, { stage: STAGE.week, step: { id: "b" } }];
    const n = nextSteps(steps, { a: true });
    expect(startHeading(n.startWith.length, n.open.length)).toEqual({ title: "Start with this one", note: null });
  });

  it("the reassurance is plain and calm", () => {
    expect(REASSURANCE).toBe("Your plan is ready. You don't need to do this all at once.");
    expect(REASSURANCE).not.toMatch(/!/);
  });
});
