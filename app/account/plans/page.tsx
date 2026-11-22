import type { Metadata } from "next";
import Link from "next/link";
import type { PlanDocument } from "@/lib/plan/document";
import { accountPageUser } from "@/lib/server/accountPage";
import { store } from "@/lib/server/store";

/** Read ACCOUNTS_ENABLED and the session per request (never prerendered at build time). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My plans", robots: { index: false } };

/** D2 (accounts track): a confirmed account keeps every plan, permanently, on any device. */
export default async function MyPlans() {
  const user = await accountPageUser();
  const plans = await store.listPlans(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">My plans</h1>
      <p className="text-muted">Saved to your account: open them on any device after signing in.</p>
      {plans.length === 0 ? (
        <p className="card p-4">No plans yet. <Link href="/start" className="underline">Build one</Link>.</p>
      ) : (
        <ul className="card divide-y divide-line" data-testid="my-plans">
          {plans.map((p) => (
            <li key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
              <span>
                <Link href={`/plan/${p.id}`} className="font-semibold underline">{(p.plan as PlanDocument).subtitle}</Link>
                <span className="block text-sm text-muted">{p.created_at.slice(0, 10)}</span>
              </span>
              <Link href={`/plan/${p.id}/inventory`} className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center">Inventory</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
