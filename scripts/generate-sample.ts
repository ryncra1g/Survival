/**
 * Generates the sample plan for the spec's test household into samples/.
 *   npm run sample            (template writer unless ANTHROPIC_API_KEY is set)
 */
import fs from "node:fs";
import path from "node:path";
import { generatePlan } from "@/lib/plan/generate";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { renderPlanEmail } from "@/lib/email/render";
import { renderPlanPdf } from "@/lib/pdf/PlanPdf";
import { SAMPLE_HOUSEHOLD } from "@/tests/fixtures/households";

const out = path.join(process.cwd(), "samples");
fs.mkdirSync(out, { recursive: true });
const now = new Date("2026-11-18T12:00:00Z");
const r = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, { now });
const meta = {
  appUrl: "https://kinready.example",
  planUrl: "https://kinready.example/plan/sample",
  unsubscribeUrl: "https://kinready.example/api/unsubscribe?u=sample",
  mailingAddress: "Kinready · 123 Example St, Suite 100 · Huntington, NY 11743",
  pdfAttached: true,
};
const email = renderPlanEmail(r.document, meta);
fs.writeFileSync(path.join(out, "sample-answers.json"), JSON.stringify(SAMPLE_HOUSEHOLD, null, 2));
fs.writeFileSync(path.join(out, "sample-computed.json"), JSON.stringify(r.computed, null, 2));
fs.writeFileSync(path.join(out, "sample-plan.json"), JSON.stringify(r.document, null, 2));
fs.writeFileSync(path.join(out, "sample-plan-email.html"), email.html);
fs.writeFileSync(path.join(out, "sample-plan.txt"), email.text);
fs.writeFileSync(path.join(out, "sample-plan.pdf"), await renderPlanPdf(r.document));
console.log(`writer=${r.document.writer} llmAttempts=${r.llm.attempts} rejected=${r.llm.rejected.length}`);
console.log(`email html: ${(Buffer.byteLength(email.html) / 1024).toFixed(1)} KB`);
const { renderFridgeChecklist } = await import("@/lib/pdf/FridgeChecklist");
fs.writeFileSync(path.join(out, "sample-fridge-checklist.pdf"), await renderFridgeChecklist(r.document));
