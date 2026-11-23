import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlacesForm } from "@/components/PlacesForm";
import { isId } from "@/lib/ids";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Backup destination", robots: { index: false } };

/** D4 (launch): a printable backup-destination page. The address is typed and printed here, never saved or sent. */
export default async function Places({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) notFound();
  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
      <p className="no-print text-sm"><Link href={`/plan/${plan.id}#evacuation`} className="underline">Back to your plan</Link></p>
      <h1 className="no-print text-2xl font-bold">Your backup destination</h1>
      <p className="no-print text-muted">Write down where you'd go if you had to leave, then print one copy for each go-bag.</p>
      <PlacesForm />
    </div>
  );
}
