import { Notice } from "@/components/Notice";
import { shortDate } from "@/lib/plan/format";
import Link from "next/link";
import { DeleteData, EditAnswersButton, FollowupToggle, LoginForm, SignOut } from "@/components/AccountActions";
import type { PlanDocument } from "@/lib/plan/document";
import { getSession, isAdmin } from "@/lib/server/session";
import { store } from "@/lib/server/store";

export async function AccountActions({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getSession();
  const user = session ? await store.getUser(session.uid) : null;

  if (!session || !user || session.scope !== "full") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold">Open your plan</h1>
        {searchParams.link === "expired" && <Notice tone="info">That link has expired or was already used. Request a new one below.</Notice>}
        {session?.scope === "draft" && <p className="card p-3">Check your inbox for the confirmation link we sent — it signs you in and emails your plan.</p>}
        <p className="text-muted">Enter your email and we&apos;ll send a one-time sign-in link. No passwords.</p>
        <LoginForm />
        <p className="text-sm text-muted">New here? <Link href="/start" className="underline">Build a plan</Link>.</p>
      </div>
    );
  }

  const plans = await store.listPlans(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My plan</h1>
        <p className="text-muted">{user.email}</p>
        {searchParams.confirmed && <Notice tone="success" className="mt-3">Email confirmed.</Notice>}
      </div>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Plans</h2>
        {plans.length === 0 ? (
          <p className="text-muted">No plan yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {plans.map((p) => (
              <li key={p.id} className="py-2 flex justify-between gap-3">
                <Link href={`/plan/${p.id}`} className="tap underline">{(p.plan as PlanDocument).subtitle}</Link>
                <span className="text-sm text-muted shrink-0">{shortDate(p.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
        <EditAnswersButton />
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Email preferences</h2>
        <FollowupToggle initial={user.followups_opt_in && !user.unsubscribed_at} />
      </section>

      <section id="data" className="card p-5 space-y-3 scroll-mt-20">
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="text-sm text-muted">Download everything we store about you, or delete it permanently.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/account/export" className="btn-ghost">Export my data (JSON)</a>
          <DeleteData />
        </div>
      </section>

      <div className="flex gap-3">
        <SignOut />
        {isAdmin(user.email) && <Link href="/admin" className="btn-ghost">Admin</Link>}
      </div>
    </div>
  );
}
