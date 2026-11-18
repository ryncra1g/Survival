import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanView } from "@/components/PlanView";
import { PrintButton } from "@/components/PrintButton";
import { DemoLinkBanner } from "@/components/DemoLinkBanner";
import { FirstSteps } from "@/components/PlanView";
import type { PlanDocument } from "@/lib/plan/document";
import { loadPlanFor } from "@/lib/server/access";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

export const metadata: Metadata = { title: "Your plan", robots: { index: false } };

export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ emailed?: string }> }) {
  const { id } = await params;
  const { emailed } = await searchParams;
  const session = await getSession();
  const plan = await loadPlanFor(session, id);
  if (!plan) notFound();
  const user = await store.getUser(plan.user_id);
  const doc = plan.plan as PlanDocument;
  const confirmed = !!user?.double_opt_in_at;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-bold">{doc.title}</h1>
      <p className="mt-1 text-muted">{doc.subtitle}</p>

      <div className="mt-4 no-print" role="status">
        {emailed || plan.emailed_at ? (
          <p className="card p-3 border-ok">✓ A copy with a printable PDF is on its way to your inbox.</p>
        ) : confirmed ? (
          <p className="card p-3">Your copy will be emailed shortly.</p>
        ) : (
          <p className="card p-3 border-warn">
            <strong>One more step:</strong> check your inbox for our confirmation email. Tap the link and we&apos;ll email this plan with a printable PDF — and you can come back to edit it any time.
          </p>
        )}
        {!confirmed && <DemoLinkBanner />}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 no-print">
        <a href={`/api/plans/${plan.id}/pdf`} className="btn">Download PDF</a>
        <PrintButton />
        {session?.scope === "full" && <Link href="/account" className="btn-ghost">Edit answers</Link>}
      </div>

      <FirstSteps doc={doc} />
      <p className="mt-4 text-sm text-muted border border-line rounded p-3">{doc.disclaimer}</p>
      <PlanView doc={doc} planId={plan.id} />
    </div>
  );
}
