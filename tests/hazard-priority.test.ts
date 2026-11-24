import { describe, expect, it } from "vitest";
import type { PlanDocument } from "@/lib/plan/document";
import { lookupZip } from "@/lib/zip/profile";
import { ALL_HOUSEHOLDS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/** UX-13: when a hazard is rated high, its most important step is in the first 3 steps. */
const KEY_ACTION: Record<string, RegExp[]> = {
  wildfire: [/evacuation zone/, /route/, /go-bag/],
  hurricane: [/hurricane evacuation zone/, /route out/],
  flood: [/flood zone/, /higher ground/],
  tornado: [/tornado shelter spot/],
  earthquake: [/water heater/],
  heat: [/stay cool if the power fails/],
  winter: [/warm room/],
};
const firstThree = (doc: PlanDocument) => {
  const b = doc.sections.find((s) => s.id === "priorities")!.blocks.find((x) => x.type === "checklist");
  return b && b.type === "checklist" ? b.items.slice(0, 3) : [];
};

describe("high hazards come first (UX-13)", () => {
  const withHigh = ALL_HOUSEHOLDS.map((h) => ({ ...h, high: Object.keys(KEY_ACTION).filter((k) => (lookupZip(h.a.zip) as unknown as Record<string, string>)[k] === "high") })).filter((h) => h.high.length);
  it("covers every kind of high hazard the fixtures have", () => {
    const kinds = new Set(withHigh.flatMap((h) => h.high));
    for (const k of ["wildfire", "hurricane", "flood", "heat", "winter", "earthquake"]) expect(kinds.has(k), k).toBe(true);
  });
  for (const h of withHigh) {
    it(`${h.id} (${h.high.join(", ")}): each high hazard's key action is in the first 3 steps`, async () => {
      const r = await buildPlan(h.a);
      const top = firstThree(r.document).map((i) => i.text).join("\n");
      for (const k of h.high) for (const re of KEY_ACTION[k]) expect(top, `${k}: ${re}`).toMatch(re);
    });
  }
  it("wildfire: the step offers a go-bag and links to official wildfire guidance", async () => {
    const r = await buildPlan(ALL_HOUSEHOLDS.find((h) => h.id === "rural-wildfire")!.a);
    const step = firstThree(r.document).find((i) => i.id === "week-hazard")!;
    expect(step.buy).toContain("go-bag");
    expect(step.link?.url).toBe("https://www.ready.gov/wildfires");
  });
  it("no high hazard: no hazard step", async () => {
    const r = await buildPlan(ALL_HOUSEHOLDS.find((h) => h.id === "solo-renter")!.a);
    expect(JSON.stringify(r.document)).not.toContain('"week-hazard"');
  });
});
