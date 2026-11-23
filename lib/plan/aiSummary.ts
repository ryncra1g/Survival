import type { Answers } from "@/lib/answers/schema";
import { BRAND } from "@/lib/brand";
import { lookupZip } from "@/lib/zip/profile";
import type { Block, PlanDocument } from "./document";

/**
 * D12b: "Copy for your AI assistant". A plain-text summary to paste into ChatGPT, Claude or Gemini.
 *
 * Built from an allow-list only: household counts, region (never the ZIP), scenario length, the key amounts
 * from the plan's overview, the maintenance schedule and the first steps. Health answers, consent records and
 * addresses are never read. Any line that mentions a health topic is dropped as a second guard.
 * Ground rules are word for word from the owner's brief (docs/FACTCHECK.md).
 */
export const AI_GROUND_RULES = [
  "Use these amounts exactly; don't recalculate them.",
  "Follow the product label and CDC/EPA guidance for water treatment; never give dosages.",
  "Never suggest grills, generators or heaters indoors or in a garage.",
  "Official evacuation orders override this plan.",
  `This plan's numbers come from ${BRAND.name}; your assistant's advice is its own.`,
];

export const AI_EXPLAINER =
  "Copies a summary of your plan to paste into ChatGPT, Claude or Gemini, so it can set reminders and answer questions. Health details and addresses aren't included.";
export const AI_COPIED = "Copied. Paste it into your AI assistant to get started.";

/** Health topics never leave the plan in this summary. */
export const HEALTH_WORDS = /\b(cpap|bipap|oxygen|nebuli[sz]er|medic(al|ation|ine)s?|prescri\w*|pharmac\w*|insulin|dialysis|mobility|wheelchair|powered device|health|diagnos\w*|dose|dosing|dosage)\b/i;

const DAYS: Record<number, string> = { 3: "72 hours", 14: "2 weeks", 30: "30 days", 90: "90 days" };

/** Drop clauses about health (e.g. "medication lists") but keep the rest of a schedule line. */
function withoutHealth(task: string): string {
  const parts = task.replace(/\.$/, "").split(/;\s*/);
  const keep = parts.map((p) => (HEALTH_WORDS.test(p) ? p.split(/,\s*(?:and\s+)?|\s+and\s+/).filter((x) => !HEALTH_WORDS.test(x)).join(", ") : p)).filter(Boolean);
  return keep.length ? keep.join("; ") + "." : "";
}

type Checklist = Extract<Block, { type: "checklist" }>;
type Table = Extract<Block, { type: "table" }>;

export function aiSummary(doc: PlanDocument, a: Answers): string {
  const region = lookupZip(a.zip).region;
  const kids = a.childrenAges.length;
  const pets = a.pets.reduce((t, p) => t + p.count, 0);
  const who = [`${a.adults} adult${a.adults === 1 ? "" : "s"}`, ...(kids ? [`${kids} child${kids === 1 ? "" : "ren"}`] : []), ...(pets ? [`${pets} pet${pets === 1 ? "" : "s"}`] : [])].join(", ");

  const amounts = (doc.overview?.stats ?? []).map((s) => `- ${s.label}: ${s.value} (${s.math})`);
  const maint = doc.sections.find((s) => s.id === "maintenance")?.blocks.find((b): b is Table => b.type === "table")?.rows.map((r) => [r[0], withoutHealth(r[1])]).filter((r) => r[1]).map((r) => `- ${r[0]}: ${r[1]}`) ?? [];
  const firstSteps = (doc.sections.find((s) => s.id === "priorities")?.blocks.find((b): b is Checklist => b.type === "checklist")?.items ?? [])
    .map((i) => i.text)
    .filter((t) => !HEALTH_WORDS.test(t))
    .slice(0, 3)
    .map((t, i) => `${i + 1}. ${t}`);

  const lines = [
    `My household emergency plan (from ${BRAND.name})`,
    "",
    "Household",
    `- ${who}`,
    `- Region: ${region}`,
    `- Planning for: ${DAYS[a.scenarioDays] ?? `${a.scenarioDays} days`} without normal services`,
    "",
    "Key amounts",
    ...amounts,
    "",
    "Maintenance schedule",
    ...maint,
    "",
    "My first steps",
    ...firstSteps,
    "",
    "Ground rules for you, the assistant",
    ...AI_GROUND_RULES.map((r) => `- ${r}`),
    "",
    "What I'd like help with",
    "- Set reminders for the dates in the maintenance schedule.",
    "- Help me with my first 3 steps.",
  ];
  return lines.filter((l) => !HEALTH_WORDS.test(l) || AI_GROUND_RULES.some((r) => l.includes(r))).join("\n");
}
