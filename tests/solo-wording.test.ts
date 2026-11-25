import { describe, expect, it } from "vitest";
import { documentStrings } from "@/lib/safety/linter";
import * as REQUIRED from "@/lib/safety/required";
import { renderPlanEmail } from "@/lib/email/render";
import { aiSummary } from "@/lib/plan/aiSummary";
import { at } from "./fixtures/households";
import { ALL_HOUSEHOLDS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/**
 * UX-8: a household of 1 adult with no children never gets family-only wording.
 * Generic safety lines ("If a CO alarm sounds or anyone feels dizzy… everyone outside") and the planning
 * assumptions ("1 adult, no children", "0.75 gal/child/day") are not family wording and aren't listed here.
 */
export const FAMILY_ONLY: RegExp[] = [
  /\bkids?\b/i,
  /helmets for the kids/i,
  /come get us/i,
  /\bfamily meeting/i,
  /\byour family\b/i,
  /\bfamilies\b/i,
  /\bloved ones\b/i,
  /\bEveryone sleeps\b/i,
  /\bMove everyone\b/i,
  /\bfor everyone\b/i,
  /\bgo-bag for each person\b/i,
  /\bsleeping bag for each person\b/i,
  /\bN95 masks for each person\b/i,
  /\bheads\b/i,
];
const SOLO = [
  ...ALL_HOUSEHOLDS.filter((h) => h.a.adults === 1 && h.a.childrenAges.length === 0),
  // A one-person house with a car, a generator and tornado/winter risk reaches the most of these lines.
  { id: "solo, 90 days, house, generator", a: at({ zip: "55401", adults: 1, childrenAges: [], scenarioDays: 90, homeType: "house", hasGarage: true, heatSources: ["electric"], backupPower: "portable_generator", vehicleFuels: ["gas"], evacuation: { mode: "fallback", locationType: "friends_family", distanceMiles: 120 } }) },
  { id: "solo, older, Florida", a: at({ zip: "33908", adults: 1, childrenAges: [], elderlyOrMobility: true, scenarioDays: 14, homeType: "house", vehicleFuels: [] }) },
  { id: "solo, wildfire", a: at({ zip: "95969", adults: 1, childrenAges: [], scenarioDays: 14, homeType: "house", vehicleFuels: ["gas"] }) },
];

describe("one-person plans have no family-only wording (UX-8)", () => {
  it("checks at least 5 one-person households", () => expect(SOLO.length).toBeGreaterThanOrEqual(5));
  for (const h of SOLO) {
    it(h.id, async () => {
      const r = await buildPlan(h.a);
      const email = renderPlanEmail(r.document, { appUrl: "x", unsubscribeUrl: "x", mailingAddress: "x", planUrl: "x", pdfAttached: true }).text;
      const lines = [...documentStrings(r.document), ...email.split("\n"), ...aiSummary(r.document, r.computed.answers).split("\n")];
      // Required safety text is fixed wording checked by the safety suite; it isn't family wording.
      const required = Object.values(REQUIRED).filter((v): v is string => typeof v === "string");
      const hits = lines.filter((l) => !required.some((r) => l.includes(r)) && FAMILY_ONLY.some((re) => re.test(l)));
      expect([...new Set(hits)]).toEqual([]);
    });
  }
  it("households with children still get the kids' lines", async () => {
    const r = await buildPlan(at({ zip: "55401", adults: 2, childrenAges: [6], scenarioDays: 14, heatSources: ["electric"] }));
    expect(documentStrings(r.document).join("\n")).toMatch(/keep kids warm first/);
  });
});
