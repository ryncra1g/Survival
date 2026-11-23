import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { maintenanceItems } from "@/lib/plan/maintenance";
import type { ComputedPlan } from "@/lib/rules/engine";
import { isId } from "@/lib/ids";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Maintenance list", robots: { index: false } };

/** D12: a printable maintenance list (no account needed). Same schedule as the plan and the calendar file. */
export default async function Maintenance({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) notFound();
  const items = maintenanceItems(plan.computed_quantities as ComputedPlan);
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="no-print text-sm"><Link href={`/plan/${plan.id}#maintenance`} className="underline">Back to your plan</Link></p>
      <h1 className="mt-2 text-2xl font-bold">Maintenance list</h1>
      <p className="text-muted">Keep your supplies ready. Tick each one as you do it.</p>
      <table className="mt-4 w-full text-left" data-testid="maintenance-list">
        <thead><tr className="border-b border-line"><th className="py-2 pr-3">When</th><th className="py-2">Task</th><th className="py-2 pl-3">Done</th></tr></thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-b border-line align-top">
              <td className="py-2 pr-3 whitespace-nowrap font-semibold">{m.when}</td>
              <td className="py-2">{m.task}</td>
              <td className="py-2 pl-3">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <PrintButton />
        <a href={`/api/plans/${plan.id}/calendar`} className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center">Add to my calendar</a>
      </div>
    </div>
  );
}
