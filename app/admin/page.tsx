import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/lib/server/store";
import { adminOrNotFound } from "./guard";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  await adminOrNotFound();
  const s = await store.stats();
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const tiles: [string, string | number, string?][] = [
    ["Signups", s.signups],
    ["Confirmed (double opt-in)", s.confirmed, pct(s.confirmed, s.signups)],
    ["Questionnaires started", s.questionnairesStarted],
    ["Completion rate", pct(s.questionnairesCompleted, s.questionnairesStarted), `${s.questionnairesCompleted} completed`],
    ["Plans generated", s.plansGenerated],
    ["Emails sent", s.emailsSent],
    ["Email opens", s.emailOpens, pct(s.emailOpens, s.emailsSent) + " open rate"],
    ["Unsubscribed", s.unsubscribed],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Link href="/admin/catalog" className="btn">Gear catalog</Link>
        <Link href="/admin/rules" className="btn-ghost">Rule constants</Link>
      </div>
      <p className="text-sm text-muted">Opens come from the Resend webhook and undercount (image blocking, Apple Mail Privacy Protection inflates them). Treat as directional.</p>
    </div>
  );
}
