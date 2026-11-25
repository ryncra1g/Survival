import type { LevelOption, Overview } from "./document";
import { usd, usdRange } from "./format";

/**
 * D3 / GEAR-01: "Compare options" for one gear slot. The budget is a flexible target, not a cap:
 * every level stays available; each shows the price difference, the plan's new total and, when that
 * goes past the top of the stated budget, "$X over your budget". The stated budget never changes.
 * Prices are the catalog's line totals (price × quantity); totals use the middle of each range.
 * The food slot (D7) has no lower/upgrade order: its approaches are listed as alternatives.
 */
export type CompareRow = {
  level: LevelOption["level"];
  name: string;
  price: string;
  /** Difference from the current pick, e.g. "+$120" or "−$40". */
  diff: string;
  /** UX-11: the whole gear list with this option instead, as a range like the budget section's, e.g. "$457–$1,336". */
  newTotal: string;
  /** "$310 over your budget", or null when within it (or the budget has no top). */
  over: string | null;
  /** Owner decision: full weight in lb when this option is heavy for a household with mobility needs. */
  heavyLb?: number;
};

/** Owner decision (PR #16): the warning on a heavy container offered to a household with mobility needs. */
export const heavyWarning = (lb: number) => `Heavy when full (about ${Math.round(lb)} lb). Choose only if someone can lift it, or store it where you'll use it.`;

/**
 * UX-11: the one plan total. The Budget by phase card, the budget section and Compare options all show the whole
 * gear list (every pick, price × quantity) as a low–high range under this label.
 */
export const GEAR_TOTAL_LABEL = "whole gear list";
export const gearTotal = (budget: Pick<NonNullable<Overview["budget"]>, "totalLow" | "totalHigh">) => usdRange(budget.totalLow, budget.totalHigh);

export const LEVEL_LABEL: Record<LevelOption["level"], string> = { mix: "Recommended mix", essential: "Essential", standard: "Standard", premium: "Premium" };
const ORDER: Record<LevelOption["level"], number> = { mix: -1, essential: 0, standard: 1, premium: 2 };
const mid = (lo = 0, hi = 0) => (lo + hi) / 2;

export function compareOptions(
  levels: LevelOption[],
  budget: Overview["budget"],
): { current: LevelOption | undefined; lower: CompareRow[]; upgrade: CompareRow[]; alternatives: CompareRow[] } {
  const current = levels.find((l) => l.selected);
  const empty = { current, lower: [], upgrade: [], alternatives: [] };
  if (!current || current.low === undefined || !budget) return empty;
  const totalMid = mid(budget.totalLow, budget.totalHigh);
  const row = (l: LevelOption): CompareRow => {
    const d = Math.round(mid(l.low, l.high) - mid(current.low, current.high));
    const total = Math.round(totalMid + d);
    const over = budget.cap !== null && total > budget.cap ? `${usd(total - budget.cap)} over your budget` : null;
    // The same total as the budget section, with this option's prices swapped in.
    const lo = budget.totalLow - (current.low ?? 0) + (l.low ?? 0);
    const hi = budget.totalHigh - (current.high ?? 0) + (l.high ?? 0);
    return { level: l.level, name: l.name, price: l.price, diff: `${d >= 0 ? "+" : "−"}${usd(Math.abs(d))}`, newTotal: gearTotal({ totalLow: lo, totalHigh: hi }), over, ...(l.heavyLb ? { heavyLb: l.heavyLb } : {}) };
  };
  const others = levels.filter((l) => !l.selected && l.low !== undefined);
  if (levels.some((l) => l.level === "mix")) return { ...empty, alternatives: others.map(row) };
  return {
    ...empty,
    lower: others.filter((l) => ORDER[l.level] < ORDER[current.level]).sort((a, b) => ORDER[b.level] - ORDER[a.level]).map(row),
    upgrade: others.filter((l) => ORDER[l.level] > ORDER[current.level]).sort((a, b) => ORDER[a.level] - ORDER[b.level]).map(row),
  };
}

/** The plan's own position against the stated budget, e.g. "$120 over your budget ($1,500–5,000)". */
export function budgetStatus(budget: Overview["budget"]): string | null {
  if (!budget || budget.cap === null) return null;
  const total = Math.round(mid(budget.totalLow, budget.totalHigh));
  return total > budget.cap ? `${usd(total - budget.cap)} over your budget (${budget.label})` : null;
}
