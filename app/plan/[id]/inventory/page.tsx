import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InventoryEditor } from "@/components/InventoryEditor";
import { seedInventory } from "@/lib/accountData";
import { saveBarText } from "@/lib/copy";
import { flags } from "@/lib/flags";
import type { PlanDocument } from "@/lib/plan/document";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Household & inventory", robots: { index: false } };

/** D2 (accounts track): the household's inventory for this plan. Same access as the plan. */
export default async function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  if (!flags().accounts) notFound();
  const session = await getSession();
  const plan = await loadPlanFor(session, (await params).id);
  if (!plan) notFound();
  const doc = plan.plan as PlanDocument;
  const items = (doc.overview?.gear ?? []).map((g) => ({ itemId: g.itemId, name: g.name, qty: g.qty }));
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-3">
      <p className="text-sm"><Link href={`/plan/${plan.id}`} className="underline">Back to your plan</Link></p>
      <h1 className="text-2xl font-bold">Household &amp; inventory</h1>
      <p className="text-muted">Mark what you have, what you need, what you&apos;ve bought and what&apos;s running low. Items you have or bought come off your shopping list.</p>
      {session?.scope !== "full" && <p className="card p-3 text-sm">{saveBarText(true)} <Link href={`/plan/${plan.id}#email`} className="underline">Confirm your email</Link></p>}
      <InventoryEditor planId={plan.id} items={items} initial={seedInventory(plan.inventory, plan.checks)} accounts={flags().accounts} />
    </div>
  );
}
