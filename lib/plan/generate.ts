import type Anthropic from "@anthropic-ai/sdk";
import { AnswersSchema, type Answers } from "@/lib/answers/schema";
import type { CatalogItem } from "@/lib/catalog/types";
import { computePlan, type ComputedPlan } from "@/lib/rules/engine";
import type { RuleConstants } from "@/lib/rules/constants";
import { lintDocument } from "@/lib/safety/linter";
import { writeSummaries } from "@/lib/llm/writer";
import { assembleDocument, buildDraft } from "./build";
import type { PlanDocument } from "./document";
import type { OnStage } from "./stages";
import { lookupZip } from "@/lib/zip/profile";

export interface GeneratedPlan {
  computed: ComputedPlan;
  document: PlanDocument;
  llm: { attempts: number; rejected: { id: string; reason: string }[] };
}

/**
 * Full pipeline: validate answers → rules → draft → (LLM summaries) → assemble → lint.
 * If the final document fails the linter for any reason, the template version is used;
 * if even that fails, we throw (this is a bug and must never ship).
 */
export async function generatePlan(
  rawAnswers: unknown,
  constants: RuleConstants,
  catalog: CatalogItem[],
  opts: { now?: Date; useLlm?: boolean; client?: Anthropic; onStage?: OnStage } = {},
): Promise<GeneratedPlan> {
  const answers: Answers = AnswersSchema.parse(rawAnswers);
  lookupZip(answers.zip);
  await opts.onStage?.("hazards");
  const computed = computePlan(answers, constants, catalog, opts.now);
  await opts.onStage?.("quantities");
  const draft = buildDraft(computed, constants);
  const templateSummaries = Object.fromEntries(draft.sections.map((s) => [s.id, s.summaryTemplate]));

  let summaries = templateSummaries;
  let writer: "template" | "llm" = "template";
  let llm: GeneratedPlan["llm"] = { attempts: 0, rejected: [] };
  if (opts.useLlm !== false) {
    const r = await writeSummaries(computed, draft, { client: opts.client });
    summaries = r.summaries;
    writer = r.writer;
    llm = { attempts: r.attempts, rejected: r.rejected };
  }

  let document = assembleDocument(computed, draft, summaries, writer);
  if (lintDocument(document).length) {
    console.error("[safety] LLM document failed lint; using templates", lintDocument(document).slice(0, 3));
    document = assembleDocument(computed, draft, templateSummaries, "template");
  }
  const violations = lintDocument(document);
  if (violations.length) throw new Error(`Safety lint failed on template output: ${JSON.stringify(violations.slice(0, 3))}`);
  return { computed, document, llm };
}
