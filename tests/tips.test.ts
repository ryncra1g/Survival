import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ALLOWED_SOURCE_HOSTS, DONT_DO, TIPS, tipsFor } from "@/lib/tips/library";
import { lintText } from "@/lib/safety/linter";
import { renderPlanEmail } from "@/lib/email/render";
import { PlanView } from "@/components/PlanView";
import { buildPlan } from "./helpers/build";

const meta = { appUrl: "https://app.example", unsubscribeUrl: "https://app.example/u", mailingAddress: "x", planUrl: "x", pdfAttached: true };

describe("D3b: the tip library", () => {
  it("every tip has an official source, materials, steps and a last-reviewed date", () => {
    for (const t of TIPS) {
      expect(ALLOWED_SOURCE_HOSTS, t.id).toContain(new URL(t.source.url).host);
      expect(t.steps.length, t.id).toBeGreaterThan(0);
      expect(t.materials.length, t.id).toBeGreaterThan(0);
      expect(t.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("gives no amounts from memory (no numbers in situations or steps)", () => {
    for (const t of TIPS) for (const line of [t.situation, ...t.steps]) expect(line, t.id).not.toMatch(/\d/);
  });
  it("passes the safety linter, including every 'Don't do this' line", () => {
    for (const t of TIPS) for (const line of [t.situation, ...t.steps, ...t.dontDo]) expect(lintText(line), line).toEqual([]);
    for (const d of DONT_DO) expect(lintText(d), d).toEqual([]);
  });
  it("covers water, heat, sanitation, light & power and Day 0", () => {
    expect(new Set(TIPS.map((t) => t.area))).toEqual(new Set(["water", "heat", "sanitation", "light_power", "day0"]));
  });
});

describe("D3b: the linter blocks the owner's 'don't do this' list anywhere", () => {
  const unsafe = [
    "Make a terracotta pot heater with tea candles.",
    "Build a candle heater for the bedroom.",
    "Turn on the gas oven to heat the kitchen.",
    "Use the stovetop for heat overnight.",
    "Warm up the car in the attached garage.",
    "Plug the generator into a wall outlet.",
    "Run a camp stove indoors to stay warm.",
  ];
  const safe = DONT_DO.concat(["A gas range usually works in an outage if you light the burners with a match.", "Keep the car above half a tank."]);
  it("flags unsafe phrasings", () => {
    for (const u of unsafe) expect(lintText(u).length, u).toBeGreaterThan(0);
  });
  it("allows the same practices when the sentence says not to", () => {
    for (const s of safe) expect(lintText(s), s).toEqual([]);
  });
});

describe("D3b: hidden unless DIY_TIPS_ENABLED is on", () => {
  it("plans carry the boxes, but web and email show them only with the flag", async () => {
    const doc = (await buildPlan()).document;
    const areas = doc.sections.filter((s) => s.blocks.some((b) => b.type === "tips")).map((s) => s.id).sort();
    expect(areas).toEqual(["day0", "heat", "power", "sanitation", "water"].sort());
    const web = (diyTips: boolean) => renderToStaticMarkup(createElement(PlanView, { doc, planId: "x", diyTips }));
    expect(web(false)).not.toContain("No time to buy?");
    expect(web(true)).toContain("No time to buy?");
    expect(renderPlanEmail(doc, meta).html).not.toContain("No time to buy?");
    expect(renderPlanEmail(doc, { ...meta, diyTips: true }).html).toContain("No time to buy?");
  });
});

describe("review 5: each box shows only its own area's 'Don't do this' lines", () => {
  it("heat, light & power, water and sanitation get their own lines; the full list appears once, in Day 0", async () => {
    const doc = (await buildPlan()).document;
    const box = (id: string) => doc.sections.find((s) => s.id === id)!.blocks.find((b) => b.type === "tips") as Extract<(typeof doc.sections)[number]["blocks"][number], { type: "tips" }>;
    const own = (area: Parameters<typeof tipsFor>[0]) => tipsFor(area).flatMap((t) => t.dontDo);
    const [candle, grill, oven, car, outlet] = DONT_DO;
    expect(box("day0").dontDo).toEqual(DONT_DO);
    expect(box("heat").dontDo).toEqual([candle, oven, grill, ...own("heat")]);
    expect(box("power").dontDo).toEqual([outlet, car, ...own("light_power")]);
    expect(box("water").dontDo).toEqual(own("water"));
    expect(box("sanitation").dontDo).toEqual(own("sanitation"));
    // Each of the five appears in Day 0, and the whole list appears in no other box.
    const boxes = doc.sections.map((s) => s.blocks.find((b) => b.type === "tips")).filter(Boolean) as ReturnType<typeof box>[];
    expect(boxes.filter((b) => DONT_DO.every((d) => b.dontDo.includes(d)))).toHaveLength(1);
    for (const d of [candle, grill, oven, car, outlet]) expect(box("water").dontDo).not.toContain(d);
  });
});
