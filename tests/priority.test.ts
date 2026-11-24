import { describe, expect, it } from "vitest";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { pdfSections } from "@/lib/pdf/PlanPdf";
import { STAGE, WEEK_MAX } from "@/lib/plan/priority";
import { ALL_HOUSEHOLDS, UX_PERSONAS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/** UX-6 / UX-7 (owner decision): the plan opens on "This week" (≤10 steps); the rest is under "This month" and "Later". */
const priorities = (doc: PlanDocument) => doc.sections.find((s) => s.id === "priorities")!.blocks;
function stages(blocks: Block[]) {
  const out: Record<string, string[]> = {};
  let cur = "";
  for (const b of blocks) {
    if (b.type === "subheading") cur = b.text;
    else if (b.type === "checklist") (out[cur] ??= []).push(...b.items.map((i) => i.id));
  }
  return out;
}

describe("Priority list stages (UX-7)", () => {
  for (const h of ALL_HOUSEHOLDS) {
    it(`${h.id}: "This week" has 3–${WEEK_MAX} steps; stages are This week, This month, Later`, async () => {
      const r = await buildPlan(h.a);
      const blocks = priorities(r.document);
      const heads = blocks.filter((b) => b.type === "subheading").map((b) => (b.type === "subheading" ? b.text : ""));
      expect(heads).toEqual([STAGE.week, STAGE.month, STAGE.later, "Skills to practice"]);
      const st = stages(blocks);
      expect(st[STAGE.week].length).toBeGreaterThanOrEqual(3);
      expect(st[STAGE.week].length).toBeLessThanOrEqual(WEEK_MAX);
      // Week steps only overflow into This month when This week is full.
      if (st[STAGE.week].length < WEEK_MAX) expect(st[STAGE.month].some((id) => id.startsWith("week-"))).toBe(false);
      const all = JSON.stringify(r.document);
      expect(all).not.toMatch(/Within (60|90) days/);
      const short = h.a.scenarioDays <= 14;
      const later = st[STAGE.later] ?? [];
      if (short) {
        expect(later).toEqual([]);
        expect(all).not.toMatch(/"id":"d(60|90)-/);
      } else {
        expect(later.length).toBeGreaterThan(0);
        expect(later.every((id) => /^d(60|90)-/.test(id))).toBe(true);
      }
    });
  }

  it("a week that overflows moves the extra steps to the top of This month, in order", async () => {
    // The oxygen + CPAP household has the most week steps among the UX personas.
    const lens = await Promise.all(UX_PERSONAS.map(async (p) => stages(priorities((await buildPlan(p.a)).document))));
    const overflowed = lens.filter((st) => st[STAGE.month][0]?.startsWith("week-"));
    for (const st of overflowed) {
      expect(st[STAGE.week].length).toBe(WEEK_MAX);
      const moved = st[STAGE.month].filter((id) => id.startsWith("week-"));
      expect(st[STAGE.month].slice(0, moved.length)).toEqual(moved);
    }
  });

  it("the PDF prints the Priority list first, with This week at the top", async () => {
    const r = await buildPlan();
    const order = pdfSections(r.document);
    expect(order[0].id).toBe("priorities");
    expect(order[0].blocks[0]).toMatchObject({ type: "subheading", text: STAGE.week });
    expect(order.length).toBe(r.document.sections.length);
  });
});
