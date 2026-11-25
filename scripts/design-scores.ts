/**
 * Averages and under-4 list for a design audit scorecard (docs/DESIGN.md "Scoring").
 *   npx tsx scripts/design-scores.ts docs/ux/DESIGN_AUDIT_<date>.md
 * Reads every markdown table whose header is "| # | Screen | Calm | Trust | Ease | Clarity |" and prints, per table,
 * the average of each quality and every screen that scored under 4. Exits 1 if the LAST table has a score under 4.
 */
import fs from "node:fs";

const Q = ["Calm", "Trust", "Ease", "Clarity"] as const;
export type Row = { screen: string; scores: number[] };

export function parseScorecards(md: string): Row[][] {
  const tables: Row[][] = [];
  let cur: Row[] | null = null;
  for (const line of md.split(/\r?\n/)) {
    if (/^\|\s*#\s*\|\s*Screen\s*\|\s*Calm\s*\|\s*Trust\s*\|\s*Ease\s*\|\s*Clarity\s*\|/.test(line)) {
      cur = [];
      tables.push(cur);
      continue;
    }
    if (!cur) continue;
    if (!line.startsWith("|")) {
      cur = null;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells[0]?.startsWith("---")) continue;
    const scores = cells.slice(2, 6).map(Number);
    if (scores.length === 4 && scores.every((n) => n >= 1 && n <= 5)) cur.push({ screen: cells[1], scores });
  }
  return tables;
}

export const averages = (rows: Row[]) => Q.map((_, i) => rows.reduce((t, r) => t + r.scores[i], 0) / rows.length);

if (process.argv[1]?.endsWith("design-scores.ts")) {
  const file = process.argv[2];
  if (!file) throw new Error("usage: npx tsx scripts/design-scores.ts <audit.md>");
  const tables = parseScorecards(fs.readFileSync(file, "utf8"));
  tables.forEach((rows, t) => {
    const avg = averages(rows);
    console.log(`Scorecard ${t + 1}: ${rows.length} screens · ${Q.map((q, i) => `${q} ${avg[i].toFixed(2)}`).join(" · ")}`);
    for (const r of rows) {
      const low = Q.filter((_, i) => r.scores[i] < 4);
      if (low.length) console.log(`  under 4: ${r.screen} (${low.map((q) => `${q} ${r.scores[Q.indexOf(q)]}`).join(", ")})`);
    }
  });
  const last = tables.at(-1) ?? [];
  if (last.some((r) => r.scores.some((s) => s < 4))) process.exit(1);
}
