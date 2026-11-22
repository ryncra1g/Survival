import type { LevelOption, Overview } from "@/lib/plan/document";
import { compareOptions, LEVEL_LABEL as LABEL, type CompareRow } from "@/lib/plan/compare";

/**
 * D3 / GEAR-01: one main pick per slot, plus "Compare options": Lower-cost, Upgrade and Other choices,
 * each with the price difference and the plan's new total. Switching is a plain form POST to
 * /api/plans/<id>/choose (works without JavaScript); the demo passes `onChoose`. Ranking never uses commission.
 */
export function CompareOptions({
  planId,
  group,
  levels,
  back,
  budget,
  models = [],
  onChoose,
}: {
  planId: string;
  group: string;
  levels: LevelOption[];
  back: string;
  budget?: Overview["budget"];
  models?: string[];
  onChoose?: (group: string, level: LevelOption["level"]) => void;
}) {
  const { current, lower, upgrade, alternatives } = compareOptions(levels, budget);
  // Plans saved before Compare options had no prices per level: list the levels to switch to.
  const fallback: CompareRow[] = current && !lower.length && !upgrade.length && !alternatives.length
    ? levels.filter((l) => !l.selected).map((l) => ({ level: l.level, name: l.name, price: l.price, diff: "", newTotal: "", over: null }))
    : [];
  const Row = ({ r }: { r: CompareRow }) => {
    const label = `Switch to ${LABEL[r.level]}: ${r.name}, ${r.price}`;
    const btn = "btn-ghost border border-line text-sm px-3 min-h-[40px] shrink-0";
    return (
      <li className="flex items-start justify-between gap-3 py-2">
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{group === "food" ? r.name : `${LABEL[r.level]}: ${r.name}`}</p>
          <p className="text-muted">
            {r.price}
            {r.diff && <> · <span className="text-ink font-medium">{r.diff}</span> · new total {r.newTotal}</>}
          </p>
          {r.over && <p className="text-warn font-medium">{r.over}</p>}
        </div>
        {onChoose ? (
          <button type="button" className={btn} aria-label={label} onClick={() => onChoose(group, r.level)}>Switch</button>
        ) : (
          <form action={`/api/plans/${planId}/choose`} method="post">
            <input type="hidden" name="group" value={group} />
            <input type="hidden" name="level" value={r.level} />
            <input type="hidden" name="back" value={back} />
            <button className={btn} aria-label={label}>Switch</button>
          </form>
        )}
      </li>
    );
  };
  return (
    <div className="mt-2" data-testid="compare-options">
      {current && (
        <p className="text-sm">
          <span className="rounded border border-brand bg-brand-soft px-1.5 py-0.5 text-xs font-semibold" aria-current="true">✓ {LABEL[current.level]}</span>{" "}
          <span className="text-muted">{current.name}</span>
        </p>
      )}
      <details className="mt-1 group/cmp">
        <summary className="cursor-pointer text-sm font-semibold text-brand min-h-[40px] inline-flex items-center">Compare options</summary>
        <div className="mt-1 rounded-lg border border-line p-3">
          {lower.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Lower-cost</p>
              <ul className="divide-y divide-line">{lower.map((r) => <Row key={r.level} r={r} />)}</ul>
            </>
          )}
          {upgrade.length > 0 && (
            <>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Upgrade</p>
              <ul className="divide-y divide-line">{upgrade.map((r) => <Row key={r.level} r={r} />)}</ul>
            </>
          )}
          {alternatives.length > 0 && <ul className="divide-y divide-line">{alternatives.map((r) => <Row key={r.level} r={r} />)}</ul>}
          {fallback.length > 0 && <ul className="divide-y divide-line">{fallback.map((r) => <Row key={r.level} r={r} />)}</ul>}
          {models.length > 1 && (
            <>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Other choices</p>
              <p className="text-sm">Same kind of item from other makers: {models.join("; ")}.</p>
            </>
          )}
          <p className="mt-2 text-xs text-muted">Your budget is a target, not a limit. Safety items come first; commissions never change the order.</p>
        </div>
      </details>
    </div>
  );
}
