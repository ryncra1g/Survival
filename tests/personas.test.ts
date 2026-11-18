import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS as C } from "@/lib/rules/constants";
import { documentStrings, lintDocument } from "@/lib/safety/linter";
import { PERSONAS } from "./fixtures/personas";

const run = async (name: string) => {
  const p = PERSONAS.find((x) => x.name === name)!;
  const r = await generatePlan(p.a, C, SEED_CATALOG, { useLlm: false, now: new Date("2026-11-18") });
  const text = documentStrings(r.document).join("\n");
  const picked = (id: string) => r.computed.budget.picks.some((x) => x.item.id === id);
  return { r, text, picked };
};

describe("focus-group personas (regressions for issues they raised)", () => {
  it("every persona plan passes the safety linter", async () => {
    for (const p of PERSONAS) {
      const r = await generatePlan(p.a, C, SEED_CATALOG, { useLlm: false, now: new Date("2026-11-18") });
      expect(lintDocument(r.document), p.name).toEqual([]);
    }
  });
  it("Seattle family gets earthquake steps and the quake kit", async () => {
    const { text, picked } = await run("Sam & Lee");
    expect(text).toMatch(/Drop, cover and hold on/);
    expect(picked("quake-kit")).toBe(true);
  });
  it("New Orleans gets flood guidance", async () => {
    const { text } = await run("Tasha");
    expect(text).toMatch(/Turn around\. Six inches of moving water/);
  });
  it("Phoenix gets heat + wildfire smoke guidance", async () => {
    const { text, picked } = await run("Gil & Rosa");
    expect(text).toMatch(/can't run central AC/);
    expect(text).toMatch(/Air quality index/);
    expect(picked("smoke-masks")).toBe(true);
  });
  it("older/mobility households are told to register with the special-needs program", async () => {
    for (const n of ["Ray & June", "The Olsons"]) expect((await run(n)).text).toMatch(/special-needs \(access & functional needs\) registry/);
  });
  it("owners of a portable generator with a fuel furnace get the inlet/interlock and fuel cans", async () => {
    const { picked, r } = await run("The Olsons");
    const offered = picked("inlet-interlock") || r.computed.budget.deferred.some((d) => d.item.id === "inlet-interlock" && /budget/.test(d.reason ?? ""));
    expect(offered).toBe(true);
    expect(picked("gas-cans")).toBe(true);
    expect(picked("generator-dual") || picked("generator-small")).toBe(false);
  });
  it("standby generator owners aren't sold a well transfer switch", async () => {
    expect((await run("Hank")).picked("well-switch")).toBe(false);
  });
  it("wood-stove homes don't get the propane heater strategy", async () => {
    expect((await run("Walt")).r.computed.heat).not.toContain("indoor_propane_heater");
  });
  it("everyone gets a phone power bank, even on the smallest budget", async () => {
    expect((await run("Priya")).picked("power-bank")).toBe(true);
  });
});
