import { describe, expect, it } from "vitest";
import type { PlanDocument } from "@/lib/plan/document";
import { kindOf } from "@/lib/plan/kinds";
import { fuzzHouseholds } from "./fixtures/fuzz";
import { ALL_HOUSEHOLDS } from "./fixtures/uxPersonas";
import { buildPlan } from "./helpers/build";

/**
 * UX-25 (owner rule): every gear item in a plan (picked or deferred) has at least one To do step, in some stage,
 * that offers it (the step's buy list). Window protection, the sanitation kit and the generator included.
 */
function stepBuys(doc: PlanDocument): Set<string> {
  const ids = new Set<string>();
  for (const s of doc.sections) for (const b of s.blocks) if (b.type === "checklist" && kindOf(b) === "do") for (const i of b.items) for (const id of i.buy ?? []) ids.add(id);
  return ids;
}
async function missing(a: Parameters<typeof buildPlan>[0]) {
  const r = await buildPlan(a);
  const buys = stepBuys(r.document);
  return [...r.computed.budget.picks, ...r.computed.budget.deferred].map((p) => p.item.id).filter((id) => !buys.has(id));
}

describe("every gear item has a To do step (UX-25)", () => {
  for (const h of ALL_HOUSEHOLDS) it(h.id, async () => expect(await missing(h.a)).toEqual([]));
  it("300 fuzz households", async () => {
    const gaps: Record<string, number> = {};
    for (const a of fuzzHouseholds()) for (const id of await missing(a)) gaps[id] = (gaps[id] ?? 0) + 1;
    expect(gaps).toEqual({});
  }, 120_000);
});
