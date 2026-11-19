"use client";
import type { Overview } from "@/lib/plan/document";
import { gotId } from "./BuyIfNeeded";
import { useChecks } from "./ChecksContext";

const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const usdRange = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? usd(lo) : `${usd(lo)}–${usd(hi)}`);
const PHASE = { 1: "Buy now (life safety)", 2: "Next (power & comfort)", 3: "Later (upgrades)" } as const;

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-1 h-2.5 w-full rounded-full bg-brand-soft" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}

/**
 * Plan dashboard: progress on every checklist step, the headline numbers (each with its math), and the gear
 * list with "Got it" ticks and what's left to buy. Ticks sync like the checklists (ChecksProvider).
 */
export function Dashboard({ overview, stepIds, buyHref }: { overview?: Overview; stepIds: string[]; buyHref: Record<string, string> }) {
  const { checks, toggle } = useChecks();
  const done = stepIds.filter((id) => checks[id]).length;
  const pct = stepIds.length ? (done / stepIds.length) * 100 : 0;
  const gear = overview?.gear ?? [];
  const got = gear.filter((g) => checks[gotId(g.itemId)]);
  const left = gear.filter((g) => !checks[gotId(g.itemId)] && !g.later);
  const leftLow = left.reduce((t, g) => t + g.low, 0);
  const leftHigh = left.reduce((t, g) => t + g.high, 0);

  return (
    <section aria-labelledby="dash-h" className="card mt-5 p-4 sm:p-5" data-testid="dashboard">
      <h2 id="dash-h" className="text-lg font-bold">Your plan at a glance</h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex justify-between text-sm"><span className="font-semibold">Steps done</span><span className="tabular">{done} of {stepIds.length}</span></p>
          <Bar value={pct} label="Steps done" />
        </div>
        {gear.length > 0 && (
          <div>
            <p className="flex justify-between text-sm"><span className="font-semibold">Gear you have</span><span className="tabular">{got.length} of {gear.length}</span></p>
            <Bar value={(got.length / gear.length) * 100} label="Gear you have" />
          </div>
        )}
      </div>

      {overview && (
        <ul className="mt-4 grid grid-cols-2 gap-2">
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

      {gear.length > 0 && (
        <details className="group mt-4 rounded-lg border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-semibold">Your gear list</span>
              <span className="block text-sm text-muted tabular">{left.length ? `${left.length} to buy now or next · about ${usdRange(leftLow, leftHigh)}` : "Everything planned is ticked off"}</span>
            </span>
            <span aria-hidden className="text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="px-3 pb-3">
            <p className="text-sm text-muted">Tick what you already have; its Buy buttons disappear across your plan.</p>
            {([1, 2, 3] as const).map((ph) => {
              const rows = gear.filter((g) => g.phase === ph);
              if (!rows.length) return null;
              return (
                <div key={ph} className="mt-3">
                  <h3 className="text-sm font-semibold">{PHASE[ph]}</h3>
                  <ul className="mt-1 divide-y divide-line border-y border-line">
                    {rows.map((g) => {
                      const have = !!checks[gotId(g.itemId)];
                      return (
                        <li key={g.itemId} className="flex items-center gap-3 py-2">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={have} onChange={() => toggle(gotId(g.itemId))} aria-label={`I have: ${g.name}`} />
                            <span className={`min-w-0 ${have ? "text-muted line-through" : ""}`}>
                              {g.name}{g.qty > 1 ? ` × ${g.qty}` : ""}{" "}
                              <span className="text-sm text-muted whitespace-nowrap tabular">{usdRange(g.low, g.high)}</span>
                              {g.later && <span className="ml-1 text-xs rounded px-1.5 py-0.5 bg-bg border border-line">later</span>}
                            </span>
                          </label>
                          {!have && buyHref[g.itemId] && (
                            <a href={buyHref[g.itemId]} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost shrink-0 text-brand min-h-[40px] border border-line" aria-label={`Buy ${g.name} (opens a store, affiliate link)`}>Buy</a>
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
