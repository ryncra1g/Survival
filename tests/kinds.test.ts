import { describe, expect, it } from "vitest";
import { defaultKind, kindLabelsAt, kindOf } from "@/lib/plan/kinds";
import type { Block } from "@/lib/plan/document";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan, SAMPLE_HOUSEHOLD } from "./helpers/build";

describe("content kinds (D8): Good to know / To do / To have", () => {
  it("every block of every plan has a kind set by the builder", async () => {
    for (const a of [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)]) {
      const { document: doc } = await buildPlan(a);
      for (const s of doc.sections)
        for (const b of s.blocks) {
          expect(b.kind, `${s.id} ${b.type}`).toBeDefined();
          if (b.type === "checklist") expect(b.kind).toBe("do");
          if (b.type === "products" || b.type === "help" || b.type === "levelchoice") expect(b.kind).toBe("have");
          if (["paragraph", "bullets", "table", "ifthen", "callout", "subheading"].includes(b.type)) expect(b.kind).toBe("know");
        }
    }
  });

  it("only To do items carry checkboxes (only checklists are To do)", async () => {
    const { document: doc } = await buildPlan();
    const blocks = doc.sections.flatMap((s) => s.blocks);
    expect(blocks.filter((b) => kindOf(b) === "do").every((b) => b.type === "checklist")).toBe(true);
    expect(blocks.filter((b) => b.type === "checklist").every((b) => kindOf(b) === "do")).toBe(true);
  });

  it("plans saved before kinds get the same kind from the block type", () => {
    const old: Block = { type: "paragraph", text: "x" };
    expect(kindOf(old)).toBe("know");
    expect(defaultKind({ type: "products" })).toBe("have");
  });

  it("labels only where the kind changes", () => {
    const bl: Block[] = [
      { type: "paragraph", text: "a" },
      { type: "bullets", items: ["b"] },
      { type: "checklist", items: [] },
      { type: "subheading", text: "s" },
      { type: "checklist", items: [] },
      { type: "help", buy: [], links: [] },
    ];
    expect(kindLabelsAt(bl)).toEqual(["know", null, "do", null, null, "have"]);
  });
});
