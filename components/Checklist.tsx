"use client";
import { useChecks } from "./ChecksContext";

/** A tickable list with a running count. Ticks live in ChecksProvider (synced to the plan when possible). */
export function Checklist({ items }: { planId?: string; items: { id: string; text: string }[] }) {
  const { checks, toggle } = useChecks();
  const done = items.filter((i) => checks[i.id]).length;
  return (
    <div className="my-3">
      {items.length > 2 && (
        <p className="text-sm text-muted mb-1" aria-live="polite">
          {done} of {items.length} done{done === items.length ? " ✓" : ""}
        </p>
      )}
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <label className="flex gap-3 items-start py-1 cursor-pointer">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={!!checks[it.id]} onChange={() => toggle(it.id)} />
              <span className={checks[it.id] ? "line-through text-muted" : ""}>{it.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
