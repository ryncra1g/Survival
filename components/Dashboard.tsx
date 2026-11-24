"use client";
import { useEffect, useState } from "react";
import type { Overview } from "@/lib/plan/document";
import { gotId } from "./BuyIfNeeded";
import { useChecks } from "./ChecksContext";
import { Chevron } from "./Chevron";
import { StepExtras, type StepView } from "./StepExtras";
import { budgetStatus } from "@/lib/plan/compare";

const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const usdRange = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? usd(lo) : `${usd(lo)}–${usd(hi)}`);
const PHASE = { 1: "Buy now (life safety)", 2: "Next (power & comfort)", 3: "Later (upgrades)" } as const;

/** A priority step and the stage it belongs to ("This week", "This month"…), in plan order. */
export type PriorityStep = { stage: string; step: StepView };

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-1.5 h-3 w-full rounded-full bg-brand-soft" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(3, value)}%` }} />
    </div>
  );
}

/**
 * The plan's home: what to do next, how far along you are, the key numbers, and what's left to buy.
 * "Next up" is the first unticked priority steps, so it moves forward as you tick them (here or in the plan).
 * Ticks sync like the checklists (ChecksProvider).
 */
export function Dashboard({ overview, priority, allStepIds, buyHref }: { overview?: Overview; priority: PriorityStep[]; allStepIds: string[]; buyHref: Record<string, string> }) {
  const { checks, toggle } = useChecks();
  // A step ticked here stays a few seconds, struck through, with Undo, so a mis-tap is easy to reverse.
  const [justDone, setJustDone] = useState<string[]>([]);
  useEffect(() => {
    if (!justDone.length) return;
    const t = setTimeout(() => setJustDone([]), 5000);
    return () => clearTimeout(t);
  }, [justDone]);
  const open = priority.filter((p) => !checks[p.step.id]);
  // Progress is shown for the current stage (this week, then this month…): a near goal, not 0 of 80.
  const stage = open[0]?.stage;
  const inStage = priority.filter((p) => p.stage === stage);
  const stageDone = inStage.filter((p) => checks[p.step.id]).length;
  const next = priority.filter((p) => justDone.includes(p.step.id) || open.slice(0, 3).includes(p));
  // UX-7: the rest of the current stage (at most 7 more for "This week"), one tap away.
  const more = inStage.filter((p) => !next.includes(p) && !checks[p.step.id]);
  void allStepIds; // one step count on screen (UX-6): the current stage's, To do items only

  const renderStep = ({ step, stage: s }: PriorityStep) => {
    const done = !!checks[step.id];
    const firstOpen = !done && step.id === open[0]?.step.id;
    return (
      <li key={step.id} className="flex gap-2">
        {/* 44px tap target around the box */}
        <label className="-ml-2 -mt-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            className="size-5 accent-[var(--brand)]"
            checked={done}
            onChange={() => {
              toggle(step.id);
              setJustDone((j) => (done ? j.filter((x) => x !== step.id) : [...j, step.id]));
            }}
            aria-label={`Done: ${step.text}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className={done ? "text-muted line-through" : "font-medium"}>
            {step.text}
            {!done && s !== stage && <span className="ml-2 text-xs font-normal rounded px-1.5 py-0.5 bg-bg border border-line whitespace-nowrap">{s}</span>}
          </p>
          {done ? (
            <p className="mt-1 text-sm" role="status">
              Done.{" "}
              <button type="button" className="underline text-brand min-h-[44px] px-1" onClick={() => { toggle(step.id); setJustDone((j) => j.filter((x) => x !== step.id)); }}>
                Undo
              </button>
            </p>
          ) : (
            // The first open step gets its "why"; the others stay short so the dashboard fits on a phone.
            <StepExtras step={firstOpen ? step : { ...step, why: undefined }} />
          )}
        </div>
      </li>
    );
  };

  const gear = overview?.gear ?? [];
  const got = gear.filter((g) => checks[gotId(g.itemId)]);
  const left = gear.filter((g) => !checks[gotId(g.itemId)] && !g.later);
  const leftLow = left.reduce((t, g) => t + g.low, 0);
  const leftHigh = left.reduce((t, g) => t + g.high, 0);

  return (
    <section aria-labelledby="dash-h" className="mt-4 rounded-xl border-2 border-accent bg-surface p-4 sm:p-5" data-testid="dashboard">
      <h2 id="dash-h" className="sr-only">Your plan at a glance</h2>

      {/* Progress: the current stage only. One count on screen (UX-6). */}
      {stage ? (
        <div>
          <p className="flex items-baseline justify-between gap-3">
            <span className="font-bold">{stage}</span>
            <span className="tabular text-sm" data-testid="stage-progress">{stageDone} of {inStage.length} done</span>
          </p>
          <Bar value={(stageDone / inStage.length) * 100} label={`${stage}: steps done`} />
        </div>
      ) : (
        <p className="font-bold">Every priority step is done. Keep the plan up to date with the maintenance calendar.</p>
      )}
      {gear.length > 0 && (
        <p className="mt-1.5 text-sm text-muted tabular" data-testid="overall-progress">
          You have {got.length} of {gear.length} gear items
        </p>
      )}

      {/* Next up: the next three things to do, tickable right here */}
      {next.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Next up</h3>
          <ul className="mt-2 space-y-4">
            {next.map((p) => renderStep(p))}
          </ul>
          {more.length > 0 && (
            <details className="mt-3 rounded-lg border border-line" data-testid="more-this-stage">
              <summary className="min-h-[44px] cursor-pointer px-3 py-2.5 font-semibold">More for {stage?.toLowerCase()}</summary>
              <ul className="space-y-4 px-3 pb-3">{more.map((p) => renderStep(p))}</ul>
            </details>
          )}
          <a href="#priorities" className="mt-1 flex min-h-[44px] items-center text-sm underline no-print">This month, Later and the full priority list</a>
        </div>
      )}


      {/* The one thing to find fast when weather turns */}
      <a href="#day0" className="mt-5 flex min-h-[48px] items-center justify-between gap-3 rounded-lg border-2 border-brand px-3 py-2 font-semibold text-brand no-underline no-print">
        <span>Storm or outage coming? Open your Day 0 checklist</span>
        <span aria-hidden>→</span>
      </a>

      {/* Key numbers, each with its math */}
      {overview && (
        <ul className="mt-5 grid grid-cols-2 gap-2" aria-label="Key numbers">
          {overview.stats.map((s) => (
            <li key={s.key}>
              <a href={`#${s.anchor}`} className="block h-full rounded-lg bg-brand-soft p-3 no-underline hover:outline hover:outline-2 hover:outline-brand">
                <span className="block text-xl font-bold text-brand tabular">{s.value}</span>
                <span className="block text-sm">{s.label}</span>
                <span className="block text-xs text-muted tabular">{s.math}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Shopping list: everything the plan recommends, with "I have this" ticks */}
      {gear.length > 0 && (
        <details className="group mt-4 rounded-lg border border-line" id="shopping">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-bold">Shopping list</span>
              <span className="block text-sm text-muted tabular">{left.length ? `${left.length} items to buy now or next · about ${usdRange(leftLow, leftHigh)}` : "You have everything planned for now"}</span>
            </span>
            <Chevron />
          </summary>
          <div className="px-3 pb-3">
            <p className="text-sm text-muted">Tick what you already have. It comes off your total and its Buy buttons disappear.</p>
            {overview?.budget && budgetStatus(overview.budget) && <p className="mt-1 text-sm text-warn font-medium" data-testid="over-budget">{budgetStatus(overview.budget)}. Your budget is a target: safety items come first, and you can switch any item to a lower-cost option.</p>}
            {([1, 2, 3] as const).map((ph) => {
              const rows = gear.filter((g) => g.phase === ph);
              if (!rows.length) return null;
              return (
                <div key={ph} className="mt-3">
                  <h4 className="text-sm font-semibold">{PHASE[ph]}</h4>
                  <ul className="mt-1 divide-y divide-line border-y border-line">
                    {rows.map((g) => {
                      const have = !!checks[gotId(g.itemId)];
                      return (
                        <li key={g.itemId} className="flex items-center gap-3 py-2">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={have} onChange={() => toggle(gotId(g.itemId))} aria-label={`I have: ${g.name}`} />
                            <span className={`min-w-0 ${have ? "text-muted line-through" : ""}`}>
                              <span className="block">{g.name}</span>
                              <span className="block text-sm text-muted tabular">
                                {g.qty > 1 ? `${g.qty} × ${usdRange(g.low / g.qty, g.high / g.qty)} = ` : ""}{usdRange(g.low, g.high)}
                                {g.later && <span className="ml-2 text-xs rounded px-1.5 py-0.5 bg-bg border border-line">later</span>}
                              </span>
                            </span>
                          </label>
                          {!have && buyHref[g.itemId] && (
                            <a href={buyHref[g.itemId]} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost shrink-0 text-brand min-h-[44px] border border-line" aria-label={`Buy ${g.name} (opens a store)`}>Buy</a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
