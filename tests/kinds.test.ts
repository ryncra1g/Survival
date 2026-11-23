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

describe("section cards (D10): each key number comes from the engine", () => {
  it("water, food, evacuation and the week's steps match the computed plan", async () => {
    const r = await buildPlan();
    const key = (id: string) => r.document.sections.find((s) => s.id === id)?.key;
    expect(key("water")).toEqual({ value: `${r.computed.water.storedGal.toLocaleString("en-US")} gal`, label: "water to store" });
    expect(key("food")?.value).toBe(r.computed.food.totalKcal.toLocaleString("en-US"));
    expect(key("evacuation")?.value).toBe(`${r.computed.evacuation!.reserveGalPerVehicle.toLocaleString("en-US", { maximumFractionDigits: 1 })} gal`);
    const week = r.document.sections.find((s) => s.id === "priorities")!.blocks.find((b) => b.type === "checklist");
    expect(key("priorities")?.value).toBe(String(week && week.type === "checklist" ? week.items.length : -1));
  });
  it("most sections of every persona's plan have a key number", async () => {
    for (const a of PERSONAS.map((p) => p.a)) {
      const { document: doc } = await buildPlan(a);
      expect(doc.sections.filter((s) => s.key).length).toBeGreaterThanOrEqual(doc.sections.length / 2);
    }
  });
});
