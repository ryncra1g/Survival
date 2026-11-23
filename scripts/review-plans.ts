/**
 * Review packet: render five households' plans as Markdown, following the web plan page's structure
 * (dashboard numbers, then the four chapters → section cards → blocks, with Good to know / To do / To have labels).
 * Flags OFF (plus a DIY_TIPS_ENABLED=true copy of household 2). Template writer only (no LLM).
 * Buy IDs are filtered exactly as the web does (components/StepExtras.tsx productIndex / resolveStep / HelpStrip):
 * only items that are buyable products in this plan get a Buy, so nothing the household already has is sold.
 * Run: NEXT_PUBLIC_BRAND_NAME=ReadyReport npx tsx scripts/review-plans.ts
 */
import fs from "node:fs";
import path from "node:path";
import { AnswersSchema, DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { generatePlan } from "@/lib/plan/generate";
import { groupIntoChapters } from "@/lib/plan/chapters";
import { KIND_LABEL, kindLabelsAt } from "@/lib/plan/kinds";
import { LEVEL_LABEL, budgetStatus, compareOptions } from "@/lib/plan/compare";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { aiSummary } from "@/lib/plan/aiSummary";
import { maintenanceItems } from "@/lib/plan/maintenance";
import { buildIcs } from "@/lib/calendar/ics";
import { BRAND } from "@/lib/brand";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
import { usd } from "@/lib/plan/format";
import { productIndex, resolveStep } from "@/components/StepExtras";

const OUT = "docs/review/plans";
const NOW = new Date("2026-11-22T12:00:00Z");
const a = (over: Partial<Answers>): Answers => AnswersSchema.parse({ ...DEFAULT_ANSWERS, ...over });

const HOUSEHOLDS: { file: string; title: string; answers: Answers; tips?: boolean; extras?: boolean }[] = [
  { file: "1-sample-household", title: "1. Sample household", answers: SAMPLE_HOUSEHOLD, extras: true },
  {
    file: "2-apartment-no-car",
    title: "2. One adult, apartment, no car, all-electric, no storage",
    answers: a({ zip: "10025", adults: 1, childrenAges: [], pets: [], homeType: "apartment", floors: 1, hasBasement: false, hasGarage: false, hasYard: false, hasShed: false, heatSources: ["electric"], cooking: "electric", backupPower: "none", vehicleFuels: [], storage: ["none"], approach: "stay_home", evacuation: { destination: "not_sure" }, scenarioDays: 14, budget: "under_500" }),
  },
  {
    file: "3-gulf-infant-medical",
    title: "3. Two adults, infant on formula, powered medical device, Gulf Coast",
    answers: a({ zip: "70112", adults: 2, childrenAges: [0], toddlerNeeds: ["formula", "diapers"], poweredDevices: ["cpap"], homeType: "house", hasBasement: true, hasGarage: false, hasYard: true, storage: ["basement", "closets"], scenarioDays: 14, budget: "500_1500" }),
  },
  {
    file: "4-rural-west-wildfire",
    title: "4. Two adults, raw land 150 miles away, rural West wildfire, wood heat, generator",
    answers: a({ zip: "59801", adults: 2, childrenAges: [], heatSources: ["wood"], backupPower: "portable_generator", vehicleFuels: ["gas"], hasGarage: true, hasYard: true, hasShed: true, storage: ["garage", "shed"], approach: "another_property", evacuation: { destination: "raw_land", distanceMiles: 150 }, scenarioDays: 90, budget: "5000_plus" }),
  },
  {
    file: "5-elderly-winter",
    title: "5. Elderly adult with mobility needs, stay home, winter storm, 72 hours",
    answers: a({ zip: "55901", adults: 1, childrenAges: [], pets: [], elderlyOrMobility: true, approach: "stay_home", evacuation: { destination: "not_sure" }, storage: ["closets"], hasGarage: false, scenarioDays: 3, budget: "under_500" }),
  },
];

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

type Products = ReturnType<typeof productIndex>;
const href = (id: string) => `/go/${id}`;

function block(b: Block, doc: PlanDocument, diyTips: boolean, products: Products): string[] {
  switch (b.type) {
    case "paragraph": return [b.text, ""];
    case "subheading": return [`#### ${b.text}`, ""];
    case "bullets": return [...b.items.map((i) => `- ${i}`), ""];
    case "checklist":
      return [
        ...b.items.map((it) => resolveStep(it, products, href)).flatMap((i) => [
          `- [ ] ${i.text}${i.buy ? ` [Buy: ${i.buy.name}, ${i.buy.price}]` : ""}${i.link ? ` ([${i.link.label}](${i.link.url}))` : ""}${i.see ? ` (see ${i.see.label})` : ""}`,
          ...(i.why ? [`  - _Why:_ ${i.why}`] : []),
        ]),
        "",
      ];
    case "help": {
      // Same filter as HelpStrip: only this plan's own buyable products, at most 6.
      const items = b.buy.map((id) => products.get(id)).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 6);
      if (!items.length && !b.links.length) return [];
      return [
        "**What you need**",
        "",
        ...items.map((i) => `- ${i.name} · ${i.price} · [Buy]`),
        ...(b.note ? [`_${b.note}_`] : []),
        ...b.links.map((l) => `- [${l.label}](${l.url})`),
        "",
      ];
    }
    case "table":
      return [
        ...(b.caption ? [`**${b.caption}**${b.detail ? " _(detail: web and PDF only, not in the email)_" : ""}`, ""] : []),
        `| ${b.columns.map(esc).join(" | ")} |`,
        `| ${b.columns.map(() => "---").join(" | ")} |`,
        ...b.rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
        "",
      ];
    case "ifthen": return [...b.rows.map((r) => `- **If** ${r.if} → ${r.then}`), ""];
    case "callout": return [`> **${b.tone.toUpperCase()}: ${b.title}**`, `> ${b.text}`, ""];
    case "tips":
      if (!diyTips) return [];
      return [
        "**No time to buy? Use what you have.**",
        "",
        ...b.tips.flatMap((t) => [`- **${t.situation}**`, ...t.steps.map((s) => `  - ${s}`), `  - Source: [${t.source.label}](${t.source.url})`]),
        "",
        "**Don't do this:**",
        ...b.dontDo.map((d) => `- ${d}`),
        "",
      ];
    case "levelchoice": {
      const c = compareOptions(b.levels, doc.overview?.budget);
      return [
        `**${b.caption}** (Compare options)`,
        "",
        ...b.levels.map((l) => `- ${l.selected ? "**✓ " : ""}${LEVEL_LABEL[l.level]}: ${l.name}, ${l.price}${l.selected ? "** (current)" : ""}`),
        ...c.alternatives.map((r) => `  - ${LEVEL_LABEL[r.level]}: ${r.diff}, new total ${r.newTotal}${r.over ? `, ${r.over}` : ""}`),
        "",
      ];
    }
    case "products":
      return [
        ...(b.caption ? [`**${b.caption}**${b.compact ? " _(compact shopping list)_" : ""}`, ""] : []),
        ...b.items.flatMap((it) => {
          const lines = [`- **${it.name}** (${it.category}) · qty ${it.qty} · ${it.price}${it.later ? " · later" : ""}${it.buyable ? " · [Buy]" : ""}`];
          if (!b.compact) {
            lines.push(`  - Spec: ${it.spec}`);
            if (it.models.length) lines.push(`  - Example models: ${it.models.join("; ")}`);
          }
          if (it.levels?.length && !b.compact) {
            const c = compareOptions(it.levels, doc.overview?.budget);
            const rows = [...c.lower.map((r) => ["Lower-cost", r] as const), ...c.upgrade.map((r) => ["Upgrade", r] as const), ...c.alternatives.map((r) => ["Other", r] as const)];
            lines.push(`  - Compare options: current ${c.current ? `${LEVEL_LABEL[c.current.level]} (${c.current.name}, ${c.current.price})` : "—"}`);
            for (const [k, r] of rows) lines.push(`    - ${k}: ${LEVEL_LABEL[r.level]}, ${r.name}, ${r.price} · ${r.diff} · new total ${r.newTotal}${r.over ? ` · ${r.over}` : ""}`);
          }
          return lines;
        }),
        "",
      ];
  }
}

function render(doc: PlanDocument, diyTips: boolean, title: string, answers: Answers): string {
  const L: string[] = [];
  L.push(`# ${title}`, "", `_Rendered for review on ${NOW.toISOString().slice(0, 10)} from the rules engine and template writer (no LLM). Flags: ACCOUNTS_ENABLED=off, DIY_TIPS_ENABLED=${diyTips ? "on" : "off"}. Brand shown: "${BRAND.name}" (set in the shell for local runs only)._`, "");
  L.push("<details><summary>Answers used</summary>", "", "```json", JSON.stringify(answers, null, 2), "```", "", "</details>", "");
  L.push(`## ${doc.title}`, "", doc.subtitle, "", "_General guidance, not professional advice._", "");
  if (doc.overview) {
    L.push("### Overview (dashboard)", "", "| Key number | Value | Math |", "| --- | --- | --- |");
    for (const s of doc.overview.stats) L.push(`| ${esc(s.label)} | ${esc(s.value)} | ${esc(s.math)} |`);
    L.push("");
    if (doc.overview.budget) {
      const b = doc.overview.budget;
      L.push(`**Budget:** ${b.label} · plan gear total ${usd(b.totalLow)}–${usd(b.totalHigh)}${budgetStatus(b) ? ` · ${budgetStatus(b)}` : ""}`, "");
    }
    L.push("**Shopping list (by phase)**", "", "| Phase | Item | Qty | Line total | Later |", "| --- | --- | --- | --- | --- |");
    for (const g of doc.overview.gear) L.push(`| ${g.phase} | ${esc(g.name)} | ${g.qty} | ${usd(g.low)}–${usd(g.high)} | ${g.later ? "yes" : ""} |`);
    L.push("");
  }
  const products = productIndex(doc);
  for (const ch of groupIntoChapters(doc.sections)) {
    L.push(`## Chapter: ${ch.title}`, "");
    L.push("| Card | Key |", "| --- | --- |", ...ch.items.map((s) => `| ${esc(s.title)} | ${s.key ? `${esc(s.key.value)} ${esc(s.key.label)}` : esc(s.summary)} |`), "");
    for (const s of ch.items) {
      L.push(`### ${s.number}. ${s.title}`, "", `_${s.summary}_`, "");
      const labels = kindLabelsAt(s.blocks);
      s.blocks.forEach((b, i) => {
        const body = block(b, doc, diyTips, products);
        if (!body.length) return;
        if (labels[i]) L.push(`**[${KIND_LABEL[labels[i]!]}]**`, "");
        if (b.type === "products" && doc.affiliateDisclosure && s.blocks.findIndex((x) => x.type === "products") === i) L.push(`_${doc.affiliateDisclosure}_`, "");
        L.push(...body);
      });
    }
  }
  L.push("## Sources & safety", "", "The web plan links to /sources for the full list.", "", ...doc.sources.map((s) => `- [${s.name}](${s.url})`), "", `_${doc.disclaimer}_`, "");
  return L.join("\n");
}

fs.mkdirSync(OUT, { recursive: true });
for (const h of HOUSEHOLDS) {
  const { document, computed } = await generatePlan(h.answers, DEFAULT_CONSTANTS, SEED_CATALOG, { now: NOW, useLlm: false });
  fs.writeFileSync(path.join(OUT, `${h.file}.md`), render(document, false, h.title, h.answers));
  if (h.file.startsWith("2-")) fs.writeFileSync(path.join(OUT, `${h.file}-tips.md`), render(document, true, h.title + " (DIY tips on)", h.answers));
  if (h.extras) {
    fs.writeFileSync(path.join(OUT, `${h.file}-copy-for-ai.md`), `# Copy for your AI assistant: sample household\n\n_Exact text the button copies (lib/plan/aiSummary.ts)._\n\n\`\`\`text\n${aiSummary(document, h.answers)}\n\`\`\`\n`);
    const ics = buildIcs(maintenanceItems(computed), { from: NOW, uidPrefix: `review-sample@${BRAND.slug}`, calName: `${BRAND.name} maintenance` });
    fs.writeFileSync(path.join(OUT, `${h.file}-calendar.ics`), ics);
  }
  console.log("wrote", h.file);
}
