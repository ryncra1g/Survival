import { BRAND } from "@/lib/brand";
import { buildIcs } from "@/lib/calendar/ics";
import { maintenanceItems } from "@/lib/plan/maintenance";
import type { ComputedPlan } from "@/lib/rules/engine";
import { loadPlanFor } from "@/lib/server/access";
import { err } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

/** D12: "Add to my calendar". A .ics file with the plan's maintenance schedule; no account needed. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return err("Not found", 404);
  const ics = buildIcs(maintenanceItems(plan.computed_quantities as ComputedPlan), { from: new Date(), uidPrefix: `${plan.id}@${BRAND.slug}`, calName: `${BRAND.name} maintenance` });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${BRAND.file}-maintenance.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
