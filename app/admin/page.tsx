import type { Metadata } from "next";
import Link from "next/link";
import { loadConstants } from "@/lib/server/config";
import { store } from "@/lib/server/store";
import { AffiliateForm } from "./affiliate-form";
import { adminOrNotFound } from "./guard";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  await adminOrNotFound();
  const [s, { constants }, catalog] = await Promise.all([store.stats(), loadConstants(), store.listCatalog()]);
  const nameOf = (id: string) => catalog.find((i) => i.id === id)?.name ?? id;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const tiles: [string, string | number, string?][] = [
    ["Signups", s.signups],
    ["Confirmed (double opt-in)", s.confirmed, pct(s.confirmed, s.signups)],
    ["Questionnaires started", s.questionnairesStarted],
    ["Completion rate", pct(s.questionnairesCompleted, s.questionnairesStarted), `${s.questionnairesCompleted} completed`],
    ["Plans generated", s.plansGenerated],
    ["Email capture", pct(s.plansWithEmail, s.plansGenerated), `${s.plansWithEmail} plans with an email`],
    ["Buy clicks", s.affiliateClicks, `${s.plansGenerated ? (s.affiliateClicks / s.plansGenerated).toFixed(2) : "0"} per plan`],
    ["Copy for AI", s.aiCopies, `${s.plansGenerated ? (s.aiCopies / s.plansGenerated).toFixed(2) : "0"} per plan`],
    ["Emails sent", s.emailsSent],
    ["Email opens", s.emailOpens, pct(s.emailOpens, s.emailsSent) + " open rate"],
    ["Unsubscribed", s.unsubscribed],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="card p-4" data-testid={`stat-${label}`}>
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold mt-1" data-testid="stat-value">{value}</p>
            {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>
      {s.topClicks.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold">Most-clicked gear</h2>
          <ol className="mt-2 text-sm space-y-1 list-decimal pl-5">
            {s.topClicks.map((t) => <li key={t.itemId}>{nameOf(t.itemId)} — {t.clicks}</li>)}
          </ol>
        </section>
      )}
      <AffiliateForm initial={constants.affiliate.amazonTag} />
      <div className="flex gap-3">
        <Link href="/admin/catalog" className="btn">Gear catalog</Link>
        <Link href="/admin/rules" className="btn-ghost">Rule constants</Link>
      </div>
      <p className="text-sm text-muted">Opens come from the Resend webhook and undercount (image blocking, Apple Mail Privacy Protection inflates them). Treat as directional.</p>
    </div>
  );
}
