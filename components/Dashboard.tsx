"use client";
import { useEffect, useState } from "react";
import type { Overview } from "@/lib/plan/document";
import { gotId } from "./BuyIfNeeded";
import { useChecks } from "./ChecksContext";
import { Chevron } from "./Chevron";
import { ReadyMark } from "./Illustration";
import { BuyNote, StepExtras, type StepView } from "./StepExtras";
import { budgetStatus } from "@/lib/plan/compare";
import { nextSteps, REASSURANCE, startHeading } from "@/lib/plan/nextSteps";

const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const usdRange = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? usd(lo) : `${usd(lo)}–${usd(hi)}`);
const PHASE = { 1: "Buy now (life safety)", 2: "Next (power & comfort)", 3: "Upgrades" } as const;

/** A priority step and the stage it belongs to ("This week", "This month"…), in plan order. */
export type PriorityStep = { stage: string; step: StepView };

/**
 * The plan's first screen (visual calm pass): one idea at a time. The reassurance, "Start with these 3" with one count,
 * three compact step cards (details behind "How to do it"), and one quiet link to the rest of the week. Nothing else:
 * the numbers and the shopping list are in <PlanOverview> below. Ticks sync like the checklists (ChecksProvider).
 */
export function Dashboard({ priority, affiliate = false }: { priority: PriorityStep[]; affiliate?: boolean }) {
  const { checks, toggle } = useChecks();
  // A step ticked from "the rest of the week" stays a few seconds, struck through, with Undo.
  const [justDone, setJustDone] = useState<string[]>([]);
  useEffect(() => {
    if (!justDone.length) return;
    const t = setTimeout(() => setJustDone([]), 5000);
    return () => clearTimeout(t);
  }, [justDone]);
  const { open, stage, onFirst, shown, rest, startWith, count, fresh } = nextSteps(priority, checks);
  const heading = startHeading(onFirst, startWith.length, open.length, shown.length);
  const lingering = priority.filter((p) => justDone.includes(p.step.id) && !shown.includes(p) && !rest.includes(p));

  const card = ({ step }: PriorityStep, rest = false) => {
    const done = !!checks[step.id];
    const title = step.title ?? step.text;
    const detail = step.title && step.title !== step.text;
    const hasHow = detail || step.why || step.buy || step.link || step.see;
    return (
      <li key={step.id} className="rounded-xl bg-surface px-3 py-1" data-testid={rest ? "rest-step-card" : "step-card"}>
        <div className="flex gap-1">
          {/* 44px tap target around the box */}
          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              className="size-5 accent-[var(--brand)]"
              checked={done}
              onChange={() => {
                toggle(step.id);
                setJustDone((j) => (done ? j.filter((x) => x !== step.id) : [...j, step.id]));
              }}
              aria-label={`Done: ${title}`}
            />
          </label>
          <div className="min-w-0 flex-1 pt-2.5 pb-1">
            <p className={done ? "text-muted line-through" : "font-medium"}>{title}</p>
            {done ? (
              <p className="text-sm" role="status">
                Done.{" "}
                <button type="button" className="underline text-brand min-h-[44px] px-1" onClick={() => { toggle(step.id); setJustDone((j) => j.filter((x) => x !== step.id)); }}>
                  Undo
                </button>
              </p>
            ) : (
              hasHow && (
                <details className="group/how">
                  <summary className="tap list-none cursor-pointer text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
                    How to do it<span aria-hidden className="ml-1 inline-block transition-transform group-open/how:rotate-90">›</span>
                  </summary>
                  <div className="pb-1">
                    {detail && <p className="max-w-prose">{step.text}</p>}
                    <StepExtras step={step} buyNote={{ affiliate }} />
                  </div>
                </details>
              )
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <section aria-labelledby="dash-h" className="mt-3" data-testid="dashboard">
      <h2 id="dash-h" className="sr-only">Your plan at a glance</h2>

      {/* DA-1: say "you can do this" before showing any work. */}
      {fresh && (
        <div className="flex items-center gap-3">
          <ReadyMark className="size-14 shrink-0" />
          <p className="text-lg font-semibold leading-snug" data-testid="reassurance">{REASSURANCE}</p>
        </div>
      )}

      {stage ? (
        <div className={fresh ? "mt-5" : ""} data-testid="next-up">
          <div className="flex items-baseline justify-between gap-3">
            {startWith.length > 0 || onFirst ? <h3 className="text-lg font-bold">{heading.title}</h3> : <span />}
            {/* One count only (item 2): "0 of 3 done", then "This week: N of 10". */}
            {count && <span className="tabular text-sm text-muted shrink-0" data-testid="stage-progress">{count}</span>}
          </div>
          {heading.note && <p className="text-sm text-muted" data-testid="can-wait">{heading.note}</p>}
          <ul className="mt-3 space-y-3">{[...shown, ...lingering].map((p) => card(p))}</ul>
          {rest.length > 0 && (
            <details className="mt-2" data-testid="more-this-stage">
              <summary className="tap list-none cursor-pointer text-brand underline [&::-webkit-details-marker]:hidden" data-testid="more-this-stage-toggle">
                See the rest of {stage.toLowerCase()} ({rest.length} more)
              </summary>
              <ul className="mt-2 space-y-3">{rest.map((p) => card(p, true))}</ul>
              <a href="#priorities" className="tap mt-2 text-sm underline no-print">This month, Later and the full priority list</a>
            </details>
          )}
        </div>
      ) : (
        <p className="font-semibold">Every priority step is done. Keep the plan up to date with the maintenance calendar.</p>
      )}
    </section>
  );
}

/**
 * Below the first screen: the Day 0 link, the key numbers (each with its math) and the shopping list. The gear count
 * shows only once something is ticked or marked owned (item 2: one count on the first screen).
 */
export function PlanOverview({ overview, buyHref, affiliate = false }: { overview?: Overview; buyHref: Record<string, string>; affiliate?: boolean }) {
  const { checks, toggle } = useChecks();
  const gear = overview?.gear ?? [];
  const got = gear.filter((g) => checks[gotId(g.itemId)]);
  const left = gear.filter((g) => !checks[gotId(g.itemId)] && !g.later);
  const leftLow = left.reduce((t, g) => t + g.low, 0);
  const leftHigh = left.reduce((t, g) => t + g.high, 0);
  return (
    <section aria-label="Your numbers and shopping list" className="mt-10 space-y-6" data-testid="plan-overview">
      {/* The one thing to find fast when weather turns */}
      <a href="#day0" className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3 font-semibold text-brand no-underline no-print">
        <span>Storm or outage coming? Open your Day 0 checklist</span>
        <span aria-hidden>→</span>
      </a>

      {/* Key numbers, each with its math */}
      {overview && (
        <div>
          <h2 className="text-lg font-bold">Your numbers</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3" aria-label="Key numbers">
            {overview.stats.map((s) => (
              <li key={s.key}>
                <a href={`#${s.anchor}`} className="block h-full rounded-xl bg-surface p-3 no-underline hover:outline hover:outline-2 hover:outline-brand">
                  <span className="block text-xl font-bold text-brand tabular">{s.value}</span>
                  <span className="block text-sm">{s.label}</span>
                  <span className="block text-xs text-muted tabular">{s.math}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shopping list: everything the plan recommends, with "I have this" ticks */}
      {gear.length > 0 && (
        <details className="group rounded-xl bg-surface" id="shopping">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-bold">Shopping list</span>
              <span className="block text-sm text-muted tabular">{left.length ? `${left.length} items to buy now or next · about ${usdRange(leftLow, leftHigh)}` : "You have everything planned for now"}</span>
              {got.length > 0 && <span className="block text-sm text-muted tabular" data-testid="overall-progress">You have {got.length} of {gear.length} gear items</span>}
            </span>
            <Chevron />
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-muted">Tick what you already have. It comes off your total and its Buy buttons disappear.</p>
            {overview?.budget && budgetStatus(overview.budget) && <p className="mt-1 text-sm text-warn font-medium" data-testid="over-budget">{budgetStatus(overview.budget)}. Your budget is a target: safety items come first, and you can switch any item to a lower-cost option.</p>}
            {/* Item 3: beside the Buy buttons. */}
            {left.some((g) => buyHref[g.itemId]) && <BuyNote affiliate={affiliate} className="mt-2" />}
            {([1, 2, 3] as const).map((ph) => {
              const rows = gear.filter((g) => g.phase === ph);
              if (!rows.length) return null;
              return (
                <div key={ph} className="mt-4">
                  <h3 className="text-sm font-semibold">{PHASE[ph]}</h3>
                  <ul className="mt-1 divide-y divide-line">
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
                                {g.later && <span className="ml-2 text-xs rounded px-1.5 py-0.5 bg-bg border border-line">when budget allows</span>}
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
