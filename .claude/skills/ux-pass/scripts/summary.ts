import fs from "node:fs";
import { OUT } from "./common";

/**
 * /ux-pass: one digest of everything the scripts measured, for writing the report.
 *   npx tsx .claude/skills/ux-pass/scripts/summary.ts   → <OUT>/summary.md
 */
const read = (f: string) => (fs.existsSync(`${OUT}/${f}`) ? JSON.parse(fs.readFileSync(`${OUT}/${f}`, "utf8")) : null);
const metrics: any[] = read("metrics.json") ?? [];
const lh: any[] = read("lighthouse.json") ?? [];
const personas: any[] = read("personas.json") ?? [];
const copy = read("copy.json");
const L: string[] = [`# UX pass raw summary (${OUT})`, ""];

L.push("## Captures", "", `${metrics.length} captures, ${metrics.filter((m) => m.error).length} failed.`, "");
for (const m of metrics.filter((m) => m.error || m.titleMismatch)) L.push(`- ${m.error ? "FAILED" : "WRONG SCREEN"} ${m.name} ${m.vp} ${m.scheme}: ${m.error ?? m.title}`);

L.push("", "## Layout (per screen, worst variant)", "", "| Screen | Sideways scroll | Small targets (<44px) | Inline links | Primary (.btn) buttons | First primary in view | Height (screens) |", "|---|---|---|---|---|---|---|");
const byName = new Map<string, any[]>();
for (const m of metrics.filter((m) => !m.error)) byName.set(m.name, [...(byName.get(m.name) ?? []), m]);
for (const [name, ms] of byName) {
  const ox = ms.filter((m) => m.overflowX).map((m) => `${m.vp}/${m.scheme}`);
  const small = ms.reduce((a, m) => (m.smallTargets.length > a.smallTargets.length ? m : a), ms[0]);
  const prim = ms.find((m) => m.vp === "375") ?? ms[0];
  L.push(`| ${name} | ${ox.length ? `YES ${ox.join(", ")}: ${ms.find((m) => m.overflowX).overflowCulprits.slice(0, 2).join("; ")}` : "no"} | ${small.smallTargets.length}${small.smallTargets.length ? `: ${small.smallTargets.slice(0, 4).map((t: any) => `"${t.label}" ${t.w}×${t.h}`).join(", ")}` : ""} | ${prim.smallInlineLinks} | ${prim.primaryButtons.length}${prim.primaryButtons.length ? `: ${prim.primaryButtons.slice(0, 4).join(" / ")}` : ""} | ${prim.firstPrimaryInView ?? "-"} | ${(prim.docHeight / prim.viewportHeight).toFixed(1)} |`);
}

L.push("", "## axe violations (all variants)", "", `axe ran on ${metrics.filter((m) => !m.error && m.axePasses).length} of ${metrics.filter((m) => !m.error).length} captures (passed rules per capture: ${Math.min(...metrics.filter((m) => m.axePasses).map((m) => m.axePasses))}–${Math.max(...metrics.filter((m) => m.axePasses).map((m) => m.axePasses))}).`, "", "| Rule | Impact | Screens (variants) | Example |", "|---|---|---|---|");
const rules = new Map<string, { impact: string; help: string; where: Set<string>; sample: string }>();
for (const m of metrics.filter((m) => !m.error)) for (const v of m.axe) {
  const r = rules.get(v.id) ?? { impact: v.impact, help: v.help, where: new Set(), sample: v.sample[0] };
  r.where.add(`${m.name}@${m.vp}/${m.scheme}`);
  rules.set(v.id, r);
}
for (const [id, r] of rules) {
  const screens = [...new Set([...r.where].map((w) => w.split("@")[0]))];
  L.push(`| ${id}: ${r.help} | ${r.impact} | ${screens.length} (${r.where.size}): ${screens.slice(0, 8).join(", ")}${screens.length > 8 ? "…" : ""} | \`${r.sample}\` |`);
}

L.push("", "## Lighthouse mobile", "", "| Page | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT | Failing audits |", "|---|---|---|---|---|---|---|---|---|");
for (const r of lh) L.push(r.error ? `| ${r.name} | error: ${r.error} |||||||| ` : `| ${r.name} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} | ${r.failing.map((f: any) => f.id).join(", ")} |`);

L.push("", "## Personas", "");
for (const p of personas) {
  if (p.error) { L.push(`### ${p.id}: ERROR ${p.error}`, ""); continue; }
  L.push(`### ${p.id}: ${p.who}`, "", `Taps ${p.total.taps}, keystrokes ${p.total.keys}, screens ${p.total.screens}. Plan: ${p.plan.reached ? `${p.plan.words} words, ${p.plan.sections} sections, ${p.plan.pageHeightScreens} phone screens tall with every section open (${p.plan.collapsedWords} words visible before opening any), PDF ${p.plan.pdfPages} pages; ${p.plan.wholePlan ?? `This week ${p.plan.stageCount}`}; step counts on screen: ${p.plan.stepCounts ?? "?"}` : `NOT REACHED: ${p.plan.error}`}`);
  if (p.plan.overBudget) L.push(`Over budget: ${p.plan.overBudget}`);
  if (p.plan.firstSteps) L.push("First 3 steps:", ...p.plan.firstSteps.map((s: string, i: number) => `${i + 1}. ${s}`));
  L.push("", "| Screen | Taps | Scrolled to answer | Main button visible | Errors |", "|---|---|---|---|---|");
  for (const s of p.screens) L.push(`| ${s.screen} | ${s.taps}${s.keys ? ` + ${s.keys} keys` : ""} | ${s.scrolledToAnswer ? `yes (y=${s.lowestTapY})` : "no"} | ${s.mainButtonVisibleWithoutScroll} | ${s.errors.join("; ")} |`);
  L.push("");
}

if (copy) {
  L.push("## Copy", "", "| Text | Words | Grade | Sentences > 25 words |", "|---|---|---|---|");
  for (const s of copy.perScreen) L.push(`| ${s.name} | ${s.words} | ${s.grade ?? "-"} | ${s.longSentences.length} |`);
  L.push("", "### Long sentences", "");
  const seen = new Set<string>();
  for (const s of copy.perScreen) for (const l of s.longSentences) if (!seen.has(l.text)) { seen.add(l.text); L.push(`- (${s.name}, ${l.words} words) ${l.text}`); }
  for (const k of ["promise", "alarm", "family"] as const) {
    L.push("", `### Lines to check: ${k}`, "");
    const seenK = new Set<string>();
    for (const s of copy.perScreen) for (const l of s[k]) if (!seenK.has(l)) { seenK.add(l); L.push(`- (${s.name}) ${l.slice(0, 220)}`); }
  }
  L.push("", "### Term variants", "");
  for (const [g, v] of Object.entries(copy.terms as Record<string, Record<string, Record<string, number>>>)) {
    const used = Object.entries(v).map(([re, where]) => `\`${re}\` in ${Object.keys(where).length} texts`);
    if (used.length > 1) L.push(`- **${g}**: ${used.join("; ")}`);
  }
}

fs.writeFileSync(`${OUT}/summary.md`, L.join("\n"));
console.log(`wrote ${OUT}/summary.md`);
