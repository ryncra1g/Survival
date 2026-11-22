import type { MaintenanceItem } from "@/lib/plan/maintenance";

/**
 * D12 (launch): "Add to my calendar" as an RFC 5545 .ics file that Apple Calendar, Google Calendar and
 * Outlook import. One repeating all-day event per maintenance item, starting on the day it's added
 * (owner decision: question 4), or the next 1st of the item's month for seasonal checks.
 * No links, no health details, no addresses: just the task text.
 */
const CRLF = "\r\n";

/** Escape TEXT values (RFC 5545 §3.3.11). */
export const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold content lines longer than 75 octets (RFC 5545 §3.1). */
export function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, "utf8");
    const max = parts.length ? 74 : 75; // continuation lines start with a space
    if (curLen + len > max) {
      parts.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  parts.push(cur);
  return parts.join(CRLF + " ");
}

const ymd = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function firstDate(item: MaintenanceItem, from: Date): Date {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  if (!("month" in item.repeat)) return start;
  const m = item.repeat.month - 1;
  const thisYear = new Date(Date.UTC(start.getUTCFullYear(), m, 1));
  return thisYear >= start ? thisYear : new Date(Date.UTC(start.getUTCFullYear() + 1, m, 1));
}

export function rrule(item: MaintenanceItem): string {
  const r = item.repeat;
  if ("month" in r) return `FREQ=YEARLY;BYMONTH=${r.month};BYMONTHDAY=1`;
  if (r.every === "month") return "FREQ=MONTHLY";
  if (r.every === "6 months") return "FREQ=MONTHLY;INTERVAL=6";
  return "FREQ=YEARLY";
}

export function buildIcs(items: MaintenanceItem[], opts: { from: Date; uidPrefix: string; calName: string }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${icsEscape(opts.calName)}//Maintenance//EN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(opts.calName)}`];
  for (const it of items) {
    const d = firstDate(it, opts.from);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${opts.uidPrefix}-${it.id}`,
      `DTSTAMP:${stamp(opts.from)}`,
      `DTSTART;VALUE=DATE:${ymd(d)}`,
      `RRULE:${rrule(it)}`,
      `SUMMARY:${icsEscape(it.task)}`,
      `DESCRIPTION:${icsEscape(`${it.when}: ${it.task}`)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
