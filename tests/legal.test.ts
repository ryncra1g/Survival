import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { checkConsent, consentRecord, HEALTH_REQUIRED_MSG, needsHealthConsent, TERMS_REQUIRED_MSG, TERMS_VERSION } from "@/lib/legal";
import { addPageNumbers } from "@/lib/pdf/PlanPdf";

const none = { hasPrescriptions: false, poweredDevices: [], elderlyOrMobility: false };

describe("consent before a plan is built", () => {
  it("health consent is needed only for health-adjacent yes answers", () => {
    expect(needsHealthConsent(none)).toBe(false);
    expect(needsHealthConsent({ ...none, hasPrescriptions: true })).toBe(true);
    expect(needsHealthConsent({ ...none, poweredDevices: ["cpap"] })).toBe(true);
    expect(needsHealthConsent({ ...none, elderlyOrMobility: true })).toBe(true);
  });
  it("Terms must be explicitly agreed (true, not truthy)", () => {
    expect(checkConsent(none, undefined)).toBe(TERMS_REQUIRED_MSG);
    expect(checkConsent(none, { terms: "yes" })).toBe(TERMS_REQUIRED_MSG);
    expect(checkConsent(none, { terms: true })).toBeNull();
  });
  it("health answers also need the separate health box", () => {
    const a = { ...none, poweredDevices: ["oxygen"] };
    expect(checkConsent(a, { terms: true })).toBe(HEALTH_REQUIRED_MSG);
    expect(checkConsent(a, { terms: true, health: true })).toBeNull();
  });
  it("records the Terms version and timestamps", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    expect(consentRecord(none, now)).toEqual({ termsVersion: TERMS_VERSION, termsAcceptedAt: now.toISOString(), healthDataConsentAt: null });
    expect(consentRecord({ ...none, hasPrescriptions: true }, now).healthDataConsentAt).toBe(now.toISOString());
  });
});

describe("PDF page numbers", () => {
  it("stamps every page and keeps the page count", async () => {
    const src = await PDFDocument.create();
    for (let i = 0; i < 3; i++) src.addPage([612, 792]);
    const before = await src.save();
    const after = await addPageNumbers(before);
    const out = await PDFDocument.load(after);
    expect(out.getPageCount()).toBe(3);
    expect(after.length).toBeGreaterThan(before.length);
  });
});
