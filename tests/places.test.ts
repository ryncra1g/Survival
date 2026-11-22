import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aiSummary } from "@/lib/plan/aiSummary";
import { renderPlanEmail } from "@/lib/email/render";
import { buildPlan } from "./helpers/build";

/** D4 (launch): the backup-destination address is typed and printed in the browser only. */
describe("My places at launch: nothing saved or sent", () => {
  const src = readFileSync("components/PlacesForm.tsx", "utf8");
  it("the form can't send anything: no form element, no field names, no network calls, no storage", () => {
    expect(src).not.toMatch(/<form\b/);
    expect(src).not.toMatch(/\sname=/);
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
  });
  it("says the address isn't saved, and links directions only on tap (no embedded map)", () => {
    expect(src).toContain("PLACES_NOT_SAVED");
    expect(src).not.toMatch(/<iframe|maps\.googleapis|maps\/embed/i);
  });
  it("plans, emails and Copy for AI have no place to put an address", async () => {
    const r = await buildPlan();
    const all = [JSON.stringify(r.document), renderPlanEmail(r.document, { appUrl: "x", unsubscribeUrl: "x", mailingAddress: "x", planUrl: "x", pdfAttached: true }).html, aiSummary(r.document, r.computed.answers)];
    for (const t of all) expect(t).not.toMatch(/"(address|place|places)"\s*:/);
  });
});
