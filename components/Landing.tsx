import type { ReactNode } from "react";
import { sampleSummary } from "@/lib/plan/sampleSummary";

/** Front page, shared by the app and the standalone demo. */
export function Landing({ cta, footer, sampleLink }: { cta: ReactNode; footer?: ReactNode; sampleLink?: ReactNode }) {
  const sample = sampleSummary();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      <p className="text-sm font-semibold tracking-wide text-brand">Free · No sign-up · About 5 minutes</p>
      <h1 className="mt-2 text-[1.85rem] sm:text-5xl font-bold leading-tight text-balance">Know exactly what to do when the power goes out.</h1>
      <p className="mt-3 sm:text-lg text-muted max-w-2xl">A plan built for your household, whether it&apos;s just you or a full house, in a house or an apartment. How much water, food and fuel to keep, what to buy first, and what to do when a storm hits.</p>
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        {cta}
        <span className="text-sm text-muted text-center sm:text-left">Every amount is worked out for your household, with the math shown.</span>
      </div>

      <section aria-labelledby="preview-h" className="card mt-8 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id="preview-h" className="font-semibold text-brand">Sample plan preview</h2>
          <p className="text-xs text-muted">{sample.household}</p>
        </div>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 tabular">
          {sample.stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-brand-soft p-3">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="text-2xl font-bold text-ink">{s.value}</dd>
              <dd className="text-xs text-muted">{s.math}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm font-semibold">Start here: the first 3 steps</p>
        <ol className="mt-1 list-decimal pl-5 space-y-1 text-sm">
          {sample.steps.map((t) => <li key={t}>{t}</li>)}
        </ol>
        {sampleLink && <p className="mt-3 text-sm">{sampleLink}</p>}
      </section>

      <section aria-labelledby="how-h" className="mt-10">
        <h2 id="how-h" className="text-xl font-bold">How it works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Answer about 10 quick questions", "Your ZIP, who lives with you, your home, heat, water and budget. No sign-up."],
            ["Get your plan right away", "Exact amounts, a week-by-week checklist and steps for your area's hazards."],
            ["Buy only what you're missing", "A shopping list in priority order that skips what you already have and fits your budget, basic or premium."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-4">
              <p className="text-sm font-semibold text-brand">Step {i + 1}</p>
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="whats-h" className="mt-10">
        <h2 id="whats-h" className="text-xl font-bold">What&apos;s in your plan</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {[
            "Water, food and fuel amounts for your household",
            "A priority list: this week, this month, 60 and 90 days",
            "Steps for your ZIP code's hazards",
            "Heat and power plans, with generator and CO safety",
            "Backup power for medical devices, and plans for kids and pets",
            "A shopping list that fits your budget",
            "A printable PDF and a one-page fridge checklist",
          ].map((t) => (
            <li key={t} className="flex gap-3"><span aria-hidden className="text-brand font-bold">✓</span><span>{t}</span></li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted">
        Based on guidance from Ready.gov, FEMA, the CDC, the American Red Cross and the EPA. It&apos;s free: we may earn a small commission if you buy through our links,
        at no extra cost to you. Recommendations come from the specs and your budget, not from commissions. {footer}
      </p>
    </div>
  );
}
