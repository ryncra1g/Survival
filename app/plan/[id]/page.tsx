import type { Metadata } from "next";
import { Subtitle } from "@/components/Subtitle";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoLinkBanner } from "@/components/DemoLinkBanner";
import { ChangeAnswer } from "@/components/ChangeAnswer";
import { SaveBar } from "@/components/SaveBar";
import { ShareMenu } from "@/components/ShareMenu";
import { CopyForAI } from "@/components/CopyForAI";
import { aiSummary } from "@/lib/plan/aiSummary";
import type { ComputedPlan } from "@/lib/rules/engine";
import { flags } from "@/lib/flags";
import { PlanView } from "@/components/PlanView";
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
  const aiText = aiSummary(doc, (plan.computed_quantities as ComputedPlan).answers);

  // Email status: none yet → optional capture; given but unconfirmed → resend; confirmed → sent.
  const emailStatus = !user ? (
    <SaveBar planId={plan.id} siteKey={siteKey} accounts={flags().accounts} />
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
      <p className="mt-1 text-xs text-muted">General guidance, not professional advice. <a href="/sources" className="underline">Sources &amp; safety</a></p>
      <div className="mt-3 flex flex-wrap gap-2 no-print">
        <ShareMenu planId={plan.id} email={!user} extra={<><a href={`/api/plans/${plan.id}/calendar`} className="flex w-full min-h-11 items-center rounded-md px-3 text-sm hover:bg-line/40">Add to my calendar</a><CopyForAI variant="menu" planId={plan.id} text={aiText} /></>} />
        {session?.scope === "full" && <Link href="/account" className="btn-ghost border border-line text-sm px-3 min-h-[44px]">Edit answers</Link>}
      </div>

      {/* Dashboard first (what to do next); then ways to keep the plan; then the plan itself. */}
      <PlanView
        doc={doc}
        planId={plan.id}
        checks={plan.checks ?? {}}
        sync
        diyTips={flags().diyTips}
        afterDashboard={
          <div className="no-print">
            <div className="mt-5">{emailStatus}</div>
            {/* D12 / D12b: stay ready without an account. */}
            <section className="mt-4 card p-4" aria-labelledby="stay-h" data-testid="stay-ready">
              <h2 id="stay-h" className="font-bold">Stay ready</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`/api/plans/${plan.id}/calendar`} className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center">Add to my calendar</a>
                <a href={`/plan/${plan.id}/maintenance`} className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center">Printable maintenance list</a>
              </div>
              <div className="mt-3">
                <CopyForAI planId={plan.id} text={aiText} />
              </div>
            </section>
            <ChangeAnswer planId={plan.id} />
          </div>
        }
      />
    </div>
  );
}
