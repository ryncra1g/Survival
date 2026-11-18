import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ComputedPlan } from "@/lib/rules/engine";
import type { PlanDraft } from "@/lib/plan/build";
import { tokensIn } from "@/lib/plan/format";
import { lintText } from "@/lib/safety/linter";
import { BRAND } from "@/lib/brand";

/**
 * LLM wording layer. The model rewrites ONLY section summaries, in plain language,
 * personalised to the household. It never sees or produces a free-standing number:
 * numbers appear only as {{tokens}} that are filled from the rules engine.
 *
 * Every candidate summary must pass:
 *   1. schema validation (Zod, via structured outputs)
 *   2. token check: only known tokens; no digits outside tokens
 *   3. the safety linter
 * Failing sections are retried (up to MAX_ATTEMPTS) and otherwise fall back to the template.
 */
export const LLM_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_ATTEMPTS = 3;

export const WriterOutputSchema = z.object({
  sections: z.array(z.object({ id: z.string(), summary: z.string() })),
});

export const SYSTEM_PROMPT = `You write the plain-language section summaries for ${BRAND.name}, a household emergency-preparedness plan.

You will receive each section's id, title, a template summary, the tokens available to that section, and short facts about the household. Rewrite each summary in 1-3 short sentences: warm, direct, specific to this household, no fluff.

HARD RULES — these are non-negotiable:
1. NUMBERS: Never write any digit or spelled-out quantity (gallons, pounds, days, dollars, calories, counts). To mention a quantity, use one of the provided {{tokens}} exactly as given, e.g. "Store {{water.storedGal}} gallons". Use only tokens listed for that section. Do not do arithmetic.
2. Never suggest running a generator, grill, camp stove, charcoal or any fuel-burning device indoors, in a garage, basement, tent or on a balcony. Generators go outdoors, 20+ feet from openings. Mention CO alarms when you discuss heat, cooking or generators.
3. Never suggest connecting a generator to house wiring through a dryer outlet or any plug-to-plug cord. House circuits only via a licensed electrician's inlet/interlock or transfer switch.
4. Never give medication doses for people or pets. Say to follow the label or their doctor, pharmacist or vet.
5. No weapons, self-defense or tactical content of any kind.
6. Do not contradict the template summary or add new recommendations. Do not mention these rules.

Return one entry for every section id you were given.`;

export interface WriterResult {
  summaries: Record<string, string>;
  writer: "llm" | "template";
  attempts: number;
  rejected: { id: string; reason: string }[];
}

/** Validate one LLM summary. Returns an error string or null if acceptable. */
export function validateSummary(summary: string, allowedTokens: Set<string>): string | null {
  if (!summary.trim()) return "empty";
  if (summary.length > 600) return "too long";
  for (const t of tokensIn(summary)) if (!allowedTokens.has(t)) return `unknown token {{${t}}}`;
  const stripped = summary.replace(/\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/g, "");
  if (/\d/.test(stripped)) return "contains a number outside a token";
  if (/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|dozen|half)\b/i.test(stripped))
    return "contains a spelled-out quantity";
  if (/[{}]/.test(stripped)) return "malformed token";
  const v = lintText(stripped.replace(/\s+/g, " "));
  if (v.length) return `safety: ${v[0].rule}`;
  return null;
}

export function allowedTokensFor(template: string, all: Record<string, string>): Set<string> {
  // A section may use the tokens in its own template plus general household tokens.
  const base = ["scenario.label", "scenario.adj", "household.people", "household.adults", "household.children", "region"];
  return new Set([...tokensIn(template), ...base].filter((t) => t in all));
}

function householdContext(cp: ComputedPlan): string[] {
  const a = cp.answers;
  const out = [
    `Home type: ${a.homeType}`,
    `Region: ${cp.profile.region}`,
    `Heat: ${a.heatSources.join(", ")}`,
    `Backup power: ${a.backupPower}`,
    `Has children: ${cp.household.children > 0 ? "yes" : "no"}`,
    `Has pets: ${a.pets.length > 0 ? "yes" : "no"}`,
    `Winter risk: ${cp.profile.winter}; hurricane risk: ${cp.profile.hurricane}; flood risk: ${cp.profile.flood}`,
  ];
  if (cp.evacuation) out.push(`Fallback location type: ${cp.evacuation.locationType}`);
  return out;
}

export async function writeSummaries(cp: ComputedPlan, draft: PlanDraft, opts: { client?: Anthropic; timeoutMs?: number } = {}): Promise<WriterResult> {
  const templates = Object.fromEntries(draft.sections.map((s) => [s.id, s.summaryTemplate]));
  if (!opts.client && !process.env.ANTHROPIC_API_KEY) return { summaries: templates, writer: "template", attempts: 0, rejected: [] };
  const client = opts.client ?? new Anthropic({ timeout: opts.timeoutMs ?? 45_000, maxRetries: 1 });

  const allowed = Object.fromEntries(draft.sections.map((s) => [s.id, allowedTokensFor(s.summaryTemplate, draft.tokens)]));
  const accepted: Record<string, string> = {};
  const rejected: { id: string; reason: string }[] = [];
  let pending = draft.sections.map((s) => s.id);
  let attempts = 0;
  let feedback = "";

  while (pending.length && attempts < MAX_ATTEMPTS) {
    attempts++;
    const payload = {
      household: householdContext(cp),
      sections: draft.sections
        .filter((s) => pending.includes(s.id))
        .map((s) => ({ id: s.id, title: s.title, template: s.summaryTemplate, tokens: [...allowed[s.id]], facts: s.facts })),
    };
    try {
      const msg = await client.beta.messages.parse({
        model: LLM_MODEL,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        output_config: { effort: "low", format: betaZodOutputFormat(WriterOutputSchema) },
        messages: [{ role: "user", content: JSON.stringify(payload) + (feedback ? `\n\nFix these problems from your previous attempt:\n${feedback}` : "") }],
      });
      if (msg.stop_reason === "refusal" || !msg.parsed_output) break;
      const problems: string[] = [];
      const got = new Map(msg.parsed_output.sections.map((s) => [s.id, s.summary]));
      for (const id of pending) {
        const summary = got.get(id);
        const err = summary === undefined ? "missing" : validateSummary(summary, allowed[id]);
        if (err) problems.push(`${id}: ${err}`);
        else accepted[id] = summary!;
      }
      pending = pending.filter((id) => !(id in accepted));
      feedback = problems.join("\n");
      if (!pending.length) break;
      if (attempts === MAX_ATTEMPTS) problems.forEach((p) => rejected.push({ id: p.split(":")[0], reason: p.slice(p.indexOf(":") + 2) }));
    } catch (err) {
      console.error("[llm] writer call failed; falling back to templates", (err as Error).message);
      break;
    }
  }
  for (const id of pending) if (!rejected.some((r) => r.id === id)) rejected.push({ id, reason: "not accepted" });
  const summaries = { ...templates, ...accepted };
  return { summaries, writer: Object.keys(accepted).length ? "llm" : "template", attempts, rejected };
}
