import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlacesForm } from "@/components/PlacesForm";
import { PLACES_NOT_SAVED, PLACES_NOT_SAVED_ACCOUNTS } from "@/lib/copy";
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
    expect(src).toContain("placesNote(accounts)");
    expect(src).not.toMatch(/<iframe|maps\.googleapis|maps\/embed/i);
  });
  it("plans, emails and Copy for AI have no place to put an address", async () => {
    const r = await buildPlan();
    const all = [JSON.stringify(r.document), renderPlanEmail(r.document, { appUrl: "x", unsubscribeUrl: "x", mailingAddress: "x", planUrl: "x", pdfAttached: true }).html, aiSummary(r.document, r.computed.answers)];
    for (const t of all) expect(t).not.toMatch(/"(address|place|places)"\s*:/);
  });
});

/** UX-1: the note never promises saving that the app can't do. */
describe("places note (UX-1)", () => {
  const html = (accounts: boolean) => renderToStaticMarkup(createElement(PlacesForm, { accounts })).replace(/&#x27;|&#39;/g, "'");
  it("accounts off: says it isn't saved and how to keep it, with no email or saving promise", () => {
    const h = html(false);
    expect(h).toContain("This isn't saved. Print this page or write it down.");
    expect(h).not.toMatch(/confirm your email|save your places|any device/i);
    expect(PLACES_NOT_SAVED).not.toMatch(/email/i);
  });
  it("accounts on: also offers saving to the account after confirming an email", () => {
    const h = html(true);
    expect(h).toContain(PLACES_NOT_SAVED_ACCOUNTS);
    expect(h).toMatch(/confirm your email to save your places/i);
  });
  it("the places page passes the real flag, not a hard-coded value", () => {
    expect(readFileSync("app/plan/[id]/places/page.tsx", "utf8")).toContain("accounts={flags().accounts}");
  });
});
