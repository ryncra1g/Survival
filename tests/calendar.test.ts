import { describe, expect, it } from "vitest";
import { buildIcs, firstDate, fold, icsEscape, rrule } from "@/lib/calendar/ics";
import { maintenanceItems } from "@/lib/plan/maintenance";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan, SAMPLE_HOUSEHOLD } from "./helpers/build";

const FROM = new Date("2026-11-22T15:00:00Z");

describe("D12: maintenance schedule as data", () => {
  it("is exactly the plan's maintenance table, for every persona", async () => {
    for (const a of [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)]) {
      const r = await buildPlan(a);
      const table = r.document.sections.find((s) => s.id === "maintenance")!.blocks[0];
      if (table.type !== "table") throw new Error("table");
      expect(table.rows).toEqual(maintenanceItems(r.computed).map((m) => [m.when, m.task]));
    }
  });
});

describe("D12: Add to my calendar (.ics)", () => {
  it("is valid RFC 5545 structure: CRLF lines, folded at 75 octets, one VEVENT with UID, DTSTAMP and RRULE per item", async () => {
    const r = await buildPlan();
    const items = maintenanceItems(r.computed);
    const ics = buildIcs(items, { from: FROM, uidPrefix: "plan@test", calName: "Test maintenance" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n"); // no bare LF
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, "");
    expect((unfolded.match(/BEGIN:VEVENT/g) ?? []).length).toBe(items.length);
    expect((unfolded.match(/^UID:/gm) ?? []).length).toBe(items.length);
    expect((unfolded.match(/^DTSTAMP:20261122T150000Z$/gm) ?? []).length).toBe(items.length);
    expect((unfolded.match(/^RRULE:/gm) ?? []).length).toBe(items.length);
    expect(unfolded).not.toMatch(/https?:\/\//); // no links
  });
  it("starts on the day it's added; seasonal checks on the 1st of their month", () => {
    expect(firstDate({ id: "x", when: "Monthly", task: "t", repeat: { every: "month" } }, FROM).toISOString().slice(0, 10)).toBe("2026-11-22");
    expect(firstDate({ id: "x", when: "June", task: "t", repeat: { month: 6 } }, FROM).toISOString().slice(0, 10)).toBe("2027-06-01");
    expect(firstDate({ id: "x", when: "November", task: "t", repeat: { month: 11 } }, new Date("2026-10-01")).toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(rrule({ id: "x", when: "", task: "", repeat: { every: "6 months" } })).toBe("FREQ=MONTHLY;INTERVAL=6");
    expect(rrule({ id: "x", when: "", task: "", repeat: { every: "12 months" } })).toBe("FREQ=YEARLY");
  });
  it("escapes text and folds long lines", () => {
    expect(icsEscape("a, b; c\\d")).toBe("a\\, b\\; c\\\\d");
    const long = "SUMMARY:" + "x".repeat(200);
    expect(fold(long).split("\r\n ").join("")).toBe(long);
  });
});
