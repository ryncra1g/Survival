import type { Metadata } from "next";
import { Subtitle } from "@/components/Subtitle";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoLinkBanner } from "@/components/DemoLinkBanner";
import { ChangeAnswer } from "@/components/ChangeAnswer";
import { EmailMyPlan } from "@/components/EmailMyPlan";
import { PlanView } from "@/components/PlanView";
import { PrintButton } from "@/components/PrintButton";
import { ResendConfirm } from "@/components/ResendConfirm";
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
  const user = plan.user_id ? await store.getUser(plan.user_id) : null;
  const doc = plan.plan as PlanDocument;
  const confirmed = !!user?.double_opt_in_at;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  // Email status: none yet → optional capture; given but unconfirmed → resend; confirmed → sent.
  const emailStatus = !user ? (
    <EmailMyPlan planId={plan.id} siteKey={siteKey} />
  ) : emailed || plan.emailed_at ? (
    <p className="card p-3 border-ok">✓ Your plan, PDF and fridge checklist are on their way to {user.email}.</p>
  ) : confirmed ? (
    <p className="card p-3">Your copy will be emailed to {user.email} shortly.</p>
  ) : (
    <div className="card p-3 border-warn">
      <strong>Check your inbox:</strong> tap the link in our email and we&apos;ll send this plan with a printable PDF and fridge checklist.
      <ResendConfirm email={user.email} />
      <DemoLinkBanner />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-bold">{doc.title}</h1>
      <Subtitle text={doc.subtitle} />
      <p className="mt-1 text-xs text-muted">General guidance, not professional advice. <a href="#about" className="underline">Sources &amp; disclaimers</a></p>

      <div className="mt-3 flex flex-wrap gap-2 no-print">
        <a href={`/api/plans/${plan.id}/pdf`} className="btn text-sm px-4 min-h-[44px]">Download PDF</a>
        <a href={`/api/plans/${plan.id}/checklist`} className="btn-ghost text-sm px-3">Fridge checklist</a>
        <PrintButton />
        {session?.scope === "full" && <Link href="/account" className="btn-ghost">Edit answers</Link>}
      </div>

      <div className="mt-5" id="email">{emailStatus}</div>
      <ChangeAnswer planId={plan.id} />
      <PlanView doc={doc} planId={plan.id} checks={plan.checks ?? {}} sync />
      {!user && (
        <div className="my-6">
          <EmailMyPlan planId={plan.id} siteKey={siteKey} idPrefix="emp2" />
        </div>
      )}
    </div>
  );
}
