import { describe, expect, it } from "vitest";
import { nextSteps, REASSURANCE, START_WITH, startHeading } from "@/lib/plan/nextSteps";
import { STAGES, STAGE } from "@/lib/plan/priority";
import type { PlanDocument } from "@/lib/plan/document";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan } from "./helpers/build";

/** The dashboard's priority steps, in plan order, the way components/PlanView.tsx reads them. */
function priority(doc: PlanDocument) {
  const out: { stage: string; step: { id: string; text: string; title?: string } }[] = [];
  let stage = "";
  for (const b of doc.sections.find((s) => s.id === "priorities")?.blocks ?? []) {
    if (b.type === "subheading") stage = b.text;
    else if (b.type === "checklist" && STAGES.includes(stage)) for (const i of b.items) out.push({ stage, step: { id: i.id, text: i.text, title: i.title } });
  }
  return out;
}
const tick = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, true]));

describe("first plan screen: Start with these 3, one count", () => {
  it.each(PERSONAS.map((p) => [p.name, p.a] as const))("%s", async (_n, a) => {
    const { document: doc } = await buildPlan(a);
    const steps = priority(doc);
    const week = steps.filter((s) => s.stage === STAGE.week);
    const ids = steps.map((s) => s.step.id);

    // First view: reassurance, the plan's own first 3 "This week" steps, "0 of 3 done", and the rest one tap away.
    const first = nextSteps(steps, {});
    expect(first.fresh).toBe(true);
    expect(first.shown.map((s) => s.step.id)).toEqual(ids.slice(0, START_WITH));
    expect(first.shown.every((s) => s.stage === STAGE.week)).toBe(true);
    expect(first.count).toBe("0 of 3 done");
    expect(first.rest.length).toBe(week.length - START_WITH);
    expect(startHeading(first.onFirst, first.startWith.length, first.open.length, first.shown.length)).toEqual({
      title: "Start with these 3",
      note: steps.length > START_WITH ? "Everything else can wait." : null,
    });

    // Tick one: the same 3 stay on screen (Undo), the count grows, the reassurance goes.
    const one = nextSteps(steps, tick([ids[1]]));
    expect(one.fresh).toBe(false);
    expect(one.shown.map((s) => s.step.id)).toEqual(ids.slice(0, START_WITH));
    expect(one.count).toBe("1 of 3 done");

    // All 3 done: the next 3, and the count becomes the week's.
    const three = nextSteps(steps, tick(ids.slice(0, 3)));
    expect(three.onFirst).toBe(false);
    expect(three.shown.map((s) => s.step.id)).toEqual(ids.slice(3, 3 + START_WITH));
    expect(three.count).toBe(`This week: 3 of ${week.length}`);
    expect(startHeading(three.onFirst, three.startWith.length, three.open.length).title).toBe("Next, these 3");
  });

  it("every first-screen card title is short (one line where possible), and its full text is kept", async () => {
    for (const p of PERSONAS) {
      const steps = priority((await buildPlan(p.a)).document).slice(0, START_WITH);
      for (const s of steps) {
        const title = s.step.title ?? s.step.text;
        expect(title.length, `${p.name}: ${title}`).toBeLessThanOrEqual(45);
        expect(s.step.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("a title never changes a number in the step", async () => {
    for (const p of PERSONAS) {
      for (const s of priority((await buildPlan(p.a)).document)) {
        for (const num of s.step.title?.match(/\d[\d,.]*/g) ?? []) expect(s.step.text, `${p.name}: ${s.step.title}`).toContain(num);
      }
    }
  });

  it("says 'this one' and drops 'can wait' when one step is left", () => {
    const steps = [{ stage: STAGE.week, step: { id: "a" } }, { stage: STAGE.week, step: { id: "b" } }, { stage: STAGE.week, step: { id: "c" } }, { stage: STAGE.week, step: { id: "d" } }];
    const n = nextSteps(steps, tick(["a", "b", "c"]));
    expect(startHeading(n.onFirst, n.startWith.length, n.open.length)).toEqual({ title: "Next, this one", note: null });
  });

  it("the reassurance is plain and calm", () => {
    expect(REASSURANCE).toBe("Your plan is ready. You don't need to do this all at once.");
    expect(REASSURANCE).not.toMatch(/!/);
  });
});

describe("code review follow-ups", () => {
  const steps = ["a", "b", "c", "d", "e"].map((id, i) => ({ stage: i < 4 ? STAGE.week : STAGE.month, step: { id } }));
  it("a just-ticked step keeps its place with Undo, even the third of the first 3 and the last one", () => {
    const third = nextSteps(steps, tick(["a", "b", "c"]), ["c"]);
    expect(third.onFirst).toBe(true);
    expect(third.shown.map((s) => s.step.id)).toEqual(["a", "b", "c"]);
    expect(third.count).toBe("3 of 3 done");
    const last = nextSteps(steps, tick(["a", "b", "c", "d", "e"]), ["e"]);
    expect(last.shown.map((s) => s.step.id)).toEqual(["e"]);
    expect(last.stage).toBe(STAGE.month);
    // Without the linger the moment is over: nothing left, no stage.
    expect(nextSteps(steps, tick(["a", "b", "c", "d", "e"])).stage).toBeUndefined();
  });
  it("cards can cross into the next stage (the card shows its stage label)", () => {
    const n = nextSteps(steps, tick(["a", "b", "c"]));
    expect(n.shown.map((s) => `${s.step.id}:${s.stage}`)).toEqual([`d:${STAGE.week}`, `e:${STAGE.month}`]);
    expect(n.stage).toBe(STAGE.week);
  });
  it("the safety linter reads step titles too", async () => {
    const { lintDocument } = await import("@/lib/safety/linter");
    const { document: doc } = await buildPlan(PERSONAS[0].a);
    const pr = doc.sections.find((s) => s.id === "priorities")!;
    const list = pr.blocks.find((b) => b.type === "checklist")!;
    if (list.type !== "checklist") throw new Error("no checklist");
    const bad = { ...doc, sections: doc.sections.map((s) => (s === pr ? { ...s, blocks: s.blocks.map((b) => (b === list ? { ...list, items: [{ ...list.items[0], title: "Run your generator in the garage" }, ...list.items.slice(1)] } : b)) } : s)) };
    expect(lintDocument(bad).length).toBeGreaterThan(lintDocument(doc).length);
  });
});
