import { describe, expect, it } from "vitest";
import { DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";
import { computeEvac } from "@/lib/rules/engine";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { EV_CHARGE, HALF_FULL } from "@/lib/plan/build";
import { renderPlanEmail } from "@/lib/email/render";
import { ALL_HOUSEHOLDS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/** UX-3: one fuel rule. "Keep every gas vehicle at least half full", plus "fill up completely" only when the trip needs more. */
const PER_TANK_TARGET = /\b(each|every|per) tank\b[^.]{0,30}\d|\btank (above|minimum|at least) \d|\bKeep in each tank\b|\bfuel reserve per (car|vehicle)\b/i;
const OLD_RULE = /half a tank/i;
const FUEL_IN_CABIN = /\b(carry|keep|store|bring|put)\b[^.]{0,40}\b(gas|gasoline|fuel|gas cans?)\b[^.]{0,40}\b(in|inside)\s+(the|your)\s+(car|vehicle|cabin|trunk)\b/i;

const trip = (miles: number) => computeEvac({ ...DEFAULT_ANSWERS, evacuation: { destination: "friends_family", distanceMiles: miles } }, C)!;

describe("fuel rule (UX-3)", () => {
  it("hand-computed: 25 mpg, +50% margin, a 14-gal tank (half = 7 gal)", () => {
    expect(trip(50).reserveGalPerVehicle).toBe(3); // 50/25 = 2 × 1.5
    expect(trip(50).tripNeedsFullTank).toBe(false);
    expect(trip(120).reserveGalPerVehicle).toBe(7.2); // 4.8 × 1.5 > 7
    expect(trip(120).tripNeedsFullTank).toBe(true);
    expect(trip(250).reserveGalPerVehicle).toBe(15); // 10 × 1.5
    expect(trip(250).tripNeedsFullTank).toBe(true);
  });

  it("the cabin check catches a suggestion and lets the safety line through", () => {
    expect("Keep a spare gas can in the trunk.").toMatch(FUEL_IN_CABIN);
    expect("Never store spare gasoline inside the car cabin").toMatch(FUEL_IN_CABIN);
    expect(/\b(never|don't|do not|not)\b/i.test("Never store spare gasoline inside the car cabin")).toBe(true);
    expect(HALF_FULL).not.toMatch(PER_TANK_TARGET);
    expect(`Gas vehicles: ${HALF_FULL}`).not.toMatch(PER_TANK_TARGET);
    expect("keep each tank above 15 gallons").toMatch(PER_TANK_TARGET);
  });

  for (const h of ALL_HOUSEHOLDS) {
    it(`${h.id}: one rule, no per-tank gallon target, no fuel in the cabin`, async () => {
      const r = await buildPlan(h.a);
      const doc = JSON.stringify(r.document);
      const email = renderPlanEmail(r.document, { appUrl: "x", unsubscribeUrl: "x", mailingAddress: "x", planUrl: "x", pdfAttached: true }).text;
      for (const t of [doc, email]) {
        expect(t).not.toMatch(PER_TANK_TARGET);
        expect(t).not.toMatch(OLD_RULE);
        // "Never store spare gasoline inside the car cabin" is the safety line itself; only positive suggestions fail.
        const suggests = t.split(/(?<=[.!?"])\s*|\\n/).filter((x) => FUEL_IN_CABIN.test(x) && !/\b(never|don't|do not|not)\b/i.test(x));
        expect(suggests).toEqual([]);
      }
      const burnsFuel = h.a.vehicleFuels.some((v) => v !== "ev");
      expect(doc.includes(HALF_FULL)).toBe(burnsFuel);
      const ev = r.computed.evacuation;
      const fill = /fill up completely as soon as a storm or evacuation warning is issued/.test(doc);
      expect(fill).toBe(!!ev && burnsFuel && ev.tripNeedsFullTank);
    });
  }
});

describe("fuel rule edge cases (code review)", () => {
  it("an EV-only household is never told to fill a tank", async () => {
    const a = { ...DEFAULT_ANSWERS, zip: "11746", vehicleFuels: ["ev" as const], evacuation: { destination: "friends_family" as const, distanceMiles: 250 } };
    const doc = JSON.stringify((await buildPlan(a)).document);
    expect(doc).not.toMatch(/fill up completely|half full/);
  });
});

describe("gas and EV wording (owner decision)", () => {
  const week = async (fuels: Answers["vehicleFuels"]) => {
    const r = await buildPlan({ ...DEFAULT_ANSWERS, zip: "60614", vehicleFuels: fuels });
    const b = r.document.sections.find((s) => s.id === "priorities")!.blocks.filter((x) => x.type === "checklist");
    return { steps: b.flatMap((x) => (x.type === "checklist" ? x.items.map((i) => i.text) : [])), doc: JSON.stringify(r.document) };
  };
  it("gas only: the half-full line, no EV line", async () => {
    const { steps, doc } = await week(["gas", "diesel"]);
    expect(steps).toContain("Keep every gas vehicle at least half full.");
    expect(doc).not.toContain(EV_CHARGE);
  });
  it("EV only: only the EV-charging line", async () => {
    const { steps, doc } = await week(["ev"]);
    expect(steps).toContain(EV_CHARGE);
    expect(doc).not.toMatch(/half full/);
  });
  it("mixed: both, each labelled", async () => {
    const { steps } = await week(["gas", "ev"]);
    expect(steps).toContain("Gas vehicles: Keep every gas vehicle at least half full.");
    expect(steps).toContain(`EVs: ${EV_CHARGE}`);
    expect(steps).not.toContain(HALF_FULL); // never unlabelled in a mixed household
  });
});
