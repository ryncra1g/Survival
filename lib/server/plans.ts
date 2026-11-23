import type { PlanConsent } from "@/lib/legal";
import type { OnStage } from "@/lib/plan/stages";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { generatePlan } from "@/lib/plan/generate";
import type { PlanDocument } from "@/lib/plan/document";
import { renderPlanEmail } from "@/lib/email/render";
import { renderPlanPdf } from "@/lib/pdf/PlanPdf";
import { renderFridgeChecklist } from "@/lib/pdf/FridgeChecklist";
import { loadConstants } from "./config";
import { env, isDemo } from "./env";
import { metaFor, sendEmail } from "./mailer";
import { store, type PlanRow, type UserRow } from "./store";
import { BRAND } from "@/lib/brand";

export async function buildAndSavePlan(userId: string | null, questionnaireId: string, answers: unknown, consent: PlanConsent | null, onStage?: OnStage): Promise<PlanRow> {
  const [{ constants, version }, catalog] = await Promise.all([loadConstants(), store.listCatalog()]);
  const r = await generatePlan(answers, constants, catalog, { onStage });
  const plan = await store.createPlan({
    questionnaire_id: questionnaireId,
    user_id: userId,
    computed_quantities: { ...r.computed, constantsVersion: version },
    plan: r.document,
    pdf_url: null,
    emailed_at: null,
    writer: r.document.writer,
    consent,
  });
  await store.updateQuestionnaire(questionnaireId, { complete: true });
  await onStage?.("steps");
  return plan;
}

async function storePdf(planId: string, userId: string, pdf: Buffer): Promise<string | null> {
  if (isDemo) return null;
  const path = `${userId}/${planId}.pdf`;
  const sb = createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
  const r = await sb.storage.from("plans").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (r.error) {
    console.error("[pdf] upload failed", r.error.message);
    return null;
  }
  return path;
}

/** Email the plan (HTML + PDF). Only to confirmed (double opt-in) addresses. */
export async function emailPlan(plan: PlanRow, user: UserRow): Promise<boolean> {
  if (!user.double_opt_in_at || plan.emailed_at) return false;
  const doc = plan.plan as PlanDocument;
  const pdf = await renderPlanPdf(doc);
  const pdfPath = await storePdf(plan.id, user.id, pdf);
  const m = renderPlanEmail(doc, { ...metaFor(user.id), planUrl: `${env.appUrl}/plan/${plan.id}`, pdfAttached: true, planId: plan.id });
  const ok = await sendEmail({ to: user.email, userId: user.id, type: "plan", ...m, attachments: [
      { filename: `${BRAND.file}.pdf`, content: pdf },
      { filename: `${BRAND.file}-fridge-checklist.pdf`, content: await renderFridgeChecklist(doc) },
    ],
  });
  if (ok) await store.updatePlan(plan.id, { emailed_at: new Date().toISOString(), ...(pdfPath ? { pdf_url: pdfPath } : {}) });
  return ok;
}
