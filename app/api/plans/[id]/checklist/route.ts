import type { PlanDocument } from "@/lib/plan/document";
import { renderFridgeChecklist } from "@/lib/pdf/FridgeChecklist";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return new Response("Not found", { status: 404 });
  const pdf = await renderFridgeChecklist(plan.plan as PlanDocument);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="ReadyPlan-fridge-checklist.pdf"', "Cache-Control": "private, no-store" },
  });
}
