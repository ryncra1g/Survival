import { describe, expect, it } from "vitest";
import { InventorySchema, owned, PlacesSchema, ReminderPrefsSchema, seedInventory } from "@/lib/accountData";
import { dueReminders } from "@/lib/reminders";
import { matchMaterials } from "@/lib/tips/match";
import { maintenanceItems } from "@/lib/plan/maintenance";
import { buildPlan } from "./helpers/build";

describe("D2 inventory", () => {
  it("have and bought count as owned; need and low don't", () => {
    const inv = { a: { status: "have" as const }, b: { status: "bought" as const }, c: { status: "need" as const }, d: { status: "low" as const } };
    expect(["a", "b", "c", "d", "e"].map((id) => owned(inv, id))).toEqual([true, true, false, false, false]);
  });
  it("old 'I have this' ticks become 'have' once, without overwriting the inventory", () => {
    const inv = seedInventory({ radio: { status: "low" } }, { "got-radio": true, "got-co-alarm": true, "week-1": true });
    expect(inv).toEqual({ radio: { status: "low" }, "co-alarm": { status: "have" } });
  });
  it("validates statuses, quantities, dates and ids", () => {
    expect(InventorySchema.safeParse({ "co-alarm": { status: "have", qty: 3, expiresOn: "2027-06-01" } }).success).toBe(true);
    expect(InventorySchema.safeParse({ "co-alarm": { status: "maybe" } }).success).toBe(false);
    expect(InventorySchema.safeParse({ "CO ALARM": { status: "have" } }).success).toBe(false);
    expect(InventorySchema.safeParse({ x: { status: "have", expiresOn: "June" } }).success).toBe(false);
    expect(InventorySchema.safeParse(Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`i${i}`, { status: "have" }]))).success).toBe(false);
  });
  it("places and reminder prefs are bounded", () => {
    expect(PlacesSchema.safeParse([{ id: "p1", name: "Aunt", address: "1 Main St", distanceMiles: 40 }]).success).toBe(true);
    expect(PlacesSchema.safeParse(Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: "x", address: "1 Main" }))).success).toBe(false);
    expect(ReminderPrefsSchema.safeParse({ enabled: true, types: { alarms: { on: true, every: "monthly" } } }).success).toBe(true);
  });
});

describe("D12 email reminders: due dates", () => {
  const start = new Date("2026-01-15T12:00:00Z");
  const at = (iso: string) => new Date(`${iso}T15:00:00Z`);
  it("nothing unless opted in", async () => {
    const items = maintenanceItems((await buildPlan()).computed);
    expect(dueReminders(items, { enabled: false, types: {} }, start, at("2026-02-15"))).toEqual([]);
  });
  it("monthly items on the same day each month; 6- and 12-month items on their months", async () => {
    const items = maintenanceItems((await buildPlan()).computed);
    const on = { enabled: true, types: {} };
    const ids = (d: string) => dueReminders(items, on, start, at(d)).map((i) => i.id);
    expect(ids("2026-02-15")).toContain("alarms");
    expect(ids("2026-02-16")).not.toContain("alarms");
    expect(ids("2026-07-15")).toContain("rotate");
    expect(ids("2026-04-15")).not.toContain("rotate");
    expect(ids("2027-01-15")).toEqual(expect.arrayContaining(["yearly", "review"]));
    expect(ids("2026-11-01")).toContain("winter"); // seasonal: the 1st of its month (sample is Long Island)
  });
  it("per-item off and frequency are honoured", async () => {
    const items = maintenanceItems((await buildPlan()).computed);
    const prefs = { enabled: true, types: { alarms: { on: false, every: "as_scheduled" as const }, rotate: { on: true, every: "quarterly" as const } } };
    const ids = (d: string) => dueReminders(items, prefs, start, at(d)).map((i) => i.id);
    expect(ids("2026-02-15")).not.toContain("alarms");
    expect(ids("2026-04-15")).toContain("rotate");
  });
});

describe("D3b × D2: tips know what you have", () => {
  it("matches a tip's materials to owned inventory names", () => {
    expect(matchMaterials(["blankets", "warm clothes", "sleeping bags"], ["Sleeping bag rated to 0°F", "Wool blanket"])).toEqual(["blankets", "sleeping bags"]);
    expect(matchMaterials(["phones", "flashlights"], ["Headlamps"])).toEqual([]);
  });
});
