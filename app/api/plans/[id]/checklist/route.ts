import type { PlanDocument } from "@/lib/plan/document";
import { renderFridgeChecklist } from "@/lib/pdf/FridgeChecklist";
import { isId } from "@/lib/ids";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";
import { BRAND } from "@/lib/brand";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) return new Response("Not found", { status: 404 });
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return new Response("Not found", { status: 404 });
  const pdf = await renderFridgeChecklist(plan.plan as PlanDocument);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${BRAND.file}-fridge-checklist.pdf"`, "Cache-Control": "private, no-store" },
  });
}
