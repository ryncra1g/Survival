import type { PlanDocument } from "@/lib/plan/document";
import { flags } from "@/lib/flags";
import { renderPlanPdf } from "@/lib/pdf/PlanPdf";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";
import { BRAND } from "@/lib/brand";

export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return new Response("Not found", { status: 404 });
  const pdf = await renderPlanPdf(plan.plan as PlanDocument, { diyTips: flags().diyTips });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${BRAND.file}-${plan.created_at.slice(0, 10)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
