import type { Metadata } from "next";
import { Subtitle } from "@/components/Subtitle";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoLinkBanner } from "@/components/DemoLinkBanner";
import { ChangeAnswer } from "@/components/ChangeAnswer";
import { SaveBar } from "@/components/SaveBar";
import { ShareMenu } from "@/components/ShareMenu";
import { CompareOptions } from "@/components/CompareOptions";
import { owned, seedInventory } from "@/lib/accountData";
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

  // Accounts track (ACCOUNTS_ENABLED): the inventory feeds the shopping list, links "To have" items and tips.
  const accounts = flags().accounts;
  const inventory = accounts ? seedInventory(plan.inventory, plan.checks) : null;
  const ownedIds = inventory ? Object.keys(inventory).filter((id) => owned(inventory, id)) : [];
  const checks = { ...(plan.checks ?? {}), ...Object.fromEntries(ownedIds.map((id) => [`got-${id}`, true])) };
  const ownedNames = accounts ? (doc.overview?.gear ?? []).filter((g) => ownedIds.includes(g.itemId)).map((g) => g.name) : undefined;
  const foodLevels = doc.sections.find((s) => s.id === "food")?.blocks.find((b) => b.type === "levelchoice");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {accounts && (
        <nav aria-label="Your plan" className="no-print mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1" data-testid="plan-tabs">
          <a href={`/plan/${plan.id}`} aria-current="page" className="rounded-lg bg-brand px-2 py-2 text-center text-sm font-semibold text-brand-ink">Overview</a>
          <a href={`/plan/${plan.id}/inventory`} className="rounded-lg px-2 py-2 text-center text-sm font-semibold">Inventory</a>
          <a href={`/plan/${plan.id}#ch-do-now`} className="rounded-lg px-2 py-2 text-center text-sm font-semibold">Report</a>
        </nav>
      )}
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
        checks={checks}
        sync
        diyTips={flags().diyTips}
        inventoryBase={accounts ? `/plan/${plan.id}/inventory` : undefined}
        ownedNames={ownedNames}
        afterDashboard={
          <div className="no-print">
            <div className="mt-5">{emailStatus}</div>
            {/* D7 (accounts track): switch or mix food from the Overview; the calorie total stays the same. */}
            {accounts && foodLevels && foodLevels.type === "levelchoice" && (
              <section className="mt-4 card p-4" data-testid="food-mix-card">
                <h2 className="font-bold">Your food</h2>
                <CompareOptions planId={plan.id} group="food" levels={foodLevels.levels} back="food" budget={doc.overview?.budget} />
              </section>
            )}
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
