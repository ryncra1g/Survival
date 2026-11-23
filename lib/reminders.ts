import type { ReminderPrefs } from "@/lib/accountData";
import type { MaintenanceItem } from "@/lib/plan/maintenance";

/**
 * D12 (accounts track): which maintenance reminders are due today. Opt-in only (prefs.enabled), per item
 * on/off and frequency. Schedules count from the plan's creation date (the same start the calendar uses).
 * - "When it's due": monthly items on the same day each month; 6-/12-month items every 6/12 months on
 *   that day; seasonal items on the 1st of their month.
 * - "Monthly" / "Every 3 months": that interval, on the same day of the month.
 */
const day = (d: Date) => Math.min(d.getUTCDate(), 28);
const monthsBetween = (a: Date, b: Date) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());

export function dueReminders(items: MaintenanceItem[], prefs: ReminderPrefs, start: Date, now: Date): MaintenanceItem[] {
  if (!prefs.enabled) return [];
  const months = monthsBetween(start, now);
  const sameDay = day(now) === day(start) && now.getUTCDate() <= 28;
  return items.filter((it) => {
    const p = prefs.types[it.id] ?? { on: true, every: "as_scheduled" as const };
    if (!p.on || months < 0) return false;
    if (p.every === "monthly") return sameDay && months >= 1;
    if (p.every === "quarterly") return sameDay && months >= 3 && months % 3 === 0;
    const r = it.repeat;
    if ("month" in r) return now.getUTCMonth() + 1 === r.month && now.getUTCDate() === 1;
    const every = r.every === "month" ? 1 : r.every === "6 months" ? 6 : 12;
    return sameDay && months >= every && months % every === 0;
  });
}
