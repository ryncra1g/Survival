"use client";
import { useChecks } from "./ChecksContext";
import { BuyNote, StepExtras, type StepView } from "./StepExtras";

/** A tickable list with a running count. Ticks live in ChecksProvider (synced to the plan when possible). */
export function Checklist({ items, affiliate = false }: { planId?: string; items: StepView[]; affiliate?: boolean }) {
  const { checks, toggle } = useChecks();
  const done = items.filter((i) => checks[i.id]).length;
  return (
    <div className="my-3">
      {items.length > 2 && (
        <p className="text-sm text-muted mb-1" aria-live="polite">
          {done} of {items.length} done{done === items.length ? " ✓" : ""}
        </p>
      )}
      {items.some((i) => i.buy && !checks[i.id]) && <BuyNote affiliate={affiliate} className="mb-1" />}
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <label className="flex min-h-[44px] gap-3 items-start py-2 cursor-pointer">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={!!checks[it.id]} onChange={() => toggle(it.id)} />
              <span className={checks[it.id] ? "line-through text-muted" : ""}>{it.text}</span>
            </label>
            {!checks[it.id] && <div className="pl-8 pb-2"><StepExtras step={it} /></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
