import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { renderConfirmEmail, renderConfirmReminder, renderFollowupEmail, renderLoginEmail, renderPlanEmail } from "@/lib/email/render";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { at, SAMPLE_HOUSEHOLD } from "./fixtures/households";

const meta = { appUrl: "https://app.example", unsubscribeUrl: "https://app.example/api/unsubscribe?u=1&s=x", mailingAddress: "123 Main St, Town, ST 00000" };

describe("emails", () => {
  it("plan email stays under Gmail's ~102 KB clipping limit, even for a big household", async () => {
    const big = at({
      ...SAMPLE_HOUSEHOLD,
      adults: 6,
      childrenAges: [0, 1, 2, 5, 9, 12, 15],
      toddlerNeeds: ["diapers", "formula", "milk"],
      pets: [
        { type: "dog", count: 2, size: "large", specialDiet: true, medications: true },
        { type: "cat", count: 3, size: "small", specialDiet: false, medications: true },
      ],
      poweredDevices: ["cpap", "oxygen"],
      hasPrescriptions: true,
      waterSource: "well",
      vehicleFuels: ["gas", "ev", "diesel"],
      budget: "5000_plus",
    });
    for (const a of [SAMPLE_HOUSEHOLD, big]) {
      const r = await generatePlan(a, C, SEED_CATALOG, { useLlm: false, now: new Date("2026-11-18") });
      const e = renderPlanEmail(r.document, { ...meta, planUrl: "https://app.example/plan/x", pdfAttached: true });
      expect(Buffer.byteLength(e.html)).toBeLessThan(100_000);
      for (const s of r.document.sections) expect(e.html).toContain(s.title.replace(/&/g, "&amp;"));
      expect(e.html).toContain("Sources");
      expect(e.html).toContain("not professional");
    }
  });

  it("every email has the mailing address and an unsubscribe link (CAN-SPAM)", async () => {
    const r = await generatePlan(SAMPLE_HOUSEHOLD, C, SEED_CATALOG, { useLlm: false, now: new Date("2026-11-18") });
    const all = [
      renderPlanEmail(r.document, { ...meta, planUrl: "x", pdfAttached: true }),
      renderConfirmEmail("https://link", meta),
      renderLoginEmail("https://link", meta),
      renderConfirmReminder("https://link", meta),
      ...(["day1", "day3", "day30", "winter", "hurricane"] as const).map((k) => renderFollowupEmail(k, "https://plan", meta)),
    ];
    for (const e of all) {
      expect(e.html).toContain(meta.mailingAddress);
      expect(e.html).toContain(meta.unsubscribeUrl.replace(/&/g, "&amp;"));
      expect(e.text.length).toBeGreaterThan(20);
    }
  });
});
