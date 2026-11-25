"use client";
import { useState } from "react";
import { REMINDER_EVERY, type ReminderPrefs } from "@/lib/accountData";

const EVERY_LABEL: Record<(typeof REMINDER_EVERY)[number], string> = { as_scheduled: "When it's due", monthly: "Monthly", quarterly: "Every 3 months" };

/** D12 (accounts track): opt-in email reminders per maintenance item. A separate switch from marketing emails. */
export function ReminderSettings({ initial, items }: { initial: ReminderPrefs; items: { id: string; when: string; task: string }[] }) {
  const [prefs, setPrefs] = useState<ReminderPrefs>(initial);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const type = (id: string) => prefs.types[id] ?? { on: true, every: "as_scheduled" as const };
  async function save(next: ReminderPrefs) {
    setPrefs(next);
    const r = await fetch("/api/account/reminders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefs: next }) }).catch(() => null);
    setState(r?.ok ? "saved" : "error");
  }
  return (
    <div className="space-y-4" data-testid="reminder-settings">
      <label className="flex items-start gap-3 card p-4 cursor-pointer">
        <input type="checkbox" className="mt-1 size-5 accent-[var(--brand)]" checked={prefs.enabled} onChange={(e) => save({ ...prefs, enabled: e.target.checked })} />
        <span>
          <span className="font-semibold">Email me when maintenance is due</span>
          <span className="block text-sm text-muted">Off unless you turn it on. Separate from news and seasonal emails. Unsubscribe any time.</span>
        </span>
      </label>
      {prefs.enabled && (
        <ul className="card divide-y divide-line">
          {items.map((m) => (
            <li key={m.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-start gap-2 min-w-0">
                <input type="checkbox" className="mt-1 size-5 accent-[var(--brand)]" checked={type(m.id).on} onChange={(e) => save({ ...prefs, types: { ...prefs.types, [m.id]: { ...type(m.id), on: e.target.checked } } })} />
                <span className="text-sm"><strong>{m.when}:</strong> {m.task}</span>
              </label>
              <select className="input text-sm min-h-[44px]" aria-label={`How often: ${m.task}`} value={type(m.id).every} onChange={(e) => save({ ...prefs, types: { ...prefs.types, [m.id]: { ...type(m.id), every: e.target.value as (typeof REMINDER_EVERY)[number] } } })}>
                {REMINDER_EVERY.map((v) => <option key={v} value={v}>{EVERY_LABEL[v]}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="text-sm text-muted">{state === "saved" ? "Saved." : state === "error" ? "Couldn't save. Try again." : ""}</p>
    </div>
  );
}
